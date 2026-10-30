const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, collection, getDocs, updateDoc, doc } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load service account
const serviceAccountPath = path.join(__dirname, '..', 'madihaa-hrms-v2-firebase-adminsdk-fbsvc-8c88c15292.json');
let serviceAccount;

try {
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  } else {
    console.error('Service account file not found at:', serviceAccountPath);
    process.exit(1);
  }
} catch (error) {
  console.error('Error loading service account:', error);
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateImportsDepartment() {
  console.log('Updating department for Imports employees...\n');

  try {
    const snapshot = await db.collection('employees').get();
    
    const employeesToUpdate = [
      { employeeId: 'MAD0083', name: 'Rajasekaran Selvaraj', newDepartment: 'Imports' },
      { employeeId: 'MAD0427', name: 'Janakirama', newDepartment: 'Imports' }
    ];
    
    let updatedCount = 0;
    
    for (const target of employeesToUpdate) {
      const employeeDoc = snapshot.docs.find(doc => doc.data().employeeId === target.employeeId);
      
      if (employeeDoc) {
        const currentData = employeeDoc.data();
        console.log(`Found: ${target.name} (${target.employeeId})`);
        console.log(`  Current department: "${currentData.department}"`);
        console.log(`  Updating to: "${target.newDepartment}"`);
        
        await updateDoc(doc(db, 'employees', employeeDoc.id), {
          department: target.newDepartment
        });
        
        updatedCount++;
        console.log(`✓ Updated successfully\n`);
      } else {
        console.log(`✗ Employee not found: ${target.name} (${target.employeeId})\n`);
      }
    }
    
    console.log(`\nCompleted. Updated ${updatedCount} employees.`);
  } catch (error) {
    console.error('Error updating departments:', error);
    process.exit(1);
  }
}

updateImportsDepartment().then(() => {
  console.log('\nScript completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
