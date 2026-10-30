const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
const serviceAccount = {
  type: process.env.FIREBASE_TYPE || 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID || 'madihaa-hrms-v2',
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
  token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Try to load from file if environment variables are not set
let credentials = serviceAccount;
if (!serviceAccount.private_key) {
  try {
    credentials = require('./madihaa-hrms-v2-firebase-adminsdk-fbsvc-8c88c15292.json');
  } catch (e) {
    console.error('Firebase admin credentials not found. Please set environment variables or provide the service account JSON file.');
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(credentials)
});

const db = admin.firestore();

// Parse date in various formats
const parseDate = (dateStr) => {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return null;
  
  // Try DD/MM/YY format (e.g., "24/06/02")
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const parsed = new Date(`${fullYear}-${month}-${day}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try DD-MMM-YYYY format (e.g., "1-Jan-1972")
  const dateMatch = dateStr.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (dateMatch) {
    const [, day, monthStr, year] = dateMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months.indexOf(monthStr) + 1;
    const parsed = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try DD-MMM-YYYY format (e.g., "28-May-2026")
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  
  return null;
};

// Normalize name to title case
const normalizeName = (name) => {
  if (!name || name === '') return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Parse equipment item
const parseEquipmentItem = (size, quantity, lastIssuedDate) => {
  if (!size && !quantity) return null;
  return {
    size: size || null,
    quantity: quantity || null,
    lastIssuedDate: parseDate(lastIssuedDate) || null
  };
};

// Parse accommodation items
const parseAccommodationItems = (bedQty, bedDate, mattressQty, mattressDate, bedsheetQty, bedsheetDate, pillowQty, pillowDate, pillowCoverQty, pillowCoverDate) => {
  const items = {};
  if (bedQty || bedDate) {
    items.bed = { quantity: bedQty || null, lastIssuedDate: parseDate(bedDate) || null };
  }
  if (mattressQty || mattressDate) {
    items.mattress = { quantity: mattressQty || null, lastIssuedDate: parseDate(mattressDate) || null };
  }
  if (bedsheetQty || bedsheetDate) {
    items.bedsheet = { quantity: bedsheetQty || null, lastIssuedDate: parseDate(bedsheetDate) || null };
  }
  if (pillowQty || pillowDate) {
    items.pillow = { quantity: pillowQty || null, lastIssuedDate: parseDate(pillowDate) || null };
  }
  if (pillowCoverQty || pillowCoverDate) {
    items.pillowCover = { quantity: pillowCoverQty || null, lastIssuedDate: parseDate(pillowCoverDate) || null };
  }
  return Object.keys(items).length > 0 ? items : undefined;
};

// Import updated-staff-list.json to Firebase
async function importUpdatedStaffList() {
  const fs = require('fs');
  const jsonData = JSON.parse(fs.readFileSync('./updated-staff-list.json', 'utf8'));
  
  console.log(`Found ${jsonData.length} employees to import`);
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  const batch = db.batch();
  const batchSize = 500;
  let currentBatch = 0;
  
  for (const emp of jsonData) {
    try {
      const employeeId = emp.ID || emp['ID'];
      if (!employeeId) {
        console.log('Skipping employee with no ID');
        skipped++;
        continue;
      }
      
      // Check if employee already exists
      const existingDoc = await db.collection('employees').where('employeeId', '==', employeeId).limit(1).get();
      
      if (!existingDoc.empty) {
        console.log(`Skipping existing employee: ${employeeId}`);
        skipped++;
        continue;
      }
      
      const firstName = normalizeName(emp['First Name'] || '');
      const lastName = normalizeName(emp['Last Name'] || '');
      const fullName = `${firstName} ${lastName}`.trim();
      
      const employeeData = {
        employeeId: employeeId,
        registrationNumber: employeeId,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        email: `${employeeId.toLowerCase()}@madihaa.com`, // Placeholder email
        phone: emp['Mobile No'] || '',
        photo: emp['Photo URL'] || null,
        department: 'General', // Default department
        designation: emp['Occupation'] || 'Labourer',
        status: emp['Status']?.toLowerCase() || 'active',
        joinDate: parseDate(emp['D.O.J']) || new Date(),
        country: emp['Country'] || null,
        dob: parseDate(emp['D.O.B']) || null,
        wpNo: emp['WP No'] || null,
        wpExpDate: parseDate(emp['Work Permit Fee Expiry']) || null,
        ppIdNumber: emp['PP No.'] || null,
        ppIdExpDate: parseDate(emp['PP Expiry Date']) || null,
        visaExpiryDate: parseDate(emp['Visa']) || null,
        medExpDate: parseDate(emp['Medical fee Expiry']) || null,
        insuranceNumber: emp['Insurance Provider'] || null,
        insuranceExpDate: parseDate(emp['Insurance Expiry Date']) || null,
        workSite: emp['Work Site'] || null,
        workLocation: emp['Work Site'] || null,
        jobLevel: null,
        salary: emp['Basic Salary'] || null,
        slot: emp['Quota Slot'] || null,
        qtaPaid: emp['Paid date'] || null,
        sn: null,
        biometricFingerprintUpdated: parseDate(emp['Bio metric finger Updated 0n']) || null,
        emergencyContact: {
          name: 'N/A',
          relationship: 'N/A',
          phone: 'N/A'
        },
        employmentHistory: [],
        education: [],
        medicalInfo: {},
        documents: [],
        assets: [],
        accommodation: (emp['Accommodation ID'] || emp['Accommodation Name']) ? {
          accommodationId: emp['Accommodation ID'] || null,
          accommodationName: emp['Accommodation Name'] || null,
          floorId: emp['Floor ID'] || null,
          floorName: emp['Floor Name'] || null,
          roomId: emp['Room ID'] || null,
          roomNumber: emp['Room Number'] || null,
          bedId: emp['Bed ID'] || null,
          bedNumber: emp['Bed Number'] || null,
          bedPosition: emp['Bed Position'] || null,
          assignedDate: parseDate(emp['Assigned Date']) || null,
          accommodationItems: parseAccommodationItems(
            emp['Bed Quantity'], emp['Bed Last Issued Date'],
            emp['Mattress Quantity'], emp['Mattress Last Issued Date'],
            emp['Bedsheet Quantity'], emp['Bedsheet Last Issued Date'],
            emp['Pillow Quantity'], emp['Pillow Last Issued Date'],
            emp['Pillow Cover Quantity'], emp['Pillow Cover Last Issued Date']
          )
        } : null,
        salaryAllowances: (emp['Basic Salary'] || emp['OT Allowances'] || emp['Other Allowances']) ? {
          basicSalary: emp['Basic Salary'] || null,
          otAllowances: emp['OT Allowances'] || null,
          otherAllowances: emp['Other Allowances'] || null,
          attendanceAllowance: emp['Attendance Allowance'] || null,
          livingAllowance: emp['Living Allowance'] || null,
          foodAllowance: emp['Food Allowance'] || null
        } : null,
        staffEquipment: (emp['Uniform Size'] || emp['Rain Coat Size'] || emp['Keys Quantity'] || emp['Mobile Model']) ? {
          uniform: parseEquipmentItem(emp['Uniform Size'], emp['Uniform Quantity'], emp['Uniform Last Issued Date']),
          rainCoat: parseEquipmentItem(emp['Rain Coat Size'], emp['Rain Coat Quantity'], emp['Rain Coat Last Issued Date']),
          keys: parseEquipmentItem(null, emp['Keys Quantity'], emp['Keys Last Issued Date']),
          mobile: parseEquipmentItem(emp['Mobile Model'], emp['Mobile Quantity'], emp['Mobile Last Issued Date']),
          simCard: parseEquipmentItem(emp['SIM Card Number'], emp['SIM Card Quantity'], emp['SIM Card Last Issued Date']),
          otherItems: []
        } : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = db.collection('employees').doc();
      batch.set(docRef, employeeData);
      currentBatch++;
      
      if (currentBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${currentBatch} employees`);
        batch.reset();
        currentBatch = 0;
      }
      
      success++;
      console.log(`Imported: ${employeeId} - ${fullName}`);
    } catch (error) {
      failed++;
      console.error(`Failed to import ${emp.ID || emp['ID']}:`, error.message);
    }
  }
  
  // Commit remaining batch
  if (currentBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${currentBatch} employees`);
  }
  
  console.log(`\nImport complete: ${success} success, ${failed} failed, ${skipped} skipped`);
}

importUpdatedStaffList().then(() => {
  console.log('Import finished');
  process.exit(0);
}).catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
