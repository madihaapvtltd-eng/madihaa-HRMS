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
  PerformanceCycle,
  AppraisalTemplate,
  PerformanceReview,
  AppraisalAssignment,
  ReviewWorkflow,
  ReviewRating,
  PerformanceReportSummary,
} from '../types';

const PERFORMANCE_CYCLES_COLLECTION = 'performance_cycles';
const APPRAISAL_TEMPLATES_COLLECTION = 'appraisal_templates';
const PERFORMANCE_REVIEWS_COLLECTION = 'performance_reviews';
const APPRAISAL_ASSIGNMENTS_COLLECTION = 'appraisal_assignments';
const REVIEW_WORKFLOWS_COLLECTION = 'review_workflows';
const REVIEW_RATINGS_COLLECTION = 'review_ratings';

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

export const getPerformanceCycles = async (): Promise<PerformanceCycle[]> => {
  const q = query(collection(db, PERFORMANCE_CYCLES_COLLECTION), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as PerformanceCycle[];
};

export const createPerformanceCycle = async (cycle: Partial<PerformanceCycle>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, PERFORMANCE_CYCLES_COLLECTION), {
    ...cycle,
    status: cycle.status || 'draft',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getAppraisalTemplates = async (): Promise<AppraisalTemplate[]> => {
  const q = query(collection(db, APPRAISAL_TEMPLATES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as AppraisalTemplate[];
};

export const createAppraisalTemplate = async (template: Partial<AppraisalTemplate>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, APPRAISAL_TEMPLATES_COLLECTION), {
    ...template,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getPerformanceReviews = async (): Promise<PerformanceReview[]> => {
  const q = query(collection(db, PERFORMANCE_REVIEWS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as PerformanceReview[];
};

export const submitPerformanceReview = async (review: Partial<PerformanceReview>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, PERFORMANCE_REVIEWS_COLLECTION), {
    ...review,
    status: review.status || 'draft',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const updatePerformanceReviewStatus = async (reviewId: string, status: PerformanceReview['status']) => {
  await updateDoc(doc(db, PERFORMANCE_REVIEWS_COLLECTION, reviewId), {
    status,
    updatedAt: Timestamp.fromDate(new Date()),
    reviewedAt: status === 'reviewed' ? Timestamp.fromDate(new Date()) : undefined,
  });
};

export const getAppraisalAssignments = async (): Promise<AppraisalAssignment[]> => {
  const q = query(collection(db, APPRAISAL_ASSIGNMENTS_COLLECTION), orderBy('assignedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as AppraisalAssignment[];
};

export const getReviewWorkflows = async (): Promise<ReviewWorkflow[]> => {
  const q = query(collection(db, REVIEW_WORKFLOWS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as ReviewWorkflow[];
};

export const getReviewRatings = async (): Promise<ReviewRating[]> => {
  const q = query(collection(db, REVIEW_RATINGS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as ReviewRating[];
};

export const getPerformanceReportSummary = async (): Promise<PerformanceReportSummary> => {
  const [cycles, templates, reviews, assignments, workflows, ratings] = await Promise.all([
    getPerformanceCycles(),
    getAppraisalTemplates(),
    getPerformanceReviews(),
    getAppraisalAssignments(),
    getReviewWorkflows(),
    getReviewRatings(),
  ]);

  return {
    cycleCount: cycles.length,
    templateCount: templates.length,
    reviewCount: reviews.length,
    assignmentCount: assignments.length,
    workflowCount: workflows.length,
    ratingCount: ratings.length,
  };
};
