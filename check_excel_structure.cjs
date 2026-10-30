const XLSX = require('xlsx');
const workbook = XLSX.readFile('E:/Rettey/madihaa-hrm/past_leaves/Local Staff -  Jan.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Sheet name:', sheetName);
console.log('Total rows:', data.length);
console.log('\nFirst 20 rows:');
data.slice(0, 20).forEach((row, index) => {
  console.log(`Row ${index}:`, row);
});
