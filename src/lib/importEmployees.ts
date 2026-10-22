import { createEmployee } from './employees';
import type { Employee } from '../types';

interface MasterEmployee {
  sn: string;
  'EMP ID': string;
  Name: string;
  'Job Level': string;
  Location: string;
  'D.O.J': string;
  SALARY: string;
  POSITION: string;
  COUNTRY: string;
  DOB: string;
  MOBILE: string;
  'WP NO': string;
  'WP EXP DATE': string;
  'PP / ID NUMBER': string;
  'PP / ID EXP DATE': string;
  'MED EXP DATE': string;
  'INSURANCE NUMBER': string;
  'INSURANCE EXP DATE': string;
  SLOT: string;
  'QTA PAID': string;
  'Work Site': string;
  STATUS: string;
  'work location'?: string;
}

// Parse date in DD/MM/YYYY format
const parseDate = (dateStr: string): Date | undefined => {
  if (!dateStr || dateStr === 'N/A' || dateStr === '') return undefined;
  
  // Try DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const parsed = new Date(`${fullYear}-${month}-${day}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try direct parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  
  return undefined;
};

// Parse salary string to number
const parseSalary = (salaryStr: string): number => {
  if (!salaryStr || salaryStr === 'N/A' || salaryStr === '') return 0;
  const num = parseFloat(salaryStr.replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
};

// Normalize name to title case (First Letter Uppercase, rest lowercase)
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Update existing employee names to normalized format
export const normalizeExistingEmployeeNames = async (): Promise<{ updated: number; failed: number }> => {
  const { getEmployees, updateEmployee } = await import('./employees');
  
  const results = { updated: 0, failed: 0 };
  
  try {
    const employees = await getEmployees();
    console.log(`Found ${employees.length} employees to check`);
    
    for (const employee of employees) {
      try {
        const normalizedFullName = normalizeName(employee.fullName);
        const normalizedFirstName = normalizeName(employee.firstName);
        const normalizedLastName = normalizeName(employee.lastName);
        
        console.log(`Checking ${employee.employeeId}: "${employee.fullName}" -> "${normalizedFullName}"`);
        
        // Only update if names are different
        if (
          normalizedFullName !== employee.fullName ||
          normalizedFirstName !== employee.firstName ||
          normalizedLastName !== employee.lastName
        ) {
          console.log(`Updating ${employee.employeeId}`);
          await updateEmployee(employee.id, {
            fullName: normalizedFullName,
            firstName: normalizedFirstName,
            lastName: normalizedLastName
          });
          results.updated++;
        }
      } catch (error) {
        results.failed++;
        console.error(`Failed to update ${employee.employeeId}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to load employees:', error);
  }
  
  return results;
};

// Remove duplicate employees from database (keep only one per employeeId)
export const removeDuplicateEmployees = async (): Promise<{ removed: number; kept: number; errors: string[] }> => {
  const { getEmployees, deleteEmployee } = await import('./employees');
  
  const results = {
    removed: 0,
    kept: 0,
    errors: [] as string[]
  };
  
  try {
    const employees = await getEmployees();
    console.log(`Found ${employees.length} total employees`);
    
    // Group employees by employeeId
    const employeeGroups = new Map<string, Employee[]>();
    
    for (const employee of employees) {
      const empId = employee.employeeId;
      if (!empId) continue;
      
      if (!employeeGroups.has(empId)) {
        employeeGroups.set(empId, []);
      }
      employeeGroups.get(empId)!.push(employee);
    }
    
    // Remove duplicates (keep the first one, delete the rest)
    for (const [empId, group] of employeeGroups) {
      if (group.length > 1) {
        console.log(`Found ${group.length} duplicates for ${empId}`);
        
        // Keep the first one (most recent based on createdAt or updatedAt)
        const toKeep = group.sort((a, b) => {
          const dateA = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
          const dateB = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
          return dateB - dateA; // Most recent first
        })[0];
        
        const toRemove = group.filter(emp => emp.id !== toKeep.id);
        
        for (const emp of toRemove) {
          try {
            await deleteEmployee(emp.id);
            results.removed++;
            console.log(`Removed duplicate ${emp.id} for ${empId}`);
          } catch (error) {
            results.errors.push(`Failed to delete ${emp.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            console.error(`Failed to delete ${emp.id}:`, error);
          }
        }
        
        results.kept++;
      } else {
        results.kept++;
      }
    }
    
    console.log(`Cleanup complete: ${results.removed} removed, ${results.kept} kept`);
  } catch (error) {
    console.error('Failed to remove duplicates:', error);
    results.errors.push(`Failed to load employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return results;
};

// Update existing employees with photo paths
export const updateEmployeePhotoPaths = async (): Promise<{ updated: number; failed: number }> => {
  const { getEmployees, updateEmployee } = await import('./employees');
  
  const results = { updated: 0, failed: 0 };
  
  try {
    const employees = await getEmployees();
    console.log(`Found ${employees.length} employees to check for photos`);
    
    for (const employee of employees) {
      try {
        // Check if employee already has a photo
        if (employee.photo) continue;
        
        // Try to set photo path based on employee ID
        const photoExtensions = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];
        let photoPath = '';
        
        for (const ext of photoExtensions) {
          photoPath = `/employee_images/${employee.employeeId}.${ext}`;
          break; // Use first extension
        }
        
        if (photoPath) {
          await updateEmployee(employee.id, {
            photo: photoPath
          });
          results.updated++;
          console.log(`Added photo path for ${employee.employeeId}`);
        }
      } catch (error) {
        results.failed++;
        console.error(`Failed to update photo for ${employee.employeeId}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to load employees:', error);
  }
  
  return results;
};

// Split name into first and last name
const splitName = (fullName: string): { firstName: string; lastName: string } => {
  const normalized = normalizeName(fullName);
  const parts = normalized.trim().split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
};

// Map master employee format to app's Employee format
const mapMasterEmployeeToApp = (master: MasterEmployee): Partial<Employee> => {
  const { firstName, lastName } = splitName(master.Name);
  const joinDate = parseDate(master['D.O.J']);
  
  // Check if employee image exists in public folder
  const employeeId = master['EMP ID'];
  const photoExtensions = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG'];
  let photoPath = '';
  
  for (const ext of photoExtensions) {
    const testPath = `/employee_images/${employeeId}.${ext}`;
    // We'll set the path and let the browser handle 404s gracefully
    photoPath = testPath;
    break; // Use first extension format, could be enhanced to check actual file
  }
  
  return {
    employeeId: master['EMP ID'],
    registrationNumber: master['EMP ID'],
    firstName,
    lastName,
    fullName: master.Name,
    email: '', // Not available in master data
    phone: master.MOBILE || '',
    photo: photoPath,
    department: master.Location || '',
    designation: master.POSITION || '',
    status: master.STATUS?.toLowerCase() === 'active' ? 'active' : 'active',
    joinDate: joinDate || new Date(),
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    employmentHistory: [],
    education: [],
    medicalInfo: {
      ...(master['MED EXP DATE'] && master['MED EXP DATE'] !== 'N/A' ? { insuranceProvider: 'Medical Certificate' } : {}),
      ...(master['INSURANCE NUMBER'] && master['INSURANCE NUMBER'] !== 'N/A' ? { insurancePolicyNumber: master['INSURANCE NUMBER'] } : {})
    },
    documents: [
      // Passport/ID document
      ...(master['PP / ID NUMBER'] ? [{
        id: `doc-${master['EMP ID']}-passport`,
        type: 'passport' as const,
        name: 'Passport/ID',
        url: '',
        uploadedAt: new Date(),
        expiryDate: parseDate(master['PP / ID EXP DATE'])
      }] : []),
      // Work Permit document
      ...(master['WP NO'] && master['WP NO'] !== 'N/A' ? [{
        id: `doc-${master['EMP ID']}-wp`,
        type: 'id_card' as const,
        name: 'Work Permit',
        url: '',
        uploadedAt: new Date(),
        expiryDate: parseDate(master['WP EXP DATE'])
      }] : []),
      // Medical document
      ...(master['MED EXP DATE'] && master['MED EXP DATE'] !== 'N/A' ? [{
        id: `doc-${master['EMP ID']}-medical`,
        type: 'other' as const,
        name: 'Medical Certificate',
        url: '',
        uploadedAt: new Date(),
        expiryDate: parseDate(master['MED EXP DATE'])
      }] : []),
      // Insurance document
      ...(master['INSURANCE NUMBER'] && master['INSURANCE EXP DATE'] && master['INSURANCE EXP DATE'] !== 'N/A' ? [{
        id: `doc-${master['EMP ID']}-insurance`,
        type: 'other' as const,
        name: 'Insurance',
        url: '',
        uploadedAt: new Date(),
        expiryDate: parseDate(master['INSURANCE EXP DATE'])
      }] : [])
    ],
    assets: [],
    contractDetails: {
      id: `contract-${master['EMP ID']}`,
      employeeId: master['EMP ID'],
      contractType: 'permanent',
      contractStartDate: joinDate || new Date(),
      salaryAmount: parseSalary(master.SALARY),
      currency: 'MVR',
      paymentFrequency: 'monthly',
      jobDescription: master.POSITION || '',
      reportingManager: '',
      signingDate: joinDate || new Date(),
      signedBy: 'System Import',
      status: 'active'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Import employees from master_employees.json
export const importEmployeesFromJSON = async (jsonData: any[]): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> => {
  const { getEmployees } = await import('./employees');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  };

  // Get existing employees to check for duplicates
  let existingEmployeeIds: string[] = [];
  try {
    const existingEmployees = await getEmployees();
    existingEmployeeIds = existingEmployees.map(emp => emp.employeeId);
    console.log(`Found ${existingEmployeeIds.length} existing employees`);
  } catch (error) {
    console.error('Failed to fetch existing employees:', error);
  }

  for (const masterEmployee of jsonData) {
    try {
      const employeeId = masterEmployee['EMP ID'];
      
      // Skip if employee already exists
      if (existingEmployeeIds.includes(employeeId)) {
        console.log(`Skipping ${employeeId} - already exists`);
        results.skipped++;
        continue;
      }
      
      const employeeData = mapMasterEmployeeToApp(masterEmployee);
      await createEmployee(employeeData);
      results.success++;
      console.log(`Imported ${employeeId}`);
    } catch (error) {
      results.failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`Failed to import ${masterEmployee.Name} (${masterEmployee['EMP ID']}): ${errorMsg}`);
      console.error(`Import error for ${masterEmployee['EMP ID']}:`, error);
    }
  }

  return results;
};

// Validate master employee JSON structure
export const validateMasterEmployeeJSON = (data: any): { valid: boolean; errors: string[]; validRows: any[] } => {
  const errors: string[] = [];
  const validRows: any[] = [];
  
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Data must be an array'], validRows: [] };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['Array is empty'], validRows: [] };
  }

  // Only require EMP ID and Name - other fields can be empty
  const requiredFields = ['EMP ID', 'Name'];
  
  data.forEach((item, index) => {
    // Skip completely empty rows
    const hasAnyData = Object.keys(item).some(key => item[key] && item[key].trim() !== '' && item[key] !== 'N/A');
    
    if (!hasAnyData) {
      console.log(`Skipping row ${index + 1}: No data`);
      return;
    }

    // Check only critical fields
    const missingFields = requiredFields.filter(field => !item[field] || item[field].trim() === '' || item[field] === 'N/A');
    
    if (missingFields.length > 0) {
      errors.push(`Row ${index + 1}: Missing critical fields: ${missingFields.join(', ')}`);
    } else {
      validRows.push(item);
    }
  });

  // Consider valid if we have at least some valid rows
  return {
    valid: validRows.length > 0,
    errors,
    validRows
  };
};

// Update existing employees with all fields from JSON (preserves existing fields, adds missing ones)
export const updateEmployeesFromJSON = async (jsonData: any[]): Promise<{ updated: number; notFound: number; failed: number; errors: string[] }> => {
  const { getEmployees, updateEmployee } = await import('./employees');
  
  const results = {
    updated: 0,
    notFound: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    const existingEmployees = await getEmployees();
    console.log(`Found ${existingEmployees.length} existing employees in Firestore`);
    
    // Create a map of employeeId to Firestore employee
    const employeeMap = new Map<string, any>();
    for (const emp of existingEmployees) {
      employeeMap.set(emp.employeeId, emp);
    }
    
    for (const jsonEmp of jsonData) {
      const empId = jsonEmp['EMP ID'];
      
      if (!empId || empId === 'N/A' || empId === '') {
        continue;
      }
      
      const firestoreEmp = employeeMap.get(empId);
      
      if (!firestoreEmp) {
        console.log(`Employee ${empId} not found in Firestore`);
        results.notFound++;
        continue;
      }
      
      try {
        // Map JSON fields to Firestore format (preserving existing fields)
        const { firstName, lastName } = splitName(jsonEmp.Name);
        const joinDate = parseDate(jsonEmp['D.O.J']);
        const dob = parseDate(jsonEmp.DOB);
        
        // Build update data with all fields from JSON
        const updateData: any = {
          // Core employee fields
          firstName,
          lastName,
          fullName: jsonEmp.Name,
          phone: jsonEmp.MOBILE || firestoreEmp.phone,
          department: jsonEmp.Location || firestoreEmp.department,
          designation: jsonEmp.POSITION || firestoreEmp.designation,
          joinDate: joinDate || firestoreEmp.joinDate,
          
          // Additional fields from JSON (will be added as extra fields)
          sn: jsonEmp.sn,
          jobLevel: jsonEmp['Job Level'],
          location: jsonEmp.Location,
          salary: jsonEmp.SALARY,
          country: jsonEmp.COUNTRY,
          dob: dob,
          wpNo: jsonEmp['WP NO'],
          wpExpDate: jsonEmp['WP EXP DATE'],
          ppIdNumber: jsonEmp['PP / ID NUMBER'],
          ppIdExpDate: jsonEmp['PP / ID EXP DATE'],
          medExpDate: jsonEmp['MED EXP DATE'],
          insuranceNumber: jsonEmp['INSURANCE NUMBER'],
          insuranceExpDate: jsonEmp['INSURANCE EXP DATE'],
          slot: jsonEmp.SLOT,
          qtaPaid: jsonEmp['QTA PAID'],
          workSite: jsonEmp['Work Site'],
          workLocation: jsonEmp['work location'],
          originalStatus: jsonEmp.STATUS
        };
        
        // Update medical info if available
        if (jsonEmp['INSURANCE NUMBER'] && jsonEmp['INSURANCE NUMBER'] !== 'N/A') {
          updateData.medicalInfo = {
            ...(firestoreEmp.medicalInfo || {}),
            insuranceProvider: jsonEmp['INSURANCE NUMBER'],
            insurancePolicyNumber: jsonEmp['INSURANCE NUMBER']
          };
        }
        
        // Update documents if available
        const documents = [...(firestoreEmp.documents || [])];
        
        // Update or add passport/ID document
        if (jsonEmp['PP / ID NUMBER'] && jsonEmp['PP / ID NUMBER'] !== 'N/A') {
          const existingDocIndex = documents.findIndex((d: any) => d.type === 'passport');
          const passportDoc = {
            id: `doc-${empId}-passport`,
            type: 'passport' as const,
            name: 'Passport/ID',
            url: '',
            uploadedAt: new Date(),
            expiryDate: parseDate(jsonEmp['PP / ID EXP DATE'])
          };
          if (existingDocIndex >= 0) {
            documents[existingDocIndex] = passportDoc;
          } else {
            documents.push(passportDoc);
          }
        }
        
        // Update or add work permit document
        if (jsonEmp['WP NO'] && jsonEmp['WP NO'] !== 'N/A') {
          const existingDocIndex = documents.findIndex((d: any) => d.type === 'id_card');
          const wpDoc = {
            id: `doc-${empId}-wp`,
            type: 'id_card' as const,
            name: 'Work Permit',
            url: '',
            uploadedAt: new Date(),
            expiryDate: parseDate(jsonEmp['WP EXP DATE'])
          };
          if (existingDocIndex >= 0) {
            documents[existingDocIndex] = wpDoc;
          } else {
            documents.push(wpDoc);
          }
        }
        
        // Update or add medical document
        if (jsonEmp['MED EXP DATE'] && jsonEmp['MED EXP DATE'] !== 'N/A') {
          const existingDocIndex = documents.findIndex((d: any) => d.name === 'Medical Certificate');
          const medicalDoc = {
            id: `doc-${empId}-medical`,
            type: 'other' as const,
            name: 'Medical Certificate',
            url: '',
            uploadedAt: new Date(),
            expiryDate: parseDate(jsonEmp['MED EXP DATE'])
          };
          if (existingDocIndex >= 0) {
            documents[existingDocIndex] = medicalDoc;
          } else {
            documents.push(medicalDoc);
          }
        }
        
        // Update or add insurance document
        if (jsonEmp['INSURANCE NUMBER'] && jsonEmp['INSURANCE EXP DATE'] && jsonEmp['INSURANCE EXP DATE'] !== 'N/A') {
          const existingDocIndex = documents.findIndex((d: any) => d.name === 'Insurance');
          const insuranceDoc = {
            id: `doc-${empId}-insurance`,
            type: 'other' as const,
            name: 'Insurance',
            url: '',
            uploadedAt: new Date(),
            expiryDate: parseDate(jsonEmp['INSURANCE EXP DATE'])
          };
          if (existingDocIndex >= 0) {
            documents[existingDocIndex] = insuranceDoc;
          } else {
            documents.push(insuranceDoc);
          }
        }
        
        updateData.documents = documents;
        
        // Update contract details if salary changed
        if (jsonEmp.SALARY && jsonEmp.SALARY !== 'N/A') {
          const salaryAmount = parseSalary(jsonEmp.SALARY);
          if (salaryAmount > 0) {
            updateData.contractDetails = {
              ...(firestoreEmp.contractDetails || {
                id: `contract-${empId}`,
                employeeId: empId,
                contractType: 'permanent',
                contractStartDate: joinDate || new Date(),
                currency: 'MVR',
                paymentFrequency: 'monthly',
                jobDescription: jsonEmp.POSITION || '',
                reportingManager: '',
                signingDate: joinDate || new Date(),
                signedBy: 'System Import',
                status: 'active'
              }),
              salaryAmount
            };
          }
        }
        
        await updateEmployee(firestoreEmp.id, updateData);
        results.updated++;
        console.log(`Updated employee ${empId}: ${jsonEmp.Name}`);
        
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to update ${jsonEmp.Name} (${empId}): ${errorMsg}`);
        console.error(`Update error for ${empId}:`, error);
      }
    }
    
    console.log(`Update complete: ${results.updated} updated, ${results.notFound} not found, ${results.failed} failed`);
  } catch (error) {
    console.error('Failed to load employees:', error);
    results.errors.push(`Failed to load employees: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return results;
};
