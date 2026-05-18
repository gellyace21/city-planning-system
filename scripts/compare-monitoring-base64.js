const fs = require('fs');
const path = require('path');

const tsPath = path.join(__dirname, '..', 'lib', 'monitoringTemplateBase64.ts');
const canonPath = path.join(__dirname, 'projmonit2.b64');

const src = fs.readFileSync(tsPath, 'utf8');
const m = src.match(/MONITORING_TEMPLATE_BASE64\s*=\s*"([\s\S]+?)"\s*;?/);
if (!m) {
  console.error('Failed to extract base64 from', tsPath);
  process.exit(2);
}
const extracted = m[1];
fs.writeFileSync(path.join(__dirname, 'extracted_monitoring.b64'), extracted);
const canonical = fs.readFileSync(canonPath, 'utf8').trim();
console.log('extracted length:', extracted.length);
console.log('canonical length:', canonical.length);
console.log('equal:', extracted.trim() === canonical);
if (extracted.trim() !== canonical) {
  console.log('First 200 chars of extracted:', extracted.slice(0, 200));
  console.log('First 200 chars of canonical:', canonical.slice(0, 200));
}

process.exit(0);
