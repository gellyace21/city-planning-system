const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function run() {
  const filePath = path.join(__dirname, '..', 'lib', 'monitoringTemplateBase64.ts');
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/const PARTS\s*=\s*\[([\s\S]*?)\]/);
  if (!m) {
    console.error('PARTS not found in', filePath);
    process.exit(2);
  }
  const base64 = eval('[' + m[1] + ']').join('');
  const buffer = Buffer.from(base64, 'base64');

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
    console.log('Loaded workbook, sheets:', workbook.worksheets.map(ws => ws.name));
    const outPath = path.join(__dirname, '..', 'projmonit_out.xlsx');
    await workbook.xlsx.writeFile(outPath);
    console.log('Wrote', outPath);
  } catch (err) {
    console.error('Error loading or writing workbook:', err);
    process.exit(3);
  }
}

run();
