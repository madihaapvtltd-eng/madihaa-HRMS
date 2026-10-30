const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanLeaveApprovals() {
  try {
    console.log('Fetching leave requests...');
    const snapshot = await db.collection('leave_requests').get();
    
    let cleanedCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      
      // Clean approvals array
      if (data.approvals && Array.isArray(data.approvals)) {
        const cleanedApprovals = data.approvals.filter(a => a !== undefined && a !== null);
        
        if (cleanedApprovals.length !== data.approvals.length) {
          data.approvals = cleanedApprovals;
          needsUpdate = true;
        }
      }
      
      // Remove any undefined fields
      const cleanedData = {};
      for (const key in data) {
        if (data[key] !== undefined && data[key] !== null) {
          cleanedData[key] = data[key];
        }
      }
      
      if (needsUpdate || Object.keys(cleanedData).length !== Object.keys(data).length) {
        await db.collection('leave_requests').doc(doc.id).set(cleanedData);
        console.log(`Cleaned document: ${doc.id}`);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned ${cleanedCount} documents`);
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning leave approvals:', error);
    process.exit(1);
  }
}

cleanLeaveApprovals();
