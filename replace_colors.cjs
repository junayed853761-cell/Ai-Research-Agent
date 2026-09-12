const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Backgrounds
  content = content.replace(/bg-\[\#09090B\]/g, 'bg-background');
  content = content.replace(/bg-\[\#111113\]/g, 'bg-card');
  content = content.replace(/bg-\[\#18181B\]/g, 'bg-muted');
  
  // Texts
  content = content.replace(/text-\[\#FAFAFA\]/g, 'text-foreground');
  content = content.replace(/text-\[\#A1A1AA\]/g, 'text-muted-foreground');
  
  // Borders
  content = content.replace(/border-\[\#27272A\]/g, 'border-border');
  content = content.replace(/border-\[\#A1A1AA\]\/30/g, 'border-muted-foreground/30');

  // Hovers
  content = content.replace(/hover:bg-\[\#18181B\]/g, 'hover:bg-muted');
  content = content.replace(/hover:bg-\[\#27272A\]/g, 'hover:bg-accent');
  content = content.replace(/hover:bg-\[\#3F3F46\]/g, 'hover:bg-accent/80');
  
  // Text Hovers
  content = content.replace(/hover:text-\[\#FAFAFA\]/g, 'hover:text-foreground');
  content = content.replace(/group-hover:text-\[\#FAFAFA\]/g, 'group-hover:text-foreground');
  content = content.replace(/group-hover:border-\[\#A1A1AA\]/g, 'group-hover:border-muted-foreground');
  
  // Specific exceptions
  content = content.replace(/bg-\[\#27272A\]/g, 'bg-accent');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

walk('./src');
