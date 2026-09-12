import * as cheerio from 'cheerio';

async function searchWeb(query: string) {
  const results = [];
  
  // 1. Wikipedia API (Very reliable, open-source, no IP blocks)
  try {
    const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
    const wikiData = await wikiRes.json();
    if (wikiData?.query?.search) {
      results.push(...wikiData.query.search.slice(0, 3).map((r: any) => ({
        title: r.title + ' - Wikipedia',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
        description: r.snippet.replace(/<\/?[^>]+(>|$)/g, "")
      })));
    }
  } catch (e) {
    console.error('[Agent] Wiki search error', e);
  }

  // DuckDuckGo HTML API (No JS required, highly reliable)
  try {
    const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      const $ = cheerio.load(html);
      
      $('.result').each((i, el) => {
        if (i >= 5) return; // Keep top 5 per query
        
        let url = $(el).find('.result__url').attr('href')?.trim();
        if (url && url.includes('uddg=')) {
          try {
            url = decodeURIComponent(url.split('uddg=')[1].split('&')[0]);
          } catch (e) {
            // Keep original if parsing fails
          }
        }
        
        if (url && !url.startsWith('/')) {
          results.push({
            title: $(el).find('.result__title a').text().trim(),
            url: url,
            description: $(el).find('.result__snippet').text().trim()
          });
        }
      });
    } else {
      console.error('[Agent] DDG HTML returned status', ddgRes.status);
    }
  } catch (e) {
    console.error('[Agent] DDG HTML error', e);
  }
  
  return results;
}

searchWeb('Elon Musk').then(console.log).catch(console.error);
