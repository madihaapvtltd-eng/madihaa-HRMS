const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Add salary and allowances fields to each record
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  
  // Add salary and allowances fields with empty values
  newItem['Basic Salary'] = '';
  newItem['OT Allowances'] = '';
  newItem['Other Allowances'] = '';
  newItem['Attendance Allowance'] = '';
  newItem['Living Allowance'] = '';
  newItem['Food Allowance'] = '';
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Added salary fields to ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
