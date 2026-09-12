import fs from 'fs';

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /if\s*\(\s*res\.ok\s*\)\s*\{\s*const data = await res\.json\(\);/g,
    "if (res.ok && res.headers.get('content-type')?.includes('application/json')) { const data = await res.json();"
  );
  fs.writeFileSync(file, content);
}

patchFile('src/pages/History.tsx');
patchFile('src/pages/SavedReports.tsx');
patchFile('src/pages/Dashboard.tsx');
console.log('patched checks');
