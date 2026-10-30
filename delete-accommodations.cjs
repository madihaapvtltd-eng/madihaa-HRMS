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

// Delete all accommodations and related data
async function deleteAccommodations(options = {}) {
  const { deleteBeds = true, deleteRooms = true, deleteFloors = true, deleteAccommodations = true } = options;
  
  console.log('Deleting accommodation data...');
  
  let deletedAccommodations = 0;
  let deletedFloors = 0;
  let deletedRooms = 0;
  let deletedBeds = 0;
  
  try {
    // Delete all beds
    if (deleteBeds) {
      const bedsSnapshot = await db.collection('beds').get();
      const bedsBatch = db.batch();
      bedsSnapshot.forEach(doc => {
        bedsBatch.delete(doc.ref);
      });
      if (!bedsSnapshot.empty) {
        await bedsBatch.commit();
        deletedBeds = bedsSnapshot.size;
        console.log(`Deleted ${deletedBeds} beds`);
      }
    }
    
    // Delete all rooms
    if (deleteRooms) {
      const roomsSnapshot = await db.collection('rooms').get();
      const roomsBatch = db.batch();
      roomsSnapshot.forEach(doc => {
        roomsBatch.delete(doc.ref);
      });
      if (!roomsSnapshot.empty) {
        await roomsBatch.commit();
        deletedRooms = roomsSnapshot.size;
        console.log(`Deleted ${deletedRooms} rooms`);
      }
    }
    
    // Delete all floors
    if (deleteFloors) {
      const floorsSnapshot = await db.collection('floors').get();
      const floorsBatch = db.batch();
      floorsSnapshot.forEach(doc => {
        floorsBatch.delete(doc.ref);
      });
      if (!floorsSnapshot.empty) {
        await floorsBatch.commit();
        deletedFloors = floorsSnapshot.size;
        console.log(`Deleted ${deletedFloors} floors`);
      }
    }
    
    // Delete all accommodations
    if (deleteAccommodations) {
      const accommodationsSnapshot = await db.collection('accommodations').get();
      const accommodationsBatch = db.batch();
      accommodationsSnapshot.forEach(doc => {
        accommodationsBatch.delete(doc.ref);
      });
      if (!accommodationsSnapshot.empty) {
        await accommodationsBatch.commit();
        deletedAccommodations = accommodationsSnapshot.size;
        console.log(`Deleted ${deletedAccommodations} accommodations`);
      }
    }
    
    console.log(`\nDeletion complete: ${deletedAccommodations} accommodations, ${deletedFloors} floors, ${deletedRooms} rooms, ${deletedBeds} beds`);
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  deleteBeds: !args.includes('--no-beds'),
  deleteRooms: !args.includes('--no-rooms'),
  deleteFloors: !args.includes('--no-floors'),
  deleteAccommodations: !args.includes('--no-accommodations')
};

if (args.includes('--help')) {
  console.log('Usage: node delete-accommodations.cjs [options]');
  console.log('Options:');
  console.log('  --no-beds            Skip deleting beds');
  console.log('  --no-rooms           Skip deleting rooms');
  console.log('  --no-floors          Skip deleting floors');
  console.log('  --no-accommodations Skip deleting accommodations');
  console.log('  --help               Show this help message');
  process.exit(0);
}

deleteAccommodations(options).then(() => {
  console.log('Deletion finished');
  process.exit(0);
}).catch((error) => {
  console.error('Deletion failed:', error);
  process.exit(1);
});
