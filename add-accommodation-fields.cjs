const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Add accommodation fields to each record
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  
  // Add accommodation fields with empty values
  newItem['Accommodation ID'] = '';
  newItem['Accommodation Name'] = '';
  newItem['Floor ID'] = '';
  newItem['Floor Name'] = '';
  newItem['Room ID'] = '';
  newItem['Room Number'] = '';
  newItem['Bed ID'] = '';
  newItem['Bed Number'] = '';
  newItem['Bed Position'] = '';
  newItem['Assigned Date'] = '';
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Added accommodation fields to ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
