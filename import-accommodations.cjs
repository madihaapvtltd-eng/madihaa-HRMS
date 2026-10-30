const admin = require('firebase-admin');
const fs = require('fs');

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

// Read accommodations JSON
const accommodationsData = JSON.parse(fs.readFileSync('./accommodations.json', 'utf8'));

// Import accommodations to Firebase
async function importAccommodations() {
  console.log(`Found ${accommodationsData.length} accommodations to import`);
  
  let success = 0;
  let failed = 0;
  let skipped = 0;
  
  for (const accommodation of accommodationsData) {
    try {
      // Check if accommodation already exists
      const existingDoc = await db.collection('accommodations').where('name', '==', accommodation.name).limit(1).get();
      
      if (!existingDoc.empty) {
        console.log(`Skipping existing accommodation: ${accommodation.name}`);
        skipped++;
        continue;
      }
      
      // Create accommodation
      const accommodationRef = await db.collection('accommodations').add({
        name: accommodation.name,
        location: accommodation.location,
        description: accommodation.description,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const accommodationId = accommodationRef.id;
      console.log(`Created accommodation: ${accommodation.name} (ID: ${accommodationId})`);
      
      // Create floors
      for (const floor of accommodation.floors) {
        const floorRef = await db.collection('floors').add({
          accommodationId: accommodationId,
          floorNumber: floor.floorNumber,
          name: floor.name,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        const floorId = floorRef.id;
        console.log(`  Created floor: ${floor.name} (ID: ${floorId})`);
        
        // Create rooms
        for (const room of floor.rooms) {
          const roomRef = await db.collection('rooms').add({
            floorId: floorId,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            status: 'available',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          const roomId = roomRef.id;
          console.log(`    Created room: Room ${room.roomNumber} (ID: ${roomId})`);
          
          // Create beds
          for (const bed of room.beds) {
            await db.collection('beds').add({
              roomId: roomId,
              bedNumber: bed.bedNumber,
              position: bed.position,
              status: 'available',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          console.log(`      Created ${room.beds.length} beds`);
        }
      }
      
      success++;
    } catch (error) {
      failed++;
      console.error(`Failed to import ${accommodation.name}:`, error.message);
    }
  }
  
  console.log(`\nImport complete: ${success} success, ${failed} failed, ${skipped} skipped`);
}

importAccommodations().then(() => {
  console.log('Import finished');
  process.exit(0);
}).catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
