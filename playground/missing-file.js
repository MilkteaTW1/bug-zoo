// Bug #2: reads a file that does not exist (ENOENT). Create it or change the path.
const fs = require('node:fs');

const text = fs.readFileSync('settings.json', 'utf8');
console.log('settings loaded:', JSON.parse(text));
