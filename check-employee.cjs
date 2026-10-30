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

// Check if MAD0594 exists in Firebase
async function checkEmployee() {
  try {
    const snapshot = await db.collection('employees').where('employeeId', '==', 'MAD0594').get();
    
    if (snapshot.empty) {
      console.log('Employee MAD0594 NOT found in Firebase');
      console.log('This employee needs to be imported');
    } else {
      console.log('Employee MAD0594 found in Firebase');
      snapshot.forEach(doc => {
        console.log('Document ID:', doc.id);
        console.log('Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
  } catch (error) {
    console.error('Error checking employee:', error);
  }
}

checkEmployee().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Check failed:', error);
  process.exit(1);
});
