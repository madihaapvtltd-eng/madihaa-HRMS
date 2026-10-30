const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Remove static Duration field from each record
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  delete newItem['Duration'];
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Removed Duration field from ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
