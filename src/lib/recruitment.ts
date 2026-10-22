import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  JobRequisition,
  Vacancy,
  CandidateApplication,
  InterviewSchedule,
  Offer,
  OnboardingTask,
  RecruitmentAuditLog,
  RecruitmentReportSummary
} from '../types';

const REQUISITIONS_COLLECTION = 'job_requisitions';
const VACANCIES_COLLECTION = 'vacancies';
const APPLICATIONS_COLLECTION = 'candidate_applications';
const INTERVIEWS_COLLECTION = 'interview_schedules';
const OFFERS_COLLECTION = 'offers';
const ONBOARDING_COLLECTION = 'onboarding_tasks';
const AUDIT_LOG_COLLECTION = 'recruitment_audit_logs';

const mapTimestampFields = <T extends Record<string, any>>(data: T): T => {
  const normalized: Record<string, any> = { ...data };
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (value && typeof value.toDate === 'function') {
      normalized[key] = value.toDate();
    }
    if (Array.isArray(value)) {
      normalized[key] = value.map((item) => (item && typeof item.toDate === 'function' ? item.toDate() : item));
    }
  });
  return normalized as T;
};

export const getJobRequisitions = async (): Promise<JobRequisition[]> => {
  const q = query(collection(db, REQUISITIONS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...mapTimestampFields(docSnap.data() as any),
  })) as JobRequisition[];
};

export const createJobRequisition = async (requisition: Partial<JobRequisition>) => {
  const now = new Date();
  const newRequisition: Partial<JobRequisition> = {
    ...requisition,
    requisitionNumber: requisition.requisitionNumber || `REQ-${Date.now()}`,
    status: 'draft',
    vacancyCount: requisition.vacancyCount || 1,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, REQUISITIONS_COLLECTION), {
    ...newRequisition,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateJobRequisition = async (id: string, updates: Partial<JobRequisition>) => {
  const now = new Date();
  const updateData: any = {
    ...updates,
    updatedAt: Timestamp.fromDate(now),
  };
  await updateDoc(doc(db, REQUISITIONS_COLLECTION, id), updateData);
};

export const changeJobRequisitionStatus = async (id: string, status: JobRequisition['status'], comment?: string) => {
  await updateJobRequisition(id, { status });
  await addRecruitmentAuditLog({
    entityId: id,
    entityType: 'requisition',
    action: `status:${status}`,
    details: comment || `Status changed to ${status}`,
    performedAt: new Date(),
  });
};

export const getVacancies = async (): Promise<Vacancy[]> => {
  const q = query(collection(db, VACANCIES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...mapTimestampFields(docSnap.data() as any),
  })) as Vacancy[];
};

export const createVacancy = async (vacancy: Partial<Vacancy>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, VACANCIES_COLLECTION), {
    ...vacancy,
    status: 'draft',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updateVacancy = async (id: string, updates: Partial<Vacancy>) => {
  const now = new Date();
  await updateDoc(doc(db, VACANCIES_COLLECTION, id), {
    ...updates,
    updatedAt: Timestamp.fromDate(now),
  });
};

export const publishVacancy = async (id: string) => {
  await updateVacancy(id, { status: 'published' });
  await addRecruitmentAuditLog({
    entityId: id,
    entityType: 'vacancy',
    action: 'publish',
    details: 'Vacancy published to career portal',
    performedAt: new Date(),
  });
};

export const closeVacancy = async (id: string) => {
  await updateVacancy(id, { status: 'closed' });
  await addRecruitmentAuditLog({
    entityId: id,
    entityType: 'vacancy',
    action: 'close',
    details: 'Vacancy closed',
    performedAt: new Date(),
  });
};

export const getCandidateApplications = async (): Promise<CandidateApplication[]> => {
  const q = query(collection(db, APPLICATIONS_COLLECTION), orderBy('submittedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...mapTimestampFields(docSnap.data() as any),
  })) as CandidateApplication[];
};

export const submitCandidateApplication = async (application: Partial<CandidateApplication>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, APPLICATIONS_COLLECTION), {
    ...application,
    status: 'submitted',
    submittedAt: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  await addRecruitmentAuditLog({
    entityId: docRef.id,
    entityType: 'application',
    action: 'submit',
    details: 'Candidate application submitted',
    performedAt: new Date(),
  });
  return docRef.id;
};

export const updateCandidateApplicationStatus = async (id: string, status: CandidateApplication['status']) => {
  await updateDoc(doc(db, APPLICATIONS_COLLECTION, id), {
    status,
    updatedAt: Timestamp.fromDate(new Date()),
  });
  await addRecruitmentAuditLog({
    entityId: id,
    entityType: 'application',
    action: `status:${status}`,
    details: `Application status changed to ${status}`,
    performedAt: new Date(),
  });
};

export const scheduleInterview = async (interview: Partial<InterviewSchedule>) => {
  const docRef = await addDoc(collection(db, INTERVIEWS_COLLECTION), {
    ...interview,
    status: interview.status || 'scheduled',
    createdAt: Timestamp.fromDate(new Date()),
  });
  await addRecruitmentAuditLog({
    entityId: docRef.id,
    entityType: 'interview',
    action: 'schedule',
    details: 'Interview scheduled',
    performedAt: new Date(),
  });
  return docRef.id;
};

export const updateInterviewStatus = async (id: string, status: InterviewSchedule['status']) => {
  await updateDoc(doc(db, INTERVIEWS_COLLECTION, id), {
    status,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const getInterviews = async (): Promise<InterviewSchedule[]> => {
  const q = query(collection(db, INTERVIEWS_COLLECTION), orderBy('scheduledAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...mapTimestampFields(docSnap.data() as any),
  })) as InterviewSchedule[];
};

export const createOffer = async (offer: Partial<Offer>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, OFFERS_COLLECTION), {
    ...offer,
    status: 'draft',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getOffers = async (): Promise<Offer[]> => {
  const q = query(collection(db, OFFERS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...mapTimestampFields(docSnap.data() as any),
  })) as Offer[];
};

export const updateOfferStatus = async (id: string, status: Offer['status']) => {
  await updateDoc(doc(db, OFFERS_COLLECTION, id), {
    status,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const getOnboardingTasks = async (): Promise<OnboardingTask[]> => {
  const q = query(collection(db, ONBOARDING_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...mapTimestampFields(docSnap.data() as any),
  })) as OnboardingTask[];
};

export const createOnboardingTask = async (task: Partial<OnboardingTask>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, ONBOARDING_COLLECTION), {
    ...task,
    completed: false,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  await addRecruitmentAuditLog({
    entityId: docRef.id,
    entityType: 'onboarding',
    action: 'create',
    details: 'Onboarding task created',
    performedAt: new Date(),
  });
  return docRef.id;
};

export const completeOnboardingTask = async (id: string) => {
  await updateDoc(doc(db, ONBOARDING_COLLECTION, id), {
    completed: true,
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const addRecruitmentAuditLog = async (log: Partial<RecruitmentAuditLog>) => {
  const now = new Date();
  await addDoc(collection(db, AUDIT_LOG_COLLECTION), {
    ...log,
    performedAt: Timestamp.fromDate(log.performedAt || now),
  });
};

export const getRecruitmentReportSummary = async (): Promise<RecruitmentReportSummary> => {
  const [requisitions, vacancies, applications, interviews, offers, onboarding] = await Promise.all([
    getJobRequisitions(),
    getVacancies(),
    getCandidateApplications(),
    getInterviews(),
    getOffers(),
    getOnboardingTasks(),
  ]);

  return {
    requisitions: requisitions.length,
    vacancies: vacancies.length,
    applications: applications.length,
    interviews: interviews.length,
    offers: offers.length,
    onboardingTasks: onboarding.length,
  };
};
