const fs = require('fs');

let content = fs.readFileSync('frontend-v2/index.html', 'utf-8');

const target = '<link rel="stylesheet" href="./css/index-premium.css?v=20260811-1">';
const insertion = '<link rel="stylesheet" href="./css/index-minimal.css">';

if (!content.includes('index-minimal.css')) {
  content = content.replace(target, target + '\n  ' + insertion);
  fs.writeFileSync('frontend-v2/index.html', content, 'utf-8');
  console.log('index.html updated successfully');
} else {
  console.log('Already updated');
}
