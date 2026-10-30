const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

// Get all image files from public/employee_images
const imageDir = path.join(__dirname, 'public', 'employee_images');
const imageFiles = fs.readdirSync(imageDir)
  .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
  .map(file => {
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);
    return { baseName, ext, fullFile: file };
  });

console.log(`Found ${imageFiles.length} image files in public/employee_images`);

// Check employee photo paths
async function checkPhotoPaths() {
  try {
    const employeesSnapshot = await db.collection('employees').get();
    console.log(`Found ${employeesSnapshot.size} employees in Firebase`);
    
    let withPhoto = 0;
    let withoutPhoto = 0;
    let matchingPhoto = 0;
    let mismatchedPhoto = 0;
    const mismatches = [];
    
    employeesSnapshot.forEach(doc => {
      const employee = doc.data();
      const employeeId = employee.employeeId;
      
      if (employee.photo) {
        withPhoto++;
        // Extract base name from photo path
        const photoBaseName = path.basename(employee.photo, path.extname(employee.photo));
        
        // Check if there's a matching file
        const matchingFile = imageFiles.find(img => 
          img.baseName.toLowerCase() === employeeId.toLowerCase() ||
          img.baseName.toLowerCase() === photoBaseName.toLowerCase()
        );
        
        if (matchingFile) {
          matchingPhoto++;
        } else {
          mismatchedPhoto++;
          mismatches.push({
            employeeId,
            currentPhoto: employee.photo,
            expectedFiles: imageFiles.filter(img => img.baseName.toLowerCase().includes(employeeId.toLowerCase().replace('mad', '')))
          });
        }
      } else {
        withoutPhoto++;
        // Check if there's a file that could match
        const possibleMatch = imageFiles.find(img => 
          img.baseName.toLowerCase() === employeeId.toLowerCase()
        );
        
        if (possibleMatch) {
          mismatches.push({
            employeeId,
            currentPhoto: null,
            possibleMatch: possibleMatch.fullFile
          });
        }
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`  Employees with photo: ${withPhoto}`);
    console.log(`  Employees without photo: ${withoutPhoto}`);
    console.log(`  Matching photos: ${matchingPhoto}`);
    console.log(`  Mismatched photos: ${mismatchedPhoto}`);
    
    if (mismatches.length > 0) {
      console.log(`\nMismatches found (${mismatches.length}):`);
      mismatches.forEach(m => {
        console.log(`  Employee ID: ${m.employeeId}`);
        console.log(`    Current photo: ${m.currentPhoto || 'none'}`);
        if (m.possibleMatch) {
          console.log(`    Possible match: ${m.possibleMatch}`);
        }
        if (m.expectedFiles && m.expectedFiles.length > 0) {
          console.log(`    Expected files: ${m.expectedFiles.map(f => f.fullFile).join(', ')}`);
        }
      });
    }
  } catch (error) {
    console.error('Error checking photo paths:', error);
  }
}

checkPhotoPaths().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
