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

async function checkAccommodations() {
  console.log('Checking existing accommodations...\n');
  
  const accommodationsSnapshot = await db.collection('accommodations').get();
  console.log(`Found ${accommodationsSnapshot.size} accommodations in Firebase:`);
  accommodationsSnapshot.forEach(doc => {
    console.log(`  - ${doc.data().name} (ID: ${doc.id})`);
  });
  
  console.log('\nChecking floors...');
  const floorsSnapshot = await db.collection('floors').get();
  console.log(`Found ${floorsSnapshot.size} floors`);
  
  console.log('\nChecking rooms...');
  const roomsSnapshot = await db.collection('rooms').get();
  console.log(`Found ${roomsSnapshot.size} rooms`);
  
  console.log('\nChecking beds...');
  const bedsSnapshot = await db.collection('beds').get();
  console.log(`Found ${bedsSnapshot.size} beds`);
}

checkAccommodations().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
