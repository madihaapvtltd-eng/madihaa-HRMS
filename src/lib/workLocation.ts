import type { WorkLocation } from '../types';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

// Convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) {
    return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
  }
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
  }
  const parsed = new Date(timestamp);
  if (!isNaN(parsed.getTime())) return parsed;
  return undefined;
};

// Convert Firestore document to WorkLocation
const firestoreToWorkLocation = (doc: any): WorkLocation => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || '',
    description: data.description,
    address: data.address,
    assignedStaff: data.assignedStaff || [],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

export const createWorkLocation = async (data: Omit<WorkLocation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'workLocations'), {
    ...data,
    assignedStaff: data.assignedStaff || [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return docRef.id;
};

export const getWorkLocation = async (id: string) => {
  const docRef = doc(db, 'workLocations', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return firestoreToWorkLocation(docSnap);
  }
  return null;
};

export const getAllWorkLocations = async () => {
  const q = query(collection(db, 'workLocations'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(firestoreToWorkLocation);
};

export const updateWorkLocation = async (id: string, data: Partial<WorkLocation>) => {
  const docRef = doc(db, 'workLocations', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date()
  });
};

export const deleteWorkLocation = async (id: string) => {
  const docRef = doc(db, 'workLocations', id);
  await deleteDoc(docRef);
};

export const assignStaffToWorkLocation = async (workLocationId: string, staffIds: string[]) => {
  const docRef = doc(db, 'workLocations', workLocationId);
  await updateDoc(docRef, {
    assignedStaff: staffIds,
    updatedAt: new Date()
  });
};

export const addStaffToWorkLocation = async (workLocationId: string, staffId: string) => {
  const workLocation = await getWorkLocation(workLocationId);
  if (workLocation) {
    const currentStaff = workLocation.assignedStaff || [];
    if (!currentStaff.includes(staffId)) {
      currentStaff.push(staffId);
      await updateWorkLocation(workLocationId, { assignedStaff: currentStaff });
    }
  }
};

export const removeStaffFromWorkLocation = async (workLocationId: string, staffId: string) => {
  const workLocation = await getWorkLocation(workLocationId);
  if (workLocation) {
    const currentStaff = workLocation.assignedStaff || [];
    const updatedStaff = currentStaff.filter(id => id !== staffId);
    await updateWorkLocation(workLocationId, { assignedStaff: updatedStaff });
  }
};

export const getWorkLocationByStaffId = async (staffId: string) => {
  const workLocations = await getAllWorkLocations();
  return workLocations.filter(loc => loc.assignedStaff?.includes(staffId));
};
