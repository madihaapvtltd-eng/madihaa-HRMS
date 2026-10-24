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
import type { Accommodation, Floor, Room, Bed, AccommodationAssignment } from '../types';

const ACCOMMODATIONS_COLLECTION = 'accommodations';
const FLOORS_COLLECTION = 'floors';
const ROOMS_COLLECTION = 'rooms';
const BEDS_COLLECTION = 'beds';
const ASSIGNMENTS_COLLECTION = 'accommodation_assignments';

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
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
  }
  
  return result;
};

// Convert to Firestore format
const toFirestore = (data: any): any => {
  const cleaned = removeUndefined({ ...data });
  
  // Convert Date objects to Timestamps
  const convertDate = (value: any): any => {
    if (!value) return undefined;
    if (value instanceof Date) return Timestamp.fromDate(value);
    return value;
  };
  
  if (cleaned.createdAt) cleaned.createdAt = convertDate(cleaned.createdAt);
  if (cleaned.updatedAt) cleaned.updatedAt = convertDate(cleaned.updatedAt);
  if (cleaned.assignedDate) cleaned.assignedDate = convertDate(cleaned.assignedDate);
  
  if (cleaned.floors && Array.isArray(cleaned.floors)) {
    cleaned.floors = cleaned.floors.map((floor: any) => ({
      ...floor,
      createdAt: convertDate(floor.createdAt),
      updatedAt: convertDate(floor.updatedAt),
      rooms: floor.rooms?.map((room: any) => ({
        ...room,
        createdAt: convertDate(room.createdAt),
        updatedAt: convertDate(room.updatedAt),
        beds: room.beds?.map((bed: any) => ({
          ...bed,
          createdAt: convertDate(bed.createdAt),
          updatedAt: convertDate(bed.updatedAt),
          assignedDate: convertDate(bed.assignedDate)
        }))
      }))
    }));
  }
  
  return removeUndefined(cleaned);
};

// Convert from Firestore format
const fromFirestore = (data: any): any => {
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
  
  const result = { ...data };
  
  result.createdAt = convertToDate(result.createdAt) || new Date();
  result.updatedAt = convertToDate(result.updatedAt) || new Date();
  result.assignedDate = convertToDate(result.assignedDate);
  
  if (result.floors && Array.isArray(result.floors)) {
    result.floors = result.floors.map((floor: any) => ({
      ...floor,
      createdAt: convertToDate(floor.createdAt) || new Date(),
      updatedAt: convertToDate(floor.updatedAt) || new Date(),
      rooms: floor.rooms?.map((room: any) => ({
        ...room,
        createdAt: convertToDate(room.createdAt) || new Date(),
        updatedAt: convertToDate(room.updatedAt) || new Date(),
        beds: room.beds?.map((bed: any) => ({
          ...bed,
          createdAt: convertToDate(bed.createdAt) || new Date(),
          updatedAt: convertToDate(bed.updatedAt) || new Date(),
          assignedDate: convertToDate(bed.assignedDate)
        }))
      }))
    }));
  }
  
  return result;
};

// Accommodation CRUD
export const getAccommodations = async (): Promise<Accommodation[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, ACCOMMODATIONS_COLLECTION));
    const accommodations = querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Accommodation[];
    
    // Load all floors in parallel
    const floorsQuery = query(collection(db, FLOORS_COLLECTION));
    const floorsSnapshot = await getDocs(floorsQuery);
    const allFloors = floorsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Floor[];
    
    // Load all rooms in parallel
    const roomsQuery = query(collection(db, ROOMS_COLLECTION));
    const roomsSnapshot = await getDocs(roomsQuery);
    const allRooms = roomsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Room[];
    
    // Load all beds in parallel
    const bedsQuery = query(collection(db, BEDS_COLLECTION));
    const bedsSnapshot = await getDocs(bedsQuery);
    const allBeds = bedsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Bed[];
    
    // Associate floors, rooms, and beds with accommodations
    for (const accommodation of accommodations) {
      accommodation.floors = allFloors.filter(f => f.accommodationId === accommodation.id);
      
      for (const floor of accommodation.floors) {
        floor.rooms = allRooms.filter(r => r.floorId === floor.id);
        
        for (const room of floor.rooms) {
          room.beds = allBeds.filter(b => b.roomId === room.id);
        }
      }
    }
    
    return accommodations;
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    return [];
  }
};

export const getAccommodationById = async (id: string): Promise<Accommodation | null> => {
  try {
    const docRef = doc(db, ACCOMMODATIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const accommodation = fromFirestore({ id: docSnap.id, ...docSnap.data() }) as Accommodation;
    
    // Get related floors
    const floorsQuery = query(collection(db, FLOORS_COLLECTION), where('accommodationId', '==', id));
    const floorsSnapshot = await getDocs(floorsQuery);
    accommodation.floors = floorsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Floor[];
    
    // Get rooms for each floor
    for (const floor of accommodation.floors) {
      const roomsQuery = query(collection(db, ROOMS_COLLECTION), where('floorId', '==', floor.id));
      const roomsSnapshot = await getDocs(roomsQuery);
      floor.rooms = roomsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Room[];
      
      // Get beds for each room
      for (const room of floor.rooms) {
        const bedsQuery = query(collection(db, BEDS_COLLECTION), where('roomId', '==', room.id));
        const bedsSnapshot = await getDocs(bedsQuery);
        room.beds = bedsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Bed[];
      }
    }
    
    return accommodation;
  } catch (error) {
    console.error('Error fetching accommodation:', error);
    return null;
  }
};

export const createAccommodation = async (data: Partial<Accommodation>): Promise<Accommodation> => {
  try {
    const newAccommodation: Partial<Accommodation> = {
      name: data.name || '',
      location: data.location || '',
      description: data.description,
      status: data.status || 'active',
      floors: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, ACCOMMODATIONS_COLLECTION), toFirestore(newAccommodation));
    return { id: docRef.id, ...newAccommodation } as Accommodation;
  } catch (error) {
    console.error('Error creating accommodation:', error);
    throw error;
  }
};

export const updateAccommodation = async (id: string, data: Partial<Accommodation>): Promise<Accommodation> => {
  try {
    const docRef = doc(db, ACCOMMODATIONS_COLLECTION, id);
    await updateDoc(docRef, toFirestore({ ...data, updatedAt: new Date() }));
    return { id, ...data, updatedAt: new Date() } as Accommodation;
  } catch (error) {
    console.error('Error updating accommodation:', error);
    throw error;
  }
};

export const deleteAccommodation = async (id: string): Promise<void> => {
  try {
    // Delete all related floors, rooms, beds, and assignments
    const floorsQuery = query(collection(db, FLOORS_COLLECTION), where('accommodationId', '==', id));
    const floorsSnapshot = await getDocs(floorsQuery);
    
    for (const floorDoc of floorsSnapshot.docs) {
      await deleteFloor(floorDoc.id);
    }
    
    // Delete accommodation
    await deleteDoc(doc(db, ACCOMMODATIONS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting accommodation:', error);
    throw error;
  }
};

export const duplicateAccommodation = async (id: string): Promise<Accommodation> => {
  try {
    const original = await getAccommodationById(id);
    if (!original) throw new Error('Accommodation not found');
    
    const duplicate: Partial<Accommodation> = {
      name: `${original.name} (Copy)`,
      location: original.location,
      description: original.description,
      status: original.status,
      floors: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, ACCOMMODATIONS_COLLECTION), toFirestore(duplicate));
    const newAccommodation = { id: docRef.id, ...duplicate } as Accommodation;
    
    // Duplicate all floors
    for (const floor of original.floors) {
      const newFloor: Partial<Floor> = {
        accommodationId: newAccommodation.id,
        floorNumber: floor.floorNumber,
        name: floor.name,
        rooms: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const floorDocRef = await addDoc(collection(db, FLOORS_COLLECTION), toFirestore(newFloor));
      const newFloorId = floorDocRef.id;
      
      // Duplicate all rooms for this floor
      for (const room of floor.rooms) {
        const newRoom: Partial<Room> = {
          floorId: newFloorId,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          capacity: room.capacity,
          beds: [],
          status: 'available',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const roomDocRef = await addDoc(collection(db, ROOMS_COLLECTION), toFirestore(newRoom));
        const newRoomId = roomDocRef.id;
        
        // Duplicate all beds for this room
        for (const bed of room.beds) {
          await createBed({
            roomId: newRoomId,
            bedNumber: bed.bedNumber,
            position: bed.position,
            status: 'available' // Reset to available
          });
        }
      }
    }
    
    return newAccommodation;
  } catch (error) {
    console.error('Error duplicating accommodation:', error);
    throw error;
  }
};

// Floor CRUD
export const createFloor = async (data: Partial<Floor>): Promise<Floor> => {
  try {
    const newFloor: Partial<Floor> = {
      accommodationId: data.accommodationId || '',
      floorNumber: data.floorNumber || 1,
      name: data.name || `Floor ${data.floorNumber || 1}`,
      rooms: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, FLOORS_COLLECTION), toFirestore(newFloor));
    return { id: docRef.id, ...newFloor } as Floor;
  } catch (error) {
    console.error('Error creating floor:', error);
    throw error;
  }
};

export const updateFloor = async (id: string, data: Partial<Floor>): Promise<Floor> => {
  try {
    const docRef = doc(db, FLOORS_COLLECTION, id);
    await updateDoc(docRef, toFirestore({ ...data, updatedAt: new Date() }));
    return { id, ...data, updatedAt: new Date() } as Floor;
  } catch (error) {
    console.error('Error updating floor:', error);
    throw error;
  }
};

export const deleteFloor = async (id: string): Promise<void> => {
  try {
    // Delete related rooms, beds, and assignments
    const roomsQuery = query(collection(db, ROOMS_COLLECTION), where('floorId', '==', id));
    const roomsSnapshot = await getDocs(roomsQuery);
    
    for (const roomDoc of roomsSnapshot.docs) {
      await deleteRoom(roomDoc.id);
    }
    
    // Delete floor
    await deleteDoc(doc(db, FLOORS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting floor:', error);
    throw error;
  }
};

export const duplicateFloor = async (accommodationId: string, originalFloorId?: string): Promise<Floor> => {
  try {
    const floorsQuery = query(collection(db, FLOORS_COLLECTION), where('accommodationId', '==', accommodationId));
    const floorsSnapshot = await getDocs(floorsQuery);
    const maxFloorNumber = floorsSnapshot.docs.reduce((max, doc) => {
      const floor = doc.data();
      return Math.max(max, floor.floorNumber || 0);
    }, 0);
    
    let floorName = `Floor ${maxFloorNumber + 1}`;
    let roomsToCreate: any[] = [];
    
    // If duplicating an existing floor, copy its structure
    if (originalFloorId) {
      const originalFloorDoc = await getDoc(doc(db, FLOORS_COLLECTION, originalFloorId));
      if (originalFloorDoc.exists()) {
        const originalFloor = fromFirestore({ id: originalFloorDoc.id, ...originalFloorDoc.data() }) as Floor;
        floorName = originalFloor.name;
        
        // Get all rooms from the original floor
        const roomsQuery = query(collection(db, ROOMS_COLLECTION), where('floorId', '==', originalFloorId));
        const roomsSnapshot = await getDocs(roomsQuery);
        
        for (const roomDoc of roomsSnapshot.docs) {
          const room = fromFirestore({ id: roomDoc.id, ...roomDoc.data() }) as Room;
          
          // Get all beds for this room
          const bedsQuery = query(collection(db, BEDS_COLLECTION), where('roomId', '==', room.id));
          const bedsSnapshot = await getDocs(bedsQuery);
          
          const bedsToCreate = bedsSnapshot.docs.map(doc => {
            const bed = fromFirestore({ id: doc.id, ...doc.data() }) as Bed;
            return {
              bedNumber: bed.bedNumber,
              position: bed.position,
              status: 'available'
            };
          });
          
          roomsToCreate.push({
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            beds: bedsToCreate
          });
        }
      }
    }
    
    const duplicate: Partial<Floor> = {
      accommodationId,
      floorNumber: maxFloorNumber + 1,
      name: floorName,
      rooms: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, FLOORS_COLLECTION), toFirestore(duplicate));
    const newFloor = { id: docRef.id, ...duplicate } as Floor;
    
    // Create all rooms for the new floor
    for (const roomData of roomsToCreate) {
      const newRoom: Partial<Room> = {
        floorId: newFloor.id,
        roomNumber: roomData.roomNumber,
        roomType: roomData.roomType as 'single' | 'double' | 'dormitory' | 'suite',
        capacity: roomData.capacity,
        beds: [],
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const roomDocRef = await addDoc(collection(db, ROOMS_COLLECTION), toFirestore(newRoom));
      const newRoomId = roomDocRef.id;
      
      // Create all beds for this room
      for (const bedData of roomData.beds) {
        await createBed({
          roomId: newRoomId,
          bedNumber: bedData.bedNumber,
          position: bedData.position,
          status: 'available'
        });
      }
    }
    
    return newFloor;
  } catch (error) {
    console.error('Error duplicating floor:', error);
    throw error;
  }
};

// Room CRUD
export const createRoom = async (data: Partial<Room>): Promise<Room> => {
  try {
    const newRoom: Partial<Room> = {
      floorId: data.floorId || '',
      roomNumber: data.roomNumber || '',
      roomType: data.roomType || 'double',
      capacity: data.capacity || 2,
      beds: [],
      status: data.status || 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, ROOMS_COLLECTION), toFirestore(newRoom));
    return { id: docRef.id, ...newRoom } as Room;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

export const updateRoom = async (id: string, data: Partial<Room>): Promise<Room> => {
  try {
    const docRef = doc(db, ROOMS_COLLECTION, id);
    await updateDoc(docRef, toFirestore({ ...data, updatedAt: new Date() }));
    return { id, ...data, updatedAt: new Date() } as Room;
  } catch (error) {
    console.error('Error updating room:', error);
    throw error;
  }
};

export const deleteRoom = async (id: string): Promise<void> => {
  try {
    // Delete related beds and assignments
    const bedsQuery = query(collection(db, BEDS_COLLECTION), where('roomId', '==', id));
    const bedsSnapshot = await getDocs(bedsQuery);
    
    for (const bedDoc of bedsSnapshot.docs) {
      await deleteBed(bedDoc.id);
    }
    
    // Delete room
    await deleteDoc(doc(db, ROOMS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
};

export const duplicateRoom = async (floorId: string, originalRoomId?: string): Promise<Room> => {
  try {
    const roomsQuery = query(collection(db, ROOMS_COLLECTION), where('floorId', '==', floorId));
    const roomsSnapshot = await getDocs(roomsQuery);
    const maxRoomNumber = roomsSnapshot.docs.reduce((max, doc) => {
      const room = doc.data();
      const roomNum = parseInt(room.roomNumber) || 0;
      return Math.max(max, roomNum);
    }, 0);
    
    let roomType = 'double';
    let capacity = 2;
    let bedsToCreate: Partial<Bed>[] = [];
    
    // If duplicating an existing room, copy its structure
    if (originalRoomId) {
      const originalRoomDoc = await getDoc(doc(db, ROOMS_COLLECTION, originalRoomId));
      if (originalRoomDoc.exists()) {
        const originalRoom = fromFirestore({ id: originalRoomDoc.id, ...originalRoomDoc.data() }) as Room;
        roomType = originalRoom.roomType as 'single' | 'double' | 'dormitory' | 'suite';
        capacity = originalRoom.capacity;
        
        // Get all beds from the original room
        const bedsQuery = query(collection(db, BEDS_COLLECTION), where('roomId', '==', originalRoomId));
        const bedsSnapshot = await getDocs(bedsQuery);
        
        bedsToCreate = bedsSnapshot.docs.map(doc => {
          const bed = fromFirestore({ id: doc.id, ...doc.data() }) as Bed;
          return {
            bedNumber: bed.bedNumber,
            position: bed.position,
            status: 'available' // Reset to available for new room
          };
        });
      }
    }
    
    const duplicate: Partial<Room> = {
      floorId,
      roomNumber: (maxRoomNumber + 1).toString(),
      roomType: roomType as 'single' | 'double' | 'dormitory' | 'suite',
      capacity,
      beds: [],
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, ROOMS_COLLECTION), toFirestore(duplicate));
    const newRoom = { id: docRef.id, ...duplicate } as Room;
    
    // Create all beds for the new room
    for (const bedData of bedsToCreate) {
      await createBed({
        roomId: newRoom.id,
        bedNumber: bedData.bedNumber,
        position: bedData.position,
        status: 'available'
      });
    }
    
    return newRoom;
  } catch (error) {
    console.error('Error duplicating room:', error);
    throw error;
  }
};

// Bed CRUD
export const createBed = async (data: Partial<Bed>): Promise<Bed> => {
  try {
    // Check if room already has 10 beds
    const existingBedsQuery = query(collection(db, BEDS_COLLECTION), where('roomId', '==', data.roomId));
    const existingBedsSnapshot = await getDocs(existingBedsQuery);
    
    if (existingBedsSnapshot.size >= 10) {
      throw new Error('Maximum 10 beds allowed per room');
    }
    
    const newBed: Partial<Bed> = {
      roomId: data.roomId || '',
      bedNumber: data.bedNumber || '',
      position: data.position || 'bottom',
      status: data.status || 'available',
      assignedEmployeeId: data.assignedEmployeeId,
      assignedEmployeeName: data.assignedEmployeeName,
      assignedDate: data.assignedDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, BEDS_COLLECTION), toFirestore(newBed));
    return { id: docRef.id, ...newBed } as Bed;
  } catch (error) {
    console.error('Error creating bed:', error);
    throw error;
  }
};

export const updateBed = async (id: string, data: Partial<Bed>): Promise<Bed> => {
  try {
    const docRef = doc(db, BEDS_COLLECTION, id);
    await updateDoc(docRef, toFirestore({ ...data, updatedAt: new Date() }));
    return { id, ...data, updatedAt: new Date() } as Bed;
  } catch (error) {
    console.error('Error updating bed:', error);
    throw error;
  }
};

export const deleteBed = async (id: string): Promise<void> => {
  try {
    // Delete related assignments
    const assignmentsQuery = query(collection(db, ASSIGNMENTS_COLLECTION), where('bedId', '==', id));
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    
    for (const assignDoc of assignmentsSnapshot.docs) {
      await deleteDoc(doc(db, ASSIGNMENTS_COLLECTION, assignDoc.id));
    }
    
    // Delete bed
    await deleteDoc(doc(db, BEDS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting bed:', error);
    throw error;
  }
};

// Assignment CRUD
export const getAssignments = async (): Promise<AccommodationAssignment[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, ASSIGNMENTS_COLLECTION));
    return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as AccommodationAssignment[];
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
};

export const createAssignment = async (data: Partial<AccommodationAssignment>): Promise<AccommodationAssignment> => {
  try {
    const newAssignment: Partial<AccommodationAssignment> = {
      employeeId: data.employeeId || '',
      employeeName: data.employeeName || '',
      bedId: data.bedId || '',
      roomId: data.roomId || '',
      floorId: data.floorId || '',
      accommodationId: data.accommodationId || '',
      assignedDate: data.assignedDate || new Date(),
      status: data.status || 'active',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, ASSIGNMENTS_COLLECTION), toFirestore(newAssignment));
    return { id: docRef.id, ...newAssignment } as AccommodationAssignment;
  } catch (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
};

export const updateAssignment = async (id: string, data: Partial<AccommodationAssignment>): Promise<AccommodationAssignment> => {
  try {
    const docRef = doc(db, ASSIGNMENTS_COLLECTION, id);
    await updateDoc(docRef, toFirestore({ ...data, updatedAt: new Date() }));
    return { id, ...data, updatedAt: new Date() } as AccommodationAssignment;
  } catch (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
};

export const deleteAssignment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ASSIGNMENTS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
};

// Get available beds
export const getAvailableBeds = async (): Promise<Bed[]> => {
  try {
    const querySnapshot = await getDocs(query(collection(db, BEDS_COLLECTION), where('status', '==', 'available')));
    return querySnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Bed[];
  } catch (error) {
    console.error('Error fetching available beds:', error);
    return [];
  }
};

// Get beds by accommodation
export const getBedsByAccommodation = async (accommodationId: string): Promise<Bed[]> => {
  try {
    const floorsQuery = query(collection(db, FLOORS_COLLECTION), where('accommodationId', '==', accommodationId));
    const floorsSnapshot = await getDocs(floorsQuery);
    const floorIds = floorsSnapshot.docs.map(doc => doc.id);
    
    if (floorIds.length === 0) return [];
    
    const roomsQuery = query(collection(db, ROOMS_COLLECTION), where('floorId', 'in', floorIds.length > 10 ? floorIds.slice(0, 10) : floorIds));
    const roomsSnapshot = await getDocs(roomsQuery);
    const roomIds = roomsSnapshot.docs.map(doc => doc.id);
    
    if (roomIds.length === 0) return [];
    
    const bedsQuery = query(collection(db, BEDS_COLLECTION), where('roomId', 'in', roomIds.length > 10 ? roomIds.slice(0, 10) : roomIds));
    const bedsSnapshot = await getDocs(bedsQuery);
    return bedsSnapshot.docs.map(doc => fromFirestore({ id: doc.id, ...doc.data() })) as Bed[];
  } catch (error) {
    console.error('Error fetching beds by accommodation:', error);
    return [];
  }
};
