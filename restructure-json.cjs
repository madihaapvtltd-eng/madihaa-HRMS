const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Transform each record
const transformedData = jsonData.map(item => {
  let firstName = '';
  let lastName = '';
  
  if (item.Name) {
    const nameParts = item.Name.trim().split(/\s+/);
    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = '';
    } else {
      firstName = nameParts.slice(0, -1).join(' ');
      lastName = nameParts[nameParts.length - 1];
    }
  }
  
  // Create new object with First Name and Last Name instead of Name
  const newItem = { ...item };
  delete newItem.Name;
  newItem['First Name'] = firstName;
  newItem['Last Name'] = lastName;
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Transformed ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
