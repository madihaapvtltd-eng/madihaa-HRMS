const fs = require('fs');
const csv = require('csv-parser');

// Read the CSV file
const csvData = [];
fs.createReadStream('Xpat Staff details _ Updated_18-09-2026.csv')
  .pipe(csv())
  .on('data', (row) => {
    csvData.push(row);
  })
  .on('end', () => {
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync('master_employees.json', 'utf8'));
    
    // Create a map of employee ID to CSV data
    const csvMap = {};
    csvData.forEach(row => {
      const empId = row['ID'];
      if (empId && empId !== 'NA') {
        csvMap[empId] = row;
      }
    });
    
    // Update JSON data with CSV data
    const updatedData = jsonData.map(emp => {
      const empId = emp['EMP ID'];
      const csvRow = csvMap[empId];
      
      if (csvRow) {
        return {
          sn: emp.sn,
          'EMP ID': empId,
          'Name': csvRow['Name'] || emp['Name'],
          'Job Level': emp['Job Level'],
          'Location': csvRow['Work Site'] || emp['Location'],
          'D.O.J': csvRow['D.O.J'] || emp['D.O.J'],
          'SALARY': emp['SALARY'],
          'POSITION': csvRow['Occupation'] || emp['POSITION'],
          'COUNTRY': csvRow['Country'] || emp['COUNTRY'],
          'DOB': csvRow['D.O.B'] || emp['DOB'],
          'MOBILE': csvRow['Mobile No'] || emp['MOBILE'],
          'WP NO': csvRow['WP No'] || emp['WP NO'],
          'WP EXP DATE': csvRow['Visa'] || emp['WP EXP DATE'],
          'PP / ID NUMBER': csvRow['PP No.'] || emp['PP / ID NUMBER'],
          'PP / ID EXP DATE': csvRow['PP Expiry Date'] || emp['PP / ID EXP DATE'],
          'MED EXP DATE': csvRow['Medical fee Expiry'] || emp['MED EXP DATE'],
          'INSURANCE NUMBER': csvRow['Insurance Provider'] || emp['INSURANCE NUMBER'],
          'INSURANCE EXP DATE': csvRow['Insurance Expiry Date'] || emp['INSURANCE EXP DATE'],
          'SLOT': csvRow['Quota Slot'] || emp['SLOT'],
          'QTA PAID': csvRow['Paid date'] || emp['QTA PAID'],
          'Work Site': csvRow['Work Site'] || emp['Work Site'],
          'STATUS': csvRow['Status'] || emp['STATUS']
        };
      }
      return emp;
    });
    
    // Write updated JSON
    fs.writeFileSync('master_employees_updated.json', JSON.stringify(updatedData, null, 4));
    console.log('Updated master_employees.json saved as master_employees_updated.json');
  });
