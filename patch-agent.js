import fs from 'fs';

let content = fs.readFileSync('src/server/agent.ts', 'utf8');

// 1. Add Search Cache
content = content.replace(
  "export const activeControllers = new Map<string, AbortController>();",
  "export const activeControllers = new Map<string, AbortController>();\nconst searchCache = new Map<string, {results: any[], timestamp: number}>();\nconst SEARCH_CACHE_TTL = 1000 * 60 * 60 * 24;"
);

const oldTavilyStart = `async function tavilySearch(query: string, signal?: AbortSignal) {`;
const newTavilyStart = `async function tavilySearch(query: string, signal?: AbortSignal) {
  const cached = searchCache.get(query);
  if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
    console.log('[Agent] Search cache hit for:', query);
    return cached.results;
  }
`;
content = content.replace(oldTavilyStart, newTavilyStart);

const oldTavilyEnd = `return searchWeb(query, signal);
}`;
const newTavilyEnd = `const results = await searchWeb(query, signal);
  searchCache.set(query, { results, timestamp: Date.now() });
  return results;
}`;
content = content.replace(oldTavilyEnd, newTavilyEnd);

const oldTavilyMiddleReturn = `return data.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.content
        }));`;
const newTavilyMiddleReturn = `const mapped = data.results.map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.content
        }));
        searchCache.set(query, { results: mapped, timestamp: Date.now() });
        return mapped;`;
content = content.replace(oldTavilyMiddleReturn, newTavilyMiddleReturn);


// 2. Add Fact Verification Step
const oldEvidenceCheck = `const evSnap = await getDocs(query(collection(db, 'research_evidence'), where('projectId', '==', projectId)));
      evidenceText = evSnap.docs.map(d => { const data = d.data() as Evidence; return \`- [\${data.confidence}] \${data.claim} (Source: \${data.sourceTitle})\`; }).join('\\n');
      
      if (!evidenceText) {
        throw new Error('Search completed but no relevant facts could be confidently extracted. The report cannot be generated.');
      }`;

const newEvidenceCheck = `const evSnap = await getDocs(query(collection(db, 'research_evidence'), where('projectId', '==', projectId)));
      evidenceText = evSnap.docs.map(d => { const data = d.data() as Evidence; return \`- [\${data.confidence}] \${data.claim} (Source: \${data.sourceTitle})\`; }).join('\\n');
      
      if (!evidenceText) {
        throw new Error('Search completed but no relevant facts could be confidently extracted. The report cannot be generated.');
      }

      console.log('[Agent] Verifying extracted evidence...');
      const verifyRes = await routeTask('factChecker', {
        signal,
        messages: [
          { role: 'system', content: 'You are an expert fact-checker. Review the provided list of extracted claims. Cross-reference them to identify contradictions, filter out dubious/unsupported claims, and return a FINAL, verified list of facts. Output ONLY the verified facts in Markdown bullet points. Do not include any conversational filler.' },
          { role: 'user', content: \`Extracted claims:\\n\${evidenceText}\` }
        ]
      }, projectData.preferredProvider);
      
      const verifiedEvidenceText = verifyRes.response.content;
      if (!verifiedEvidenceText || verifiedEvidenceText.trim() === '') {
         throw new Error('Evidence verification failed: No facts passed cross-referencing.');
      }
      evidenceText = verifiedEvidenceText;`;

content = content.replace(oldEvidenceCheck, newEvidenceCheck);


// 3. Update Report Writer Prompt
const oldReportPrompt = `{ role: 'system', content: 'You are an expert analyst. Write a comprehensive research report in Markdown based on the provided evidence or your internal knowledge if explicitly allowed. Include these sections: Executive Summary, Key Findings, Opportunities, Risks, and Conclusion. If evidence conflicts, note it. Format nicely with headings and bullet points. Never make up information.' }`;
const newReportPrompt = `{ role: 'system', content: 'You are an expert analyst. Write a comprehensive research report in Markdown based STRICTLY on the provided evidence. Include these sections: Executive Summary, Key Findings, Opportunities, Risks, and Conclusion. If evidence conflicts, note it. Format nicely with headings and bullet points. DO NOT make up information or use outside knowledge. If the provided evidence is insufficient to generate a report, explicitly state "Insufficient information to generate a report."' }`;

content = content.replace(oldReportPrompt, newReportPrompt);


fs.writeFileSync('src/server/agent.ts', content);
console.log('patched agent');
