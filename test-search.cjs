const cheerio = require('cheerio');
fetch('https://search.yahoo.com/search?p=Angela+White', {headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}})
.then(r=>r.text())
.then(t=>{
  const $ = cheerio.load(t);
  const res=[];
  $('.algo-sr').each((i,el)=>{
    res.push($(el).find('h3 a').attr('href'));
  });
  console.log(res);
})
