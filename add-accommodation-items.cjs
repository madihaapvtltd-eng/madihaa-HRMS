const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Add accommodation items fields to each record
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  
  // Add bed fields
  newItem['Bed Quantity'] = '';
  newItem['Bed Last Issued Date'] = '';
  
  // Add mattress fields
  newItem['Mattress Quantity'] = '';
  newItem['Mattress Last Issued Date'] = '';
  
  // Add bedsheet fields
  newItem['Bedsheet Quantity'] = '';
  newItem['Bedsheet Last Issued Date'] = '';
  
  // Add pillow fields
  newItem['Pillow Quantity'] = '';
  newItem['Pillow Last Issued Date'] = '';
  
  // Add pillow cover fields
  newItem['Pillow Cover Quantity'] = '';
  newItem['Pillow Cover Last Issued Date'] = '';
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Added accommodation items fields to ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
