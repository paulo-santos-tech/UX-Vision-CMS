const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  // Cores de Background
  { regex: /bg-dark-glass/g, replace: 'bg-surface' },
  { regex: /bg-dark-bg/g, replace: 'bg-base' },
  { regex: /bg-black\/30/g, replace: 'bg-surface-elevated' },
  { regex: /bg-black\/40/g, replace: 'bg-surface-elevated' },
  { regex: /bg-white\/5/g, replace: 'bg-surface-elevated' },
  { regex: /bg-white\/10/g, replace: 'bg-surface-elevated' },
  { regex: /bg-white\/20/g, replace: 'bg-surface-elevated border border-divider/20' }, // Buttons
  { regex: /hover:bg-white\/10/g, replace: 'hover:bg-surface-elevated' },
  { regex: /hover:bg-white\/5/g, replace: 'hover:bg-surface-elevated' },
  
  // Cores de Borda
  { regex: /border-dark-border/g, replace: 'border-divider border' },
  { regex: /border-white\/10/g, replace: 'border-divider border' },
  { regex: /border-white\/20/g, replace: 'border-divider border' },
  { regex: /border-white\/30/g, replace: 'border-divider border' },
  
  // Cores de Texto
  { regex: /text-white\/30/g, replace: 'text-text-muted opacity-60' },
  { regex: /text-white\/40/g, replace: 'text-text-muted opacity-70' },
  { regex: /text-white\/50/g, replace: 'text-text-muted opacity-80' },
  { regex: /text-white\/60/g, replace: 'text-text-muted' },
  { regex: /text-white\/70/g, replace: 'text-text-muted' },
  { regex: /text-white\/80/g, replace: 'text-text-primary opacity-80' },
  { regex: /text-white\/90/g, replace: 'text-text-primary opacity-90' },
  { regex: /text-white(?!\/)/g, replace: 'text-text-primary' }, 

  // Tipografia (Hierarquia)
  { regex: /text-3xl font-bold/g, replace: 'text-display' },
  { regex: /text-2xl font-bold/g, replace: 'text-heading' },
  { regex: /text-xl font-bold/g, replace: 'text-heading text-xl' },
  { regex: /text-\[10px\] uppercase tracking-\[0\.2em\]/g, replace: 'text-overline' },
  { regex: /text-\[10px\] uppercase tracking-wider/g, replace: 'text-overline' },
  { regex: /text-\[11px\] uppercase tracking-wider/g, replace: 'text-overline' },
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk(directoryPath);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  replacements.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});

console.log('Refactor completed.');
