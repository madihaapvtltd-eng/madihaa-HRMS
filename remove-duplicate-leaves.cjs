const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
const serviceAccount = require('./madihaa-hrms-v2-firebase-adminsdk-fbsvc-8c88c15292.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function removeDuplicateLeaves() {
  console.log('Starting duplicate leave removal...');
  
  const leaveRequestsSnapshot = await db.collection('leave_requests').get();
  const allLeaves = leaveRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  console.log(`Total leave requests found: ${allLeaves.length}`);
  
  // Group by employeeId, type, startDate, endDate, and days
  const leaveMap = new Map();
  const duplicates = [];
  
  for (const leave of allLeaves) {
    const key = `${leave.employeeId}_${leave.type}_${leave.startDate.toDate().toISOString()}_${leave.endDate.toDate().toISOString()}_${leave.days}`;
    
    if (leaveMap.has(key)) {
      duplicates.push(leave);
      console.log(`Found duplicate: Employee ${leave.employeeId}, ${leave.type}, ${leave.startDate.toDate().toISOString().split('T')[0]} to ${leave.endDate.toDate().toISOString().split('T')[0]}`);
    } else {
      leaveMap.set(key, leave);
    }
  }
  
  console.log(`\nTotal duplicates found: ${duplicates.length}`);
  
  if (duplicates.length === 0) {
    console.log('No duplicates found. Exiting.');
    process.exit(0);
  }
  
  // Ask for confirmation before deleting
  console.log('\nDo you want to delete these duplicates? (This action cannot be undone)');
  console.log('To proceed, run the script with --confirm flag');
  
  if (process.argv.includes('--confirm')) {
    console.log('\nDeleting duplicates...');
    let deletedCount = 0;
    
    for (const duplicate of duplicates) {
      try {
        await db.collection('leave_requests').doc(duplicate.id).delete();
        console.log(`Deleted: ${duplicate.id}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${duplicate.id}:`, error.message);
      }
    }
    
    console.log(`\nDeleted ${deletedCount} duplicate leave requests`);
  } else {
    console.log('No changes made. Run with --confirm to delete duplicates.');
  }
  
  process.exit(0);
}

removeDuplicateLeaves().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
