const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./madihaa-hrms-v2-firebase-adminsdk-fbsvc-8c88c15292.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

// Load the September leaves data
const leavesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'past_leaves', 'september_past_leaves.json'), 'utf8')
);

// Map leave types from JSON to system LeaveType
const leaveTypeMap = {
  'AL': 'annual',
  'OFF': 'off_day',
  'EL': 'emergency',
  'ML': 'medical',
  'UL': 'unpaid',
  'SICK': 'medical'
};

// Function to normalize employee number (MDA -> MAD)
const normalizeEmployeeNumber = (empNumber) => {
  if (empNumber.startsWith('MDA')) {
    return 'MAD' + empNumber.substring(3);
  }
  return empNumber;
};

async function importSeptemberLeaves() {
  console.log('Starting import of September leaves...');
  
  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const employeeData of leavesData) {
    const { employee_number, name, leaves } = employeeData;
    
    // Normalize employee number
    const normalizedEmpNumber = normalizeEmployeeNumber(employee_number);
    
    console.log(`\nProcessing ${employee_number} -> ${normalizedEmpNumber} - ${name} (${leaves.length} leaves)`);
    
    // Find employee in Firebase by employeeId
    const employeesSnapshot = await db
      .collection('employees')
      .where('employeeId', '==', normalizedEmpNumber)
      .limit(1)
      .get();
    
    if (employeesSnapshot.empty) {
      console.log(`  ⚠️  Employee ${normalizedEmpNumber} not found in database, skipping`);
      skippedCount++;
      continue;
    }
    
    const employeeDoc = employeesSnapshot.docs[0];
    const employeeId = employeeDoc.id;
    
    // Group consecutive leaves into leave requests
    const leaveRequests = [];
    let currentRequest = null;
    
    for (const leave of leaves) {
      const leaveType = leaveTypeMap[leave.leave_type] || 'annual';
      const leaveDate = new Date(leave.date);
      
      if (!currentRequest) {
        // Start a new request
        currentRequest = {
          type: leaveType,
          startDate: leaveDate,
          endDate: leaveDate,
          days: 1,
          dates: [leaveDate]
        };
      } else {
        // Check if this is consecutive and same type
        const prevDate = new Date(currentRequest.endDate);
        prevDate.setDate(prevDate.getDate() + 1);
        
        if (leaveDate.getTime() === prevDate.getTime() && currentRequest.type === leaveType) {
          // Extend current request
          currentRequest.endDate = leaveDate;
          currentRequest.days++;
          currentRequest.dates.push(leaveDate);
        } else {
          // Save current request and start new one
          leaveRequests.push(currentRequest);
          currentRequest = {
            type: leaveType,
            startDate: leaveDate,
            endDate: leaveDate,
            days: 1,
            dates: [leaveDate]
          };
        }
      }
    }
    
    // Don't forget the last request
    if (currentRequest) {
      leaveRequests.push(currentRequest);
    }
    
    console.log(`  Created ${leaveRequests.length} leave request(s)`);
    
    // Import each leave request
    for (const request of leaveRequests) {
      try {
        const leaveRequestRef = db.collection('leave_requests').doc();
        
        // Create approval record for system approval
        const approvals = [{
          level: 1,
          approverId: 'system',
          approverName: 'System Import',
          status: 'approved',
          comments: 'Auto-approved during historical data import',
          actionDate: Timestamp.fromDate(new Date('2026-08-31'))
        }];
        
        await leaveRequestRef.set({
          id: leaveRequestRef.id,
          employeeId: employeeId,
          type: request.type,
          startDate: Timestamp.fromDate(request.startDate),
          endDate: Timestamp.fromDate(request.endDate),
          days: request.days,
          reason: 'Imported from September 2026 records',
          status: 'approved',
          approvals: approvals,
          appliedDate: Timestamp.fromDate(new Date('2026-08-31')),
          createdAt: Timestamp.fromDate(new Date('2026-08-31')),
          updatedAt: Timestamp.fromDate(new Date('2026-08-31')),
          balanceAdjusted: true
        });
        
        console.log(`  ✓ Imported ${request.type} leave: ${request.startDate.toISOString().split('T')[0]} to ${request.endDate.toISOString().split('T')[0]} (${request.days} days)`);
        successCount++;
        totalProcessed++;
      } catch (error) {
        console.error(`  ✗ Error importing leave:`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Skipped (employee not found): ${skippedCount}`);
  
  process.exit(0);
}

importSeptemberLeaves().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
