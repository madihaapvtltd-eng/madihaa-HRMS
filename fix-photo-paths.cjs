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

// Fix photo paths by removing 'dist/' prefix
async function fixPhotoPaths() {
  try {
    const employeesSnapshot = await db.collection('employees').get();
    console.log(`Found ${employeesSnapshot.size} employees`);
    
    let fixed = 0;
    let skipped = 0;
    
    const batch = db.batch();
    let batchSize = 0;
    const maxBatchSize = 500;
    
    employeesSnapshot.forEach(doc => {
      const employee = doc.data();
      
      if (employee.photo && employee.photo.includes('dist/')) {
        const newPhotoPath = employee.photo.replace('dist/', '/');
        batch.update(doc.ref, { photo: newPhotoPath });
        batchSize++;
        fixed++;
        console.log(`Fixed: ${employee.employeeId} - ${employee.photo} -> ${newPhotoPath}`);
        
        if (batchSize >= maxBatchSize) {
          batch.commit();
          console.log(`Committed batch of ${batchSize} updates`);
        }
      } else {
        skipped++;
      }
    });
    
    if (batchSize > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchSize} updates`);
    }
    
    console.log(`\nSummary: ${fixed} fixed, ${skipped} skipped`);
  } catch (error) {
    console.error('Error fixing photo paths:', error);
  }
}

fixPhotoPaths().then(() => {
  console.log('Done');
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
