const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

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
  
  // Clean double border references
  content = content.replace(/border border-divider border/g, 'border border-divider');
  content = content.replace(/border-divider border border/g, 'border border-divider');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});

console.log('Cleanup completed.');
