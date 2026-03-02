const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\erkan\\stok\\import.sql', 'utf16le'); // Read as UTF-16LE as PowerShell redirection often uses it
process.stdout.write(content);
