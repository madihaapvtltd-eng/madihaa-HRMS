const admin = require('firebase-admin');
const serviceAccount = require('./madihaa-hrms-v2-firebase-adminsdk-fbsvc-8c88c15292.json');

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteLeavesExceptJanOct() {
  try {
    console.log('Fetching all leave requests...');
    const snapshot = await db.collection('leave_requests').get();
    
    const allLeaves = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Total leaves found: ${allLeaves.length}`);
    
    // Filter leaves to keep only January and October 2026
    const toDelete = [];
    const toKeep = [];
    
    allLeaves.forEach(leave => {
      const startDate = leave.startDate?.toDate ? leave.startDate.toDate() : new Date(leave.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth(); // 0 = January, 9 = October
      
      if (year === 2026 && (month === 0 || month === 9)) {
        toKeep.push(leave);
      } else {
        toDelete.push(leave);
      }
    });
    
    console.log(`Leaves to keep (Jan/Oct 2026): ${toKeep.length}`);
    console.log(`Leaves to delete: ${toDelete.length}`);
    
    if (toDelete.length === 0) {
      console.log('No leaves to delete.');
      return;
    }
    
    // Confirm before deleting
    console.log('\nWARNING: This will delete ' + toDelete.length + ' leave requests.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete in batches
    console.log('Deleting leaves...');
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const leave of toDelete) {
      try {
        await db.collection('leave_requests').doc(leave.id).delete();
        deletedCount++;
        console.log(`Deleted: ${leave.id} (${leave.employeeId})`);
        
        // Add small delay to avoid rate limiting
        if (deletedCount % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error deleting ${leave.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\nDeletion complete:`);
    console.log(`- Successfully deleted: ${deletedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Kept: ${toKeep.length}`);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteLeavesExceptJanOct().then(() => {
  console.log('Script completed');
  process.exit(0);
});
