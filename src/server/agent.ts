import { routeTask } from './router.js';
import { randomUUID } from 'crypto';
import { ResearchProject, Source, Evidence } from '../types.js';
import * as cheerio from 'cheerio';
import { db, doc, getDoc, updateDoc, setDoc, collection, getDocs, query, where } from './firestore.js';
export const activeControllers = new Map<string, AbortController>();

const searchCache = new Map<string, {results: any[], timestamp: number}>();
const SEARCH_CACHE_TTL = 1000 * 60 * 60 * 24;


async function searchWeb(query: string, signal?: AbortSignal) {
  const results = [];
  
  // 1. Wikipedia API (Highly reliable, no bot blocks)
  try {
    const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`, { signal });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      if (wikiData?.query?.search) {
        results.push(...wikiData.query.search.slice(0, 3).map((r: any) => ({
          title: r.title + ' - Wikipedia',
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
          description: r.snippet.replace(/<\/?[^>]+(>|$)/g, "")
        })));
      }
    }
  } catch (e) {
    console.error('[Agent] Wiki search error', e);
  }

  // 2. DuckDuckGo HTML API
  try {
    const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal
    });
    
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const $ = cheerio.load(html);
      
      $('.result').each((i, el) => {
        if (i >= 5) return;
        
        let url = $(el).find('.result__url').attr('href')?.trim();
        if (url && url.includes('uddg=')) {
          try {
            url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          } catch (e) {}
        }
        
        if (url && !url.startsWith('/')) {
          results.push({
            title: $(el).find('.result__title a').text().trim(),
            url: url,
            description: $(el).find('.result__snippet').text().trim()
          });
        }
      });
    }
  } catch (e) {
    console.error('[Agent] DDG HTML error', e);
  }
  
  return results;
}

async function tavilySearch(query: string, signal?: AbortSignal) {
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    console.log('[Agent] Search cache hit for:', query);
    return cached.results;
  }

  if (process.env.TAVILY_API_KEY) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
        },
        body: JSON.stringify({
          query,
          search_depth: 'basic',
          include_answer: false,
          include_images: false,
          include_raw_content: false,
          max_results: 5
        }),
        signal
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.content
        }));
        searchCache.set(query, { results: mapped, timestamp: Date.now() });
        return mapped;
      }
    } catch (e) {
      console.error('[Agent] Tavily search error', e);
    }
  }
  // Fallback to custom searchWeb if no API key or if Tavily fails
  const results = await searchWeb(query, signal);
  searchCache.set(query, { results, timestamp: Date.now() });
  return results;
}


async function isCancelled(projectId: string): Promise<boolean> {
  return activeControllers.get(projectId)?.signal.aborted || false; // fast path
  // old check below:
  const snap = await getDoc(doc(db, 'research_projects', projectId));
  return snap.data()?.status === 'cancelled';
}

export async function runResearchTask(projectId: string, searchQuery: string, depth: string) {
  const controller = new AbortController();
  activeControllers.set(projectId, controller);
  const signal = controller.signal;
  let projectRef = doc(db, 'research_projects', projectId);
  let projectSnap = await getDoc(projectRef);
  if (!projectSnap.exists()) return;
  let projectData = projectSnap.data();

  try {
    // 0. Explicit Verification Step
    await updateDoc(projectRef, { status: 'planning' });
    
    const verificationRes = await routeTask('planner', {
            signal,
      messages: [
        { role: 'system', content: 'Determine if this user query requires external real-time web search or specific facts that might not be in your training data. Reply ONLY with "YES" or "NO".' },
        { role: 'user', content: searchQuery }
      ]
    }, projectData.preferredProvider);
    
    const requiresSearch = verificationRes.response.content.trim().toUpperCase().includes('YES');
    console.log(`[Agent] Requires external knowledge: ${requiresSearch}`);

    let evidenceText = '';

    if (requiresSearch) {
      if (await isCancelled(projectId)) return;
      // 1. Planning
      const planRes = await routeTask('planner', {
            signal,
        messages: [
          { role: 'system', content: 'You are an elite research planner. Generate 3 specific search queries to investigate the given topic. Output ONLY the queries, one per line.' },
          { role: 'user', content: `Topic: ${searchQuery}\nDepth: ${depth}` }
        ]
      }, projectData.preferredProvider);
      const queries = planRes.response.content
        .split('\n')
        .map(q => q.replace(/^[0-9.-]+\s*/, '').trim())
        .filter(q => q.length > 0)
        .slice(0, 3);
        
      if (queries.length === 0) queries.push(searchQuery);
      console.log('[Agent] Generated queries:', queries);

      if (await isCancelled(projectId)) return;
      // 2. Searching & Collecting
      await updateDoc(projectRef, { status: 'searching' });
      
      let sources: Source[] = [];
      
      async function doSearch(searchQueries: string[]) {
        let results: any[] = [];
        for (const q of searchQueries) {
           let retries = 3;
           while (retries > 0) {
             try {
               const searchRes = await tavilySearch(q, signal);
               if (searchRes && searchRes.length > 0) {
                 results.push(...searchRes);
               }
               await new Promise(resolve => setTimeout(resolve, 1500));
               break;
             } catch (e: any) {
               console.error(`[Agent] Search error for query: ${q}. Retries left: ${retries - 1}`, e.message);
               retries--;
               if (retries === 0) break;
               await new Promise(resolve => setTimeout(resolve, 3000));
             }
           }
        }
        
        const uniqueUrls = new Set();
        const extractedSources: Source[] = [];
        for (const res of results) {
           if (!uniqueUrls.has(res.url)) {
              uniqueUrls.add(res.url);
              try {
                const urlObj = new URL(res.url);
                extractedSources.push({
                   id: randomUUID(),
                   projectId,
                   title: res.title,
                   url: res.url,
                   domain: urlObj.hostname,
                   qualityScore: 'Medium',
                   type: 'Article'
                });
              } catch(e) {}
           }
        }
        return extractedSources;
      }
      
      sources = await doSearch(queries);
      
      if (sources.length === 0) {
         console.log('[Agent] Primary search returned zero results. Generating broader queries...');
         const broaderPlanRes = await routeTask('planner', {
            signal,
            messages: [
              { role: 'system', content: 'The previous specific search queries yielded no results. Generate 3 BROADER, more general search queries to investigate the topic. Output ONLY the queries, one per line.' },
              { role: 'user', content: `Topic: ${searchQuery}\nDepth: ${depth}` }
            ]
         }, projectData.preferredProvider);
         
         const broaderQueries = broaderPlanRes.response.content
            .split('\n')
            .map(q => q.replace(/^[0-9.-]+\s*/, '').trim())
            .filter(q => q.length > 0)
            .slice(0, 3);
            
         if (broaderQueries.length === 0) broaderQueries.push(searchQuery.split(' ')[0] || searchQuery);
         console.log('[Agent] Generated broader queries:', broaderQueries);
         
         sources = await doSearch(broaderQueries);
      }
      
      if (sources.length === 0) {
        throw new Error('No substantial data was found for this query on the web. Please refine your query or try another topic.');
      }

      for (const src of sources) {
        await setDoc(doc(db, 'research_sources', src.id), src);
      }

      if (await isCancelled(projectId)) return;
      // 3. Analyzing Evidence
      await updateDoc(projectRef, { status: 'analyzing' });
      
      const sourcesToAnalyze = sources.slice(0, 4);

      for (const source of sourcesToAnalyze) {
        try {
          let textContent = `Summary: ${source.title}`;
          
          try {
            const fetchController = new AbortController();
            const timeoutId = setTimeout(() => fetchController.abort(), 5000);
            if (signal.aborted) throw new Error('AbortError');
            const onGlobalAbort = () => fetchController.abort();
            signal.addEventListener('abort', onGlobalAbort);
            const pageRes = await fetch(source.url, { signal: fetchController.signal }).finally(() => signal.removeEventListener('abort', onGlobalAbort));
            clearTimeout(timeoutId);
            
            const html = await pageRes.text();
            const $ = cheerio.load(html);
            $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();
            const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
            if (bodyText.length > 100) {
               textContent = bodyText.slice(0, 3000);
            }
          } catch (fetchErr) {
            console.warn(`[Agent] Could not fetch real page for ${source.url}, falling back to title.`);
          }
          
          const extractRes = await routeTask('sourceAnalyzer', {
            signal,
            messages: [
              { role: 'system', content: 'Extract 1-3 key factual claims from this text as a valid JSON array. Each element must match exactly this structure: { "claim": "...", "confidence": "high|medium|low" }. Output ONLY the JSON array starting with [ and ending with ].' },
              { role: 'user', content: `Source Title: ${source.title}\nContent:\n${textContent}\n\nExtract facts relevant to: ${searchQuery}` }
            ]
          }, projectData.preferredProvider);
          
          const match = extractRes.response.content.match(/\[([\s\S]*?)\]/);
          if (match) {
             const items = JSON.parse(`[${match[1]}]`);
             for (const item of items) {
               if (!item.claim) continue;
               const evidenceId = randomUUID();
               await setDoc(doc(db, 'research_evidence', evidenceId), {
                 id: evidenceId,
                 projectId,
                 sourceId: source.id,
                 claim: item.claim,
                 supportingText: item.claim,
                 sourceUrl: source.url,
                 sourceTitle: source.title,
                 confidence: item.confidence || 'medium'
               });
             }
          }
        } catch (err: any) {
          console.error(`[Agent] Failed to analyze source ${source.id}:`, err.message);
        }
      }
      
      const evSnap = await getDocs(query(collection(db, 'research_evidence'), where('projectId', '==', projectId)));
      evidenceText = evSnap.docs.map(d => { const data = d.data() as Evidence; return `- [${data.confidence}] ${data.claim} (Source: ${data.sourceTitle})`; }).join('\n');
      
      if (!evidenceText) {
        throw new Error('Search completed but no relevant facts could be confidently extracted. The report cannot be generated.');
      }

      console.log('[Agent] Verifying extracted evidence...');
      console.log('[Agent] Verifying extracted evidence...');
      const verifyRes = await routeTask('factChecker', {
        signal,
        messages: [
          { role: 'system', content: 'You are an expert fact-checker. Review the provided list of extracted claims. Cross-reference them to identify contradictions, filter out dubious/unsupported claims, and return a FINAL, verified list of facts. Output ONLY the verified facts in Markdown bullet points. Do not include any conversational filler.' },
          { role: 'user', content: `Extracted claims:\n${evidenceText}` }
        ]
      }, projectData.preferredProvider);
      
      const verifiedEvidenceText = verifyRes.response.content;
      if (!verifiedEvidenceText || verifiedEvidenceText.trim() === '') {
         throw new Error('Evidence verification failed: No facts passed cross-referencing.');
      }
      evidenceText = verifiedEvidenceText;
    } else {
      evidenceText = 'No external search was required for this query. Use your internal knowledge base.';
    }

    if (await isCancelled(projectId)) return;
    // 4. Synthesis
    await updateDoc(projectRef, { status: 'synthesis' });
    
    const reportRes = await routeTask('reportWriter', {
            signal,
      messages: [
        { role: 'system', content: 'You are an expert analyst. Write a comprehensive research report in Markdown based STRICTLY on the provided evidence. Include these sections: Executive Summary, Key Findings, Opportunities, Risks, and Conclusion. If evidence conflicts, note it. Format nicely with headings and bullet points. DO NOT make up information or use outside knowledge. If the provided evidence is insufficient to generate a report, explicitly state "Insufficient information to generate a report."' },
        { role: 'user', content: `Query: ${searchQuery}\n\nContext/Evidence:\n${evidenceText}` }
      ]
    }, projectData.preferredProvider);

    const reportId = randomUUID();
    await setDoc(doc(db, 'research_reports', reportId), {
      id: reportId,
      projectId,
      title: projectData.type === 'Follow-up' ? searchQuery : searchQuery,
      executiveSummary: reportRes.response.content,
      keyFindings: [],
      body: '',
      createdAt: new Date().toISOString()
    });

    await updateDoc(projectRef, { status: 'completed' });
    console.log('[Agent] Research completed for project:', projectId);

  } catch (error: any) {
    if (error.message === 'AbortError' || error.name === 'AbortError' || signal.aborted) {
      console.log('[Agent] Research cancelled successfully');
      await updateDoc(projectRef, { status: 'cancelled' });
      return;
    }
    console.error('[Agent] Research failed:', error);
    await updateDoc(projectRef, { status: 'error' });
    
    // Create an explicit error report
    const reportId = randomUUID();
    await setDoc(doc(db, 'research_reports', reportId), {
      id: reportId,
      projectId,
      title: searchQuery,
      executiveSummary: `### Research Error\n\n${error.message || 'An unexpected error occurred during research.'}`,
      keyFindings: [],
      body: '',
      createdAt: new Date().toISOString()
    });
  } finally { activeControllers.delete(projectId); }
}