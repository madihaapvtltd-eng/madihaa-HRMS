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
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface WorkLocation {
  id?: string;
  name: string;
  description?: string;
  address?: string;
  assignedStaff: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const createWorkLocation = async (data: Omit<WorkLocation, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'workLocations'), {
    ...data,
    assignedStaff: data.assignedStaff || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
};

export const getWorkLocation = async (id: string) => {
  const docRef = doc(db, 'workLocations', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as WorkLocation;
  }
  return null;
};

export const getAllWorkLocations = async () => {
  const querySnapshot = await getDocs(collection(db, 'workLocations'));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkLocation));
};

export const updateWorkLocation = async (id: string, data: Partial<WorkLocation>) => {
  const docRef = doc(db, 'workLocations', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now()
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
    updatedAt: Timestamp.now()
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
  const q = query(collection(db, 'workLocations'), where('assignedStaff', 'array-contains', staffId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkLocation));
};
