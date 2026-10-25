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
    console.error('Please ensure the service account JSON file is in the project root');
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

async function standardizeDesignations() {
  console.log('Starting designation standardization...');
  console.log('Merging "Labour" to "Labourer"\n');

  try {
    const snapshot = await db.collection('employees').get();
    
    let labourCount = 0;
    let labourerCount = 0;
    let updatedCount = 0;
    const updates = [];

    snapshot.forEach(docSnapshot => {
      const employee = docSnapshot.data();
      const designation = employee.designation || '';
      
      if (designation === 'Labour') {
        labourCount++;
        updates.push({
          id: docSnapshot.id,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          oldDesignation: 'Labour',
          newDesignation: 'Labourer'
        });
      } else if (designation === 'Labourer') {
        labourerCount++;
      }
    });

    console.log(`Found ${labourCount} employees with designation "Labour"`);
    console.log(`Found ${labourerCount} employees with designation "Labourer"\n`);

    if (labourCount === 0) {
      console.log('No employees to update. Exiting.');
      return;
    }

    console.log('Employees to be updated:');
    updates.forEach(u => {
      console.log(`  - ${u.fullName} (${u.employeeId}): ${u.oldDesignation} → ${u.newDesignation}`);
    });

    // Confirm before updating
    console.log('\nProceeding with updates...');

    // Update all employees
    for (const update of updates) {
      try {
        await db.collection('employees').doc(update.id).update({
          designation: 'Labourer'
        });
        updatedCount++;
        console.log(`✓ Updated ${update.fullName} (${update.employeeId})`);
      } catch (error) {
        console.error(`✗ Failed to update ${update.fullName} (${update.employeeId}):`, error);
      }
    }

    console.log(`\nCompleted. Updated ${updatedCount} employees.`);
    console.log('All "Labour" designations have been changed to "Labourer"');

  } catch (error) {
    console.error('Error during standardization:', error);
    process.exit(1);
  }
}

standardizeDesignations().then(() => {
  console.log('\nScript completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
