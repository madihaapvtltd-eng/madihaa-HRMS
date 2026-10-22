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
  
  // Convert Timestamps to Date objects (handle Date, Timestamp, and string)
  const convertToDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    if (value.toDate) return value.toDate();
    return undefined;
  };
  
  employee.joinDate = convertToDate(employee.joinDate) || new Date();
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
export const updateEmployee = async (id: string, employee: Partial<Employee>) => {
  try {
    const updatedEmployee = {
      ...employee,
      updatedAt: new Date()
    };
    
    await updateDoc(
      doc(db, EMPLOYEES_COLLECTION, id),
      employeeToFirestore(updatedEmployee)
    );
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
