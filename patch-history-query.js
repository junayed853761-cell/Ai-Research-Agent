import fs from 'fs';
let content = fs.readFileSync('src/pages/History.tsx', 'utf8');

content = content.replace(
  "setProjects(prev => prev.filter(p => p.id !== id));",
  "queryClient.invalidateQueries({ queryKey: ['research_history'] });"
);

fs.writeFileSync('src/pages/History.tsx', content);

let saved = fs.readFileSync('src/pages/SavedReports.tsx', 'utf8');
if (!saved.includes("import { useEffect }")) {
  saved = "import { useEffect } from 'react';\n" + saved;
  fs.writeFileSync('src/pages/SavedReports.tsx', saved);
}
