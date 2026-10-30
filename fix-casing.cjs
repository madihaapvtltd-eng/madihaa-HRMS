const fs = require('fs');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));

// Helper function to capitalize first letter of each word
const capitalizeWords = (str) => {
  if (!str || str === 'nan' || str === 'N/A') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to capitalize first letter only (for names)
const capitalizeFirst = (str) => {
  if (!str || str === 'nan' || str === 'N/A') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Helper function to normalize status
const normalizeStatus = (status) => {
  if (!status || status === 'nan' || status === 'N/A') return 'active';
  return status.toLowerCase();
};

// Helper function to normalize work site (remove trailing apostrophe)
const normalizeWorkSite = (site) => {
  if (!site || site === 'nan' || site === 'N/A') return '';
  return site.replace(/'$/, '');
};

// Helper function to normalize insurance provider
const normalizeInsurance = (provider) => {
  if (!provider || provider === 'nan' || provider === 'N/A') return '';
  if (provider.toLowerCase().includes('allied')) return 'Allied';
  if (provider.toLowerCase().includes('takaful')) return 'Allied Takaful';
  return capitalizeWords(provider);
};

// Transform each record
const transformedData = jsonData.map(item => {
  const newItem = { ...item };
  
  // Normalize First Name and Last Name
  if (newItem['First Name']) {
    newItem['First Name'] = capitalizeFirst(newItem['First Name']);
  }
  if (newItem['Last Name']) {
    newItem['Last Name'] = capitalizeFirst(newItem['Last Name']);
  }
  
  // Normalize Occupation
  if (newItem.Occupation) {
    newItem.Occupation = capitalizeWords(newItem.Occupation);
  }
  
  // Normalize Country
  if (newItem.Country) {
    newItem.Country = capitalizeWords(newItem.Country);
  }
  
  // Normalize Work Site
  if (newItem['Work Site']) {
    newItem['Work Site'] = normalizeWorkSite(newItem['Work Site']);
  }
  
  // Normalize Status
  if (newItem.Status) {
    newItem.Status = normalizeStatus(newItem.Status);
  }
  
  // Normalize Insurance Provider
  if (newItem['Insurance Provider']) {
    newItem['Insurance Provider'] = normalizeInsurance(newItem['Insurance Provider']);
  }
  
  // Replace 'nan' with empty string for other fields
  Object.keys(newItem).forEach(key => {
    if (newItem[key] === 'nan') {
      newItem[key] = '';
    }
  });
  
  return newItem;
});

// Write the transformed data back
fs.writeFileSync('./updated-staff-list.json', JSON.stringify(transformedData, null, 4), 'utf8');

console.log(`Fixed casing for ${transformedData.length} records`);
console.log('File saved as updated-staff-list.json');
