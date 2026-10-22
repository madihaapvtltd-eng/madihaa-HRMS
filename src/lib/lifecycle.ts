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
  ExitInterview,
  OffboardingTask,
  LifecycleEvent,
  LifecycleReportSummary,
} from '../types';

const EXIT_INTERVIEWS_COLLECTION = 'exit_interviews';
const OFFBOARDING_TASKS_COLLECTION = 'offboarding_tasks';
const LIFECYCLE_EVENTS_COLLECTION = 'lifecycle_events';

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

export const getExitInterviews = async (): Promise<ExitInterview[]> => {
  const q = query(collection(db, EXIT_INTERVIEWS_COLLECTION), orderBy('interviewDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as ExitInterview[];
};

export const submitExitInterview = async (interview: Partial<ExitInterview>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, EXIT_INTERVIEWS_COLLECTION), {
    ...interview,
    status: interview.status || 'pending',
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getOffboardingTasks = async (): Promise<OffboardingTask[]> => {
  const q = query(collection(db, OFFBOARDING_TASKS_COLLECTION), orderBy('dueDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as OffboardingTask[];
};

export const createOffboardingTask = async (task: Partial<OffboardingTask>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, OFFBOARDING_TASKS_COLLECTION), {
    ...task,
    completed: task.completed || false,
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const completeOffboardingTask = async (taskId: string) => {
  await updateDoc(doc(db, OFFBOARDING_TASKS_COLLECTION, taskId), {
    completed: true,
    completedAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  });
};

export const getLifecycleEvents = async (): Promise<LifecycleEvent[]> => {
  const q = query(collection(db, LIFECYCLE_EVENTS_COLLECTION), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...mapTimestampFields(docSnap.data() as any) })) as LifecycleEvent[];
};

export const recordLifecycleEvent = async (event: Partial<LifecycleEvent>) => {
  const now = new Date();
  const docRef = await addDoc(collection(db, LIFECYCLE_EVENTS_COLLECTION), {
    ...event,
    createdAt: Timestamp.fromDate(now),
  });
  return docRef.id;
};

export const getLifecycleReportSummary = async (): Promise<LifecycleReportSummary> => {
  const [interviews, tasks, events] = await Promise.all([
    getExitInterviews(),
    getOffboardingTasks(),
    getLifecycleEvents(),
  ]);
  const completedTaskCount = tasks.filter((task) => task.completed).length;

  return {
    exitInterviewCount: interviews.length,
    offboardingTaskCount: tasks.length,
    completedTaskCount,
    lifecycleEventCount: events.length,
  };
};
