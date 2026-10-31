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
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { OvertimeRequest } from '../types';

const OVERTIME_COLLECTION = 'overtime_requests';

// Overtime functions
export const getOvertimeRequests = async (employeeId?: string) => {
  try {
    let q = query(collection(db, OVERTIME_COLLECTION), orderBy('requestedDate', 'desc'));
    
    if (employeeId) {
      q = query(q, where('employeeId', '==', employeeId));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
      requestedDate: doc.data().requestedDate.toDate(),
      requestType: doc.data().requestType || 'planned',
      requiresDivisionHeadApproval: doc.data().requiresDivisionHeadApproval || false,
      preApproved: doc.data().preApproved || false,
      biometricVarianceMinutes: doc.data().biometricVarianceMinutes || 0,
      approvals: doc.data().approvals?.map((approval: any) => ({
        ...approval,
        actionDate: approval.actionDate?.toDate()
      }))
    })) as OvertimeRequest[];
  } catch (error) {
    console.error('Error fetching overtime requests:', error);
    throw error;
  }
};

export const getOvertimeRequestById = async (id: string) => {
  try {
    const docRef = doc(db, OVERTIME_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        date: data.date.toDate(),
        requestedDate: data.requestedDate.toDate(),
        requestType: data.requestType || 'planned',
        requiresDivisionHeadApproval: data.requiresDivisionHeadApproval || false,
        preApproved: data.preApproved || false,
        biometricVarianceMinutes: data.biometricVarianceMinutes || 0,
        approvals: data.approvals?.map((approval: any) => ({
          ...approval,
          actionDate: approval.actionDate?.toDate()
        }))
      } as OvertimeRequest;
    }
    return null;
  } catch (error) {
    console.error('Error fetching overtime request:', error);
    throw error;
  }
};

export const createOvertimeRequest = async (overtimeRequest: Partial<OvertimeRequest>) => {
  try {
    const newRequest = {
      ...overtimeRequest,
      status: 'pending',
      requestType: overtimeRequest.requestType || 'planned',
      requiresDivisionHeadApproval: overtimeRequest.requestType === 'emergency',
      preApproved: overtimeRequest.preApproved || false,
      biometricVarianceMinutes: overtimeRequest.biometricVarianceMinutes || 0,
      requestedDate: new Date(),
      approvals: [],
    };
    
    const docRef = await addDoc(collection(db, OVERTIME_COLLECTION), {
      ...newRequest,
      date: Timestamp.fromDate(newRequest.date!),
      requestedDate: Timestamp.fromDate(newRequest.requestedDate),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating overtime request:', error);
    throw error;
  }
};

export const updateOvertimeRequest = async (id: string, data: Partial<OvertimeRequest>) => {
  try {
    const updateData: any = { ...data };
    
    if (updateData.date && updateData.date instanceof Date) {
      updateData.date = Timestamp.fromDate(updateData.date);
    }
    
    await updateDoc(doc(db, OVERTIME_COLLECTION, id), updateData);
  } catch (error) {
    console.error('Error updating overtime request:', error);
    throw error;
  }
};

export const approveOvertimeRequest = async (id: string, approverId: string, approverName: string, comments?: string) => {
  try {
    const request = await getOvertimeRequestById(id);
    if (!request) throw new Error('Overtime request not found');

    const updatedApprovals = request.approvals || [];
    const approval: any = {
      approverId,
      approverName,
      status: 'approved',
      actionDate: new Date(),
    };
    if (comments) {
      approval.comments = comments;
    }
    updatedApprovals.push(approval);

    await updateOvertimeRequest(id, {
      approvals: updatedApprovals,
      status: 'approved',
    });
  } catch (error) {
    console.error('Error approving overtime request:', error);
    throw error;
  }
};

export const rejectOvertimeRequest = async (id: string, approverId: string, approverName: string, comments?: string) => {
  try {
    const request = await getOvertimeRequestById(id);
    if (!request) throw new Error('Overtime request not found');

    const updatedApprovals = request.approvals || [];
    const approval: any = {
      approverId,
      approverName,
      status: 'rejected',
      actionDate: new Date(),
    };
    if (comments) {
      approval.comments = comments;
    }
    updatedApprovals.push(approval);

    await updateOvertimeRequest(id, {
      approvals: updatedApprovals,
      status: 'rejected',
    });
  } catch (error) {
    console.error('Error rejecting overtime request:', error);
    throw error;
  }
};

export const completeOvertimeRequest = async (id: string) => {
  try {
    await updateOvertimeRequest(id, { status: 'completed' });
  } catch (error) {
    console.error('Error completing overtime request:', error);
    throw error;
  }
};

export const deleteOvertimeRequest = async (id: string) => {
  try {
    await deleteDoc(doc(db, OVERTIME_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting overtime request:', error);
    throw error;
  }
};

// Get pending overtime requests for approver
export const getPendingOvertimeRequests = async () => {
  try {
    const requests = await getOvertimeRequests();
    return requests.filter(request => 
      request.status === 'pending' && 
      (!request.approvals || request.approvals.length === 0)
    );
  } catch (error) {
    console.error('Error fetching pending overtime requests:', error);
    throw error;
  }
};

// Get overtime summary for a period
export const getOvertimeSummary = async (startDate: Date, endDate: Date, employeeId?: string) => {
  try {
    const requests = await getOvertimeRequests(employeeId);
    
    const filteredRequests = requests.filter(request => {
      const requestDate = new Date(request.date);
      return requestDate >= startDate && requestDate <= endDate;
    });
    
    const summary = {
      totalRequests: filteredRequests.length,
      totalHours: filteredRequests.reduce((sum, r) => sum + r.hours, 0),
      approvedHours: filteredRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.hours, 0),
      pendingHours: filteredRequests.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.hours, 0),
      rejectedHours: filteredRequests.filter(r => r.status === 'rejected').reduce((sum, r) => sum + r.hours, 0),
      completedHours: filteredRequests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.hours, 0),
      publicHolidayHours: filteredRequests
        .filter(r => r.requestType === 'public_holiday')
        .reduce((sum, r) => sum + r.hours, 0),
    };
    
    return summary;
  } catch (error) {
    console.error('Error fetching overtime summary:', error);
    throw error;
  }
};

export const calculateOvertimeRate = (basicSalary: number, hours: number, requestType: 'planned' | 'emergency' | 'public_holiday' = 'planned') => {
  const hourlyRate = basicSalary / 173.33;
  let premium = 1;

  if (requestType === 'public_holiday') {
    premium = 1.5;
  }

  return hourlyRate * hours * premium;
};

export const validateOvertimeRequest = (request: Partial<OvertimeRequest>) => {
  const errors: string[] = [];

  if (!request.date || !(request.date instanceof Date) || isNaN(request.date.getTime())) {
    errors.push('Overtime date is required and must be valid.');
  }
  if (!request.hours || request.hours <= 0) {
    errors.push('Overtime hours must be greater than zero.');
  }
  if (request.hours && request.hours > 85) {
    errors.push('Overtime cannot exceed 85 hours per month.');
  }
  if (request.requestType === 'planned' && request.hours && request.hours > 60) {
    errors.push('Planned overtime cannot exceed 60 hours.');
  }
  if (request.requestType === 'emergency' && !request.requiresDivisionHeadApproval) {
    errors.push('Emergency overtime requires Division Head approval.');
  }
  return errors;
};

export const calculateHoursBetweenTimes = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(startHours, startMinutes, 0, 0);
  const endDate = new Date();
  endDate.setHours(endHours, endMinutes, 0, 0);
  const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return diff > 0 ? Number(diff.toFixed(2)) : 0;
};

export const validateBiometricVariance = (recordedMinutes: number, requestedMinutes: number) => {
  const variance = Math.abs(recordedMinutes - requestedMinutes);
  return variance <= 3;
};

export const getOvertimeRequestPremium = (requestType: 'planned' | 'emergency' | 'public_holiday') => {
  if (requestType === 'public_holiday') return 1.5;
  return 1;
};
