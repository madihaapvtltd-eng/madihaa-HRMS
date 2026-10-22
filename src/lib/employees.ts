import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Employee } from '../types';

const EMPLOYEES_COLLECTION = 'employees';

// Remove undefined values from object
const removeUndefined = (obj: any): any => {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter(val => val !== undefined && val !== null);
  }
  
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = removeUndefined(obj[key]);
      // Only include if value is not undefined and not null
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
  }
  
  return result;
};

// Convert Employee to Firestore format
const employeeToFirestore = (employee: Partial<Employee>): any => {
  const data: any = { ...employee };
  
  // Remove undefined values first
  const cleaned = removeUndefined(data);
  
  // Convert Date objects to Timestamps
  if (cleaned.joinDate && cleaned.joinDate instanceof Date) cleaned.joinDate = Timestamp.fromDate(cleaned.joinDate);
  if (cleaned.contractEndDate && cleaned.contractEndDate instanceof Date) cleaned.contractEndDate = Timestamp.fromDate(cleaned.contractEndDate);
  if (cleaned.createdAt && cleaned.createdAt instanceof Date) cleaned.createdAt = Timestamp.fromDate(cleaned.createdAt);
  if (cleaned.updatedAt && cleaned.updatedAt instanceof Date) cleaned.updatedAt = Timestamp.fromDate(cleaned.updatedAt);
  
  // Convert nested Date objects
  if (cleaned.employmentHistory && Array.isArray(cleaned.employmentHistory)) {
    cleaned.employmentHistory = cleaned.employmentHistory.map((record: any) => ({
      ...record,
      effectiveDate: record.effectiveDate instanceof Date ? Timestamp.fromDate(record.effectiveDate) : record.effectiveDate
    }));
  }
  
  if (cleaned.education && Array.isArray(cleaned.education)) {
    cleaned.education = cleaned.education.map((edu: any) => ({
      ...edu,
      startDate: edu.startDate instanceof Date ? Timestamp.fromDate(edu.startDate) : edu.startDate,
      endDate: edu.endDate instanceof Date ? Timestamp.fromDate(edu.endDate) : edu.endDate
    }));
  }
  
  if (cleaned.documents && Array.isArray(cleaned.documents)) {
    cleaned.documents = cleaned.documents.map((doc: any) => ({
      ...doc,
      uploadedAt: doc.uploadedAt instanceof Date ? Timestamp.fromDate(doc.uploadedAt) : doc.uploadedAt,
      expiryDate: doc.expiryDate instanceof Date ? Timestamp.fromDate(doc.expiryDate) : doc.expiryDate
    }));
  }
  
  if (cleaned.assets && Array.isArray(cleaned.assets)) {
    cleaned.assets = cleaned.assets.map((asset: any) => ({
      ...asset,
      assignedDate: asset.assignedDate instanceof Date ? Timestamp.fromDate(asset.assignedDate) : asset.assignedDate,
      returnDate: asset.returnDate instanceof Date ? Timestamp.fromDate(asset.returnDate) : asset.returnDate
    }));
  }
  
  // Convert accommodation assignedDate
  if (cleaned.accommodation && cleaned.accommodation.assignedDate) {
    cleaned.accommodation.assignedDate = cleaned.accommodation.assignedDate instanceof Date 
      ? Timestamp.fromDate(cleaned.accommodation.assignedDate) 
      : cleaned.accommodation.assignedDate;
  }
  
  // Remove undefined values again after conversions
  return removeUndefined(cleaned);
};

// Convert Firestore to Employee format
const employeeFromFirestore = (data: any): Employee => {
  const employee = { ...data };
  
  // Map old field names to new field names (for migrated data)
  // Old CSV import fields -> New Employee type fields
  if (!employee.firstName && employee.name) {
    const nameParts = employee.name.split(' ');
    employee.firstName = nameParts[0] || '';
    employee.lastName = nameParts.slice(1).join(' ') || '';
  }
  
  // Also try to split fullName if firstName is missing
  if (!employee.firstName && employee.fullName) {
    const nameParts = employee.fullName.split(' ');
    employee.firstName = nameParts[0] || '';
    employee.lastName = nameParts.slice(1).join(' ') || '';
  }
  
  // Map wpNo to employeeId if employeeId is missing
  if (!employee.employeeId && employee.wpNo) {
    employee.employeeId = employee.wpNo;
  }
  
  // Map EMP ID to employeeId if employeeId is still missing
  if (!employee.employeeId && employee['EMP ID']) {
    employee.employeeId = employee['EMP ID'];
  }
  
  // Map jobLevel to designation if designation is missing
  if (!employee.designation && employee.jobLevel) {
    employee.designation = employee.jobLevel;
  }
  
  // Map location to department if department is missing
  if (!employee.department && employee.location) {
    employee.department = employee.location;
  }
  
  // Map workSite to department if department is still missing
  if (!employee.department && employee.workSite) {
    employee.department = employee.workSite;
  }
  
  // Map various join date field names
  if (!employee.joinDate && employee.joiningDate) {
    employee.joinDate = employee.joiningDate;
  }
  if (!employee.joinDate && employee.dateJoined) {
    employee.joinDate = employee.dateJoined;
  }
  if (!employee.joinDate && employee.joining) {
    employee.joinDate = employee.joining;
  }
  if (!employee.joinDate && employee.dateOfJoining) {
    employee.joinDate = employee.dateOfJoining;
  }
  if (!employee.joinDate && employee.doj) {
    employee.joinDate = employee.doj;
  }
  
  // If joinDate is still missing or empty object, try to infer from other date fields
  if (!employee.joinDate || 
      (typeof employee.joinDate === 'object' && 
       !employee.joinDate.toDate && // Not a Firestore Timestamp
       Object.keys(employee.joinDate).length === 0)) { // Empty object
    // Try qtaPaid as a fallback (seems to be a date field in the data)
    if (employee.qtaPaid && employee.qtaPaid !== 'N/A' && employee.qtaPaid !== '') {
      employee.joinDate = employee.qtaPaid;
    }
    // Try signingDate from contractDetails
    if (employee.contractDetails?.signingDate) {
      employee.joinDate = employee.contractDetails.signingDate;
    }
    // Try contractStartDate from contractDetails
    if (employee.contractDetails?.contractStartDate) {
      employee.joinDate = employee.contractDetails.contractStartDate;
    }
    // If still no joinDate, leave it undefined (will be handled by defaults)
  }
  
  // Ensure required fields have defaults
  if (!employee.firstName) employee.firstName = '';
  if (!employee.lastName) employee.lastName = '';
  if (!employee.fullName) employee.fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
  if (!employee.email) employee.email = '';
  if (!employee.phone) employee.phone = '';
  if (!employee.photo) employee.photo = '';
  if (!employee.employeeId) employee.employeeId = '';
  if (!employee.registrationNumber) employee.registrationNumber = '';
  if (!employee.department) employee.department = '';
  if (!employee.designation) employee.designation = '';
  if (!employee.status) employee.status = 'active';
  if (!employee.emergencyContact) employee.emergencyContact = { name: '', relationship: '', phone: '' };
  if (!employee.employmentHistory) employee.employmentHistory = [];
  if (!employee.education) employee.education = [];
  if (!employee.medicalInfo) employee.medicalInfo = {};
  if (!employee.documents) employee.documents = [];
  if (!employee.assets) employee.assets = [];
  
  // Convert Timestamps to Date objects (handle Date, Timestamp, and string)
  const convertToDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      // Try parsing the date string
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
      
      // Try parsing formats like "1-Apr-2027"
      const months: { [key: string]: number } = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const parts = value.split('-');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthStr = parts[1].toLowerCase().substring(0, 3);
        const year = parseInt(parts[2]);
        if (months[monthStr] !== undefined && !isNaN(day) && !isNaN(year)) {
          const date = new Date(year, months[monthStr], day);
          if (!isNaN(date.getTime())) return date;
        }
      }
      
      // Try parsing DD/MM/YY or DD/MM/YYYY format (e.g., "28/04/1994", "21/02/13")
      const slashParts = value.split('/');
      if (slashParts.length === 3) {
        const day = parseInt(slashParts[0]);
        const month = parseInt(slashParts[1]) - 1; // Months are 0-indexed
        let year = parseInt(slashParts[2]);
        
        // Handle 2-digit years (e.g., "13" -> 2013)
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) return date;
        }
      }
      
      return undefined;
    }
    if (value.toDate) return value.toDate();
    return undefined;
  };
  
  employee.joinDate = convertToDate(employee.joinDate);
  employee.contractEndDate = convertToDate(employee.contractEndDate);
  employee.createdAt = convertToDate(employee.createdAt) || new Date();
  employee.updatedAt = convertToDate(employee.updatedAt) || new Date();
  
  // Convert nested Timestamps
  if (employee.employmentHistory) {
    employee.employmentHistory = employee.employmentHistory.map((record: any) => ({
      ...record,
      effectiveDate: convertToDate(record.effectiveDate) || new Date()
    }));
  }
  
  if (employee.education) {
    employee.education = employee.education.map((edu: any) => ({
      ...edu,
      startDate: convertToDate(edu.startDate) || new Date(),
      endDate: convertToDate(edu.endDate) || new Date()
    }));
  }
  
  if (employee.documents) {
    employee.documents = employee.documents.map((doc: any) => ({
      ...doc,
      uploadedAt: convertToDate(doc.uploadedAt) || new Date(),
      expiryDate: convertToDate(doc.expiryDate)
    }));
  }
  
  if (employee.assets) {
    employee.assets = employee.assets.map((asset: any) => ({
      ...asset,
      assignedDate: convertToDate(asset.assignedDate) || new Date(),
      returnDate: convertToDate(asset.returnDate)
    }));
  }
  
  // Convert accommodation assignedDate
  if (employee.accommodation && employee.accommodation.assignedDate) {
    employee.accommodation.assignedDate = convertToDate(employee.accommodation.assignedDate);
  }
  
  return employee as Employee;
};

// Get all employees with optional limit
export const getEmployees = async (limitCount?: number) => {
  try {
    const q = limitCount 
      ? query(
          collection(db, EMPLOYEES_COLLECTION),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        )
      : query(
          collection(db, EMPLOYEES_COLLECTION),
          orderBy('createdAt', 'desc')
        );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...employeeFromFirestore(doc.data()),
      id: doc.id,
    }));
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
};

// Get employee by ID
export const getEmployeeById = async (id: string) => {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        ...(employeeFromFirestore(docSnap.data()) as Omit<Employee, 'id'>),
        id: docSnap.id,
      } as Employee;
    }
    return null;
  } catch (error) {
    console.error('Error fetching employee:', error);
    throw error;
  }
};

// Create employee
export const createEmployee = async (employee: Partial<Employee>) => {
  try {
    const newEmployee = {
      ...employee,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(
      collection(db, EMPLOYEES_COLLECTION),
      employeeToFirestore(newEmployee)
    );
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
};

// Update employee
export const updateEmployee = async (id: string, data: Partial<Employee>) => {
  try {
    const firestoreData = employeeToFirestore(data);
    const employeeRef = doc(db, 'employees', id);
    await updateDoc(employeeRef, firestoreData);
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

// Delete employee
export const deleteEmployee = async (id: string) => {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
};

// Search employees
export const searchEmployees = async (searchTerm: string) => {
  try {
    const employees = await getEmployees();
    const term = searchTerm.toLowerCase();
    
    return employees.filter(employee =>
      employee.fullName.toLowerCase().includes(term) ||
      employee.employeeId.toLowerCase().includes(term) ||
      employee.email.toLowerCase().includes(term) ||
      employee.department.toLowerCase().includes(term) ||
      employee.designation.toLowerCase().includes(term)
    );
  } catch (error) {
    console.error('Error searching employees:', error);
    throw error;
  }
};

// Get employees by department
export const getEmployeesByDepartment = async (department: string) => {
  try {
    const q = query(
      collection(db, EMPLOYEES_COLLECTION),
      where('department', '==', department),
      orderBy('fullName')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...employeeFromFirestore(doc.data()),
      id: doc.id,
    }));
  } catch (error) {
    console.error('Error fetching employees by department:', error);
    throw error;
  }
};

// Get employees by status
export const getEmployeesByStatus = async (status: string) => {
  try {
    const q = query(
      collection(db, EMPLOYEES_COLLECTION),
      where('status', '==', status),
      orderBy('fullName')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...employeeFromFirestore(doc.data()),
      id: doc.id,
    }));
  } catch (error) {
    console.error('Error fetching employees by status:', error);
    throw error;
  }
};
