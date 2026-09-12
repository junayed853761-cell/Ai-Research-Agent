const cheerio = require('cheerio');
fetch('https://html.duckduckgo.com/html/?q=Angela+White', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})
.then(r=>r.text())
.then(t=>{
  const $ = cheerio.load(t);
  const res = [];
  $('.result').each((i, el) => {
    res.push({
      title: $(el).find('.result__title a').text().trim(),
      url: $(el).find('.result__url').attr('href')?.trim(),
      description: $(el).find('.result__snippet').text().trim()
    });
  });
  console.log(res);
})
