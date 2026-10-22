import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';

const DOCUMENTS_COLLECTION = 'employee_documents';
const ALERTS_COLLECTION = 'document_alerts';

// Get documents about to expire (within 90 days)
export const getExpiringDocuments = async (days = 90) => {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, DOCUMENTS_COLLECTION),
      where('expiryDate', '>=', Timestamp.fromDate(now)),
      where('expiryDate', '<=', Timestamp.fromDate(futureDate))
    );
    
    const querySnapshot = await getDocs(q);
    const expiringDocs: any[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      expiringDocs.push({
        id: doc.id,
        ...data,
        expiryDate: data.expiryDate?.toDate(),
        daysUntilExpiry: Math.ceil(
          (data.expiryDate?.toDate().getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      });
    });
    
    return expiringDocs.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  } catch (error) {
    console.error('Error fetching expiring documents:', error);
    throw error;
  }
};

// Get expired documents
export const getExpiredDocuments = async () => {
  try {
    const now = new Date();
    
    const q = query(
      collection(db, DOCUMENTS_COLLECTION),
      where('expiryDate', '<', Timestamp.fromDate(now))
    );
    
    const querySnapshot = await getDocs(q);
    const expiredDocs: any[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      expiredDocs.push({
        id: doc.id,
        ...data,
        expiryDate: data.expiryDate?.toDate(),
        daysOverdue: Math.ceil(
          (now.getTime() - data.expiryDate?.toDate().getTime()) / (1000 * 60 * 60 * 24)
        )
      });
    });
    
    return expiredDocs.sort((a, b) => b.daysOverdue - a.daysOverdue);
  } catch (error) {
    console.error('Error fetching expired documents:', error);
    throw error;
  }
};

// Create expiry alert
export const createExpiryAlert = async (documentId: string, employeeId: string, alertType: 'warning' | 'urgent' | 'expired') => {
  try {
    await addDoc(collection(db, ALERTS_COLLECTION), {
      documentId,
      employeeId,
      alertType,
      createdAt: Timestamp.now(),
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null
    });
  } catch (error) {
    console.error('Error creating expiry alert:', error);
    throw error;
  }
};

// Get unacknowledged alerts for an employee
export const getUnacknowledgedAlerts = async (employeeId: string) => {
  try {
    const q = query(
      collection(db, ALERTS_COLLECTION),
      where('employeeId', '==', employeeId),
      where('acknowledged', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const alerts: any[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      alerts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      });
    });
    
    return alerts;
  } catch (error) {
    console.error('Error fetching alerts:', error);
    throw error;
  }
};

// Get all active alerts
export const getAllActiveAlerts = async () => {
  try {
    const q = query(
      collection(db, ALERTS_COLLECTION),
      where('acknowledged', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const alerts: any[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      alerts.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate()
      });
    });
    
    return alerts.sort((a, b) => {
      const priorityMap: Record<'urgent' | 'warning' | 'expired', number> = {
        urgent: 1,
        warning: 2,
        expired: 0,
      };
      return priorityMap[a.alertType as 'urgent' | 'warning' | 'expired'] - priorityMap[b.alertType as 'urgent' | 'warning' | 'expired'];
    });
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    throw error;
  }
};

// Acknowledge alert
export const acknowledgeAlert = async (alertId: string, userId: string) => {
  try {
    await updateDoc(doc(db, ALERTS_COLLECTION, alertId), {
      acknowledged: true,
      acknowledgedAt: Timestamp.now(),
      acknowledgedBy: userId
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
};

// Get employee documents with expiry info
export const getEmployeeDocumentsWithStatus = async (employeeId: string) => {
  try {
    const q = query(
      collection(db, DOCUMENTS_COLLECTION),
      where('employeeId', '==', employeeId)
    );
    
    const querySnapshot = await getDocs(q);
    const now = new Date();
    const docs: any[] = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const expiryDate = data.expiryDate?.toDate();
      let status = 'active';
      let daysUntilExpiry = null;
      
      if (expiryDate) {
        daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilExpiry < 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'urgent';
        } else if (daysUntilExpiry <= 90) {
          status = 'warning';
        }
      }
      
      docs.push({
        id: doc.id,
        ...data,
        expiryDate,
        status,
        daysUntilExpiry
      });
    });
    
    return docs;
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    throw error;
  }
};

// Archive document
export const archiveDocument = async (documentId: string) => {
  try {
    await updateDoc(doc(db, DOCUMENTS_COLLECTION, documentId), {
      archived: true,
      archivedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error archiving document:', error);
    throw error;
  }
};

// Get personnel file summary for an employee
export const getPersonnelFileSummary = async (employeeId: string) => {
  try {
    const documents = await getEmployeeDocumentsWithStatus(employeeId);
    const alerts = await getUnacknowledgedAlerts(employeeId);
    
    const summary = {
      totalDocuments: documents.length,
      activeDocuments: documents.filter(d => d.status === 'active').length,
      warningDocuments: documents.filter(d => d.status === 'warning').length,
      urgentDocuments: documents.filter(d => d.status === 'urgent').length,
      expiredDocuments: documents.filter(d => d.status === 'expired').length,
      activeAlerts: alerts.length,
      documents,
      alerts
    };
    
    return summary;
  } catch (error) {
    console.error('Error fetching personnel file summary:', error);
    throw error;
  }
};
