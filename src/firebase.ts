import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import type { Project, Task, KanbanColumn } from './types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ─── Projects ─────────────────────────────────────────────────────────────────

export function subscribeProjects(callback: (projects: Project[]) => void) {
  // Sort client-side to avoid needing a Firestore index on created_at
  return onSnapshot(collection(db, 'projects'), snapshot => {
    const projects = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as Project))
      .sort((a, b) => {
        const ta = a.created_at?.toMillis?.() ?? 0;
        const tb = b.created_at?.toMillis?.() ?? 0;
        return tb - ta; // newest first
      });
    callback(projects);
  });
}

export async function createProject(data: {
  name: string;
  description: string;
  color: string;
  detail_md: string;
}) {
  const ref = await addDoc(collection(db, 'projects'), {
    ...data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  await updateDoc(ref, { id: ref.id });
  return ref.id;
}

export async function updateProject(
  projectId: string,
  data: { name: string; description: string; color: string; detail_md: string },
) {
  await updateDoc(doc(db, 'projects', projectId), {
    ...data,
    updated_at: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, 'projects', projectId));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function subscribeTasks(
  projectId: string,
  callback: (tasks: Task[]) => void,
) {
  // No orderBy here — Firestore composite index not required this way.
  // We sort client-side after receiving the snapshot.
  const q = query(
    collection(db, 'tasks'),
    where('project_id', '==', projectId),
  );
  return onSnapshot(q, snapshot => {
    const tasks = snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as Task))
      .sort((a, b) => {
        const ta = a.created_at?.toMillis?.() ?? 0;
        const tb = b.created_at?.toMillis?.() ?? 0;
        return tb - ta; // newest first
      });
    callback(tasks);
  });
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description: string;
}) {
  const id = crypto.randomUUID();
  await setDoc(doc(db, 'tasks', id), {
    id,
    project_id: data.projectId,
    title: data.title,
    description: data.description,
    status: 'QUEUED',
    kanban_column: 'todo',
    approval_status: 'pending',
    diagram_url: null,
    proposal_md: null,
    error_log: null,
    retry_count: 0,
    commit_hash: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return id;
}

export async function moveTask(taskId: string, column: KanbanColumn) {
  await updateDoc(doc(db, 'tasks', taskId), {
    kanban_column: column,
    updated_at: serverTimestamp(),
  });
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, 'tasks', taskId));
}
