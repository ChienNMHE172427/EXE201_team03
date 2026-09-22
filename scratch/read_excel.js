const xlsx = require('xlsx');
const fs = require('fs');
const workbook = xlsx.readFile('C:\\Users\\Admin\\Downloads\\Kỳ 8\\EXE201\\testEXE201\\document\\database\\affiliate.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);
fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
