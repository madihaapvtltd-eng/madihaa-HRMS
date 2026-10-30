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

// Work locations data
const workLocations = [
  {
    name: "Head Office",
    description: "Main administrative office located in Malé."
  },
  {
    name: "Wholesale",
    description: "Wholesale distribution and trading facility located in Malé."
  },
  {
    name: "Doores Godown",
    description: "Storage warehouse facility located in Malé."
  },
  {
    name: "Stock Keeper / Stock Facility",
    description: "Inventory management and stock holding location in Malé."
  },
  {
    name: "Retail Shop",
    description: "Retail storefront operations located in Malé."
  },
  {
    name: "Bazaaru Shop",
    description: "Commercial retail outlet located in the bazaar area of Malé."
  },
  {
    name: "Galolhu Shop",
    description: "Branch outlet located in the Galolhu district of Malé."
  },
  {
    name: "Athulhu Shop",
    description: "Retail branch location in Malé."
  },
  {
    name: "HM Shop1",
    description: "First commercial shop branch located in Hulhumalé."
  },
  {
    name: "HM Shop2",
    description: "Second commercial shop branch located in Hulhumalé."
  },
  {
    name: "HM Site / Hulhumale Site",
    description: "Construction, operational, or residential project site located in Hulhumalé."
  },
  {
    name: "Purchasing Office",
    description: "Procurement and purchasing office located in Malé."
  },
  {
    name: "Maintenance",
    description: "Maintenance workshop and operations hub located in Malé."
  },
  {
    name: "Clearance",
    description: "Cargo clearance and logistics office located in Malé."
  },
  {
    name: "Madihaa",
    description: "Operations and housing site located in Madihaa / southern islands."
  },
  {
    name: "Vakaru / Vakara House",
    description: "Operational site or staff residence located in Vakaru."
  },
  {
    name: "Bokaifushi",
    description: "Island operational site located in Bokaifushi."
  }
];

// Import work locations to Firebase
async function importWorkLocations() {
  console.log(`Found ${workLocations.length} work locations to import`);
  
  let success = 0;
  let failed = 0;
  
  const batch = db.batch();
  const batchSize = 500;
  let currentBatch = 0;
  
  for (const location of workLocations) {
    try {
      // Check if work location already exists
      const existingDoc = await db.collection('workLocations').where('name', '==', location.name).limit(1).get();
      
      if (!existingDoc.empty) {
        console.log(`Skipping existing work location: ${location.name}`);
        continue;
      }
      
      const docRef = db.collection('workLocations').doc();
      batch.set(docRef, {
        name: location.name,
        description: location.description,
        assignedStaff: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      currentBatch++;
      
      if (currentBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${currentBatch} work locations`);
        batch.reset();
        currentBatch = 0;
      }
      
      success++;
      console.log(`Imported: ${location.name}`);
    } catch (error) {
      failed++;
      console.error(`Failed to import ${location.name}:`, error.message);
    }
  }
  
  // Commit remaining batch
  if (currentBatch > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${currentBatch} work locations`);
  }
  
  console.log(`\nImport complete: ${success} success, ${failed} failed`);
}

importWorkLocations().then(() => {
  console.log('Import finished');
  process.exit(0);
}).catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
