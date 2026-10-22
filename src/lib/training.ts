import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  TrainingNeedsAnalysis,
  TrainingCourse,
  TrainingSession,
  TrainingNomination,
  TrainingAttendance,
  TrainingAssessment,
  TrainingEvaluation,
  TrainingCertificate,
  TrainingBudgetEntry,
  TrainingVendor,
  TrainingNotification,
  TrainingReportSummary,
} from '../types';

const TRAINING_NEEDS_COLLECTION = 'training_needs_analysis';
const TRAINING_COURSES_COLLECTION = 'training_courses';
const TRAINING_SESSIONS_COLLECTION = 'training_sessions';
const TRAINING_NOMINATIONS_COLLECTION = 'training_nominations';
const TRAINING_ATTENDANCE_COLLECTION = 'training_attendance';
const TRAINING_ASSESSMENTS_COLLECTION = 'training_assessments';
const TRAINING_EVALUATIONS_COLLECTION = 'training_evaluations';
const TRAINING_CERTIFICATES_COLLECTION = 'training_certificates';
const TRAINING_BUDGET_COLLECTION = 'training_budget';
const TRAINING_VENDORS_COLLECTION = 'training_vendors';
const TRAINING_NOTIFICATIONS_COLLECTION = 'training_notifications';

const mapTimestampFields = <T extends Record<string, any>>(data: T): T => {
  const normalized: Record<string, any> = { ...data };
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (value && typeof value.toDate === 'function') {
      normalized[key] = value.toDate();
    }
    if (Array.isArray(value)) {
      normalized[key] = value.map((item) =>
        item && typeof item.toDate === 'function' ? item.toDate() : item,
      );
    }
  });
  return normalized as T;
};

export const getTrainingNeedsAnalysis = async (): Promise<TrainingNeedsAnalysis[]> => {
  const q = query(collection(db, TRAINING_NEEDS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingNeedsAnalysis[];
};

export const createTrainingNeedsAnalysis = async (entry: Partial<TrainingNeedsAnalysis>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_NEEDS_COLLECTION), {
    ...entry,
    status: entry.status || 'draft',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingCourses = async (): Promise<TrainingCourse[]> => {
  const q = query(collection(db, TRAINING_COURSES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingCourse[];
};

export const createTrainingCourse = async (course: Partial<TrainingCourse>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_COURSES_COLLECTION), {
    ...course,
    status: course.status || 'draft',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingSessions = async (): Promise<TrainingSession[]> => {
  const q = query(collection(db, TRAINING_SESSIONS_COLLECTION), orderBy('sessionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingSession[];
};

export const createTrainingSession = async (session: Partial<TrainingSession>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_SESSIONS_COLLECTION), {
    ...session,
    status: session.status || 'planned',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingNominations = async (): Promise<TrainingNomination[]> => {
  const q = query(collection(db, TRAINING_NOMINATIONS_COLLECTION), orderBy('submittedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingNomination[];
};

export const submitTrainingNomination = async (nomination: Partial<TrainingNomination>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_NOMINATIONS_COLLECTION), {
    ...nomination,
    status: nomination.status || 'pending',
    submittedAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingAttendanceRecords = async (): Promise<TrainingAttendance[]> => {
  const q = query(collection(db, TRAINING_ATTENDANCE_COLLECTION), orderBy('sessionDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingAttendance[];
};

export const markTrainingAttendance = async (attendanceId: string, status: TrainingAttendance['status']) => {
  await updateDoc(doc(db, TRAINING_ATTENDANCE_COLLECTION, attendanceId), {
    status,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const getTrainingAssessments = async (): Promise<TrainingAssessment[]> => {
  const q = query(collection(db, TRAINING_ASSESSMENTS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingAssessment[];
};

export const submitTrainingAssessment = async (assessment: Partial<TrainingAssessment>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_ASSESSMENTS_COLLECTION), {
    ...assessment,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingEvaluations = async (): Promise<TrainingEvaluation[]> => {
  const q = query(collection(db, TRAINING_EVALUATIONS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingEvaluation[];
};

export const submitTrainingEvaluation = async (evaluation: Partial<TrainingEvaluation>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_EVALUATIONS_COLLECTION), {
    ...evaluation,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingCertificates = async (): Promise<TrainingCertificate[]> => {
  const q = query(collection(db, TRAINING_CERTIFICATES_COLLECTION), orderBy('issuedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingCertificate[];
};

export const issueTrainingCertificate = async (certificate: Partial<TrainingCertificate>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_CERTIFICATES_COLLECTION), {
    ...certificate,
    certificateNumber: certificate.certificateNumber || `CERT-${Date.now()}`,
    issuedAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingBudgetEntries = async (): Promise<TrainingBudgetEntry[]> => {
  const q = query(collection(db, TRAINING_BUDGET_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingBudgetEntry[];
};

export const addTrainingBudgetEntry = async (entry: Partial<TrainingBudgetEntry>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_BUDGET_COLLECTION), {
    ...entry,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingVendors = async (): Promise<TrainingVendor[]> => {
  const q = query(collection(db, TRAINING_VENDORS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingVendor[];
};

export const addTrainingVendor = async (vendor: Partial<TrainingVendor>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, TRAINING_VENDORS_COLLECTION), {
    ...vendor,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getTrainingNotifications = async (): Promise<TrainingNotification[]> => {
  const q = query(collection(db, TRAINING_NOTIFICATIONS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as TrainingNotification[];
};

export const getTrainingReportSummary = async (): Promise<TrainingReportSummary> => {
  const [needs, courses, sessions, nominations, attendance, assessments, evaluations, certificates, budgets, vendors, notifications] = await Promise.all([
    getTrainingNeedsAnalysis(),
    getTrainingCourses(),
    getTrainingSessions(),
    getTrainingNominations(),
    getTrainingAttendanceRecords(),
    getTrainingAssessments(),
    getTrainingEvaluations(),
    getTrainingCertificates(),
    getTrainingBudgetEntries(),
    getTrainingVendors(),
    getTrainingNotifications(),
  ]);

  return {
    needsAnalysisCount: needs.length,
    coursesCount: courses.length,
    sessionsCount: sessions.length,
    nominationsCount: nominations.length,
    attendanceRecordsCount: attendance.length,
    assessmentsCount: assessments.length,
    evaluationsCount: evaluations.length,
    certificatesCount: certificates.length,
    budgetEntriesCount: budgets.length,
    vendorsCount: vendors.length,
    notificationsCount: notifications.length,
  };
};
