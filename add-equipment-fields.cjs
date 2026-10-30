const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Add equipment fields to each record
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  
  // Add uniform fields
  newItem['Uniform Size'] = '';
  newItem['Uniform Quantity'] = '';
  newItem['Uniform Last Issued Date'] = '';
  
  // Add rain coat fields
  newItem['Rain Coat Size'] = '';
  newItem['Rain Coat Quantity'] = '';
  newItem['Rain Coat Last Issued Date'] = '';
  
  // Add keys fields
  newItem['Keys Quantity'] = '';
  newItem['Keys Last Issued Date'] = '';
  
  // Add mobile fields
  newItem['Mobile Model'] = '';
  newItem['Mobile Quantity'] = '';
  newItem['Mobile Last Issued Date'] = '';
  
  // Add SIM card fields
  newItem['SIM Card Number'] = '';
  newItem['SIM Card Quantity'] = '';
  newItem['SIM Card Last Issued Date'] = '';
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Added equipment fields to ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
