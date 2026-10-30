const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Add photo URL field to each record based on ID
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  
  // Add photo URL based on employee ID
  if (item.ID) {
    newItem['Photo URL'] = `dist/employee_images/${item.ID}.jpg`;
  } else {
    newItem['Photo URL'] = '';
  }
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Added photo URLs to ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
