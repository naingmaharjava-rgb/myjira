import type { Timestamp } from 'firebase/firestore';

export type KanbanColumn = 'todo' | 'doing' | 'done';

export type TaskStatus =
  | 'QUEUED'
  | 'GENERATING_PROPOSAL'
  | 'AWAITING_DIAGRAM_APPROVAL'
  | 'GENERATING_CODE'
  | 'RUNNING_TESTS'
  | 'SELF_CORRECTING'
  | 'AWAITING_COMMIT_APPROVAL'
  | 'COMMITTING'
  | 'DONE'
  | 'FAILED'
  | 'REJECTED';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  detail_md: string;       // AI context — full project spec in Markdown
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  kanban_column: KanbanColumn;
  approval_status: string;
  diagram_url: string | null;
  proposal_md: string | null;
  error_log: string | null;
  retry_count: number;
  commit_hash: string | null;
  created_at: Timestamp | null;
  updated_at: Timestamp | null;
}

// Maps pipeline status → kanban column (fallback when kanban_column field is missing)
export const STATUS_TO_COLUMN: Record<TaskStatus, KanbanColumn> = {
  QUEUED: 'todo',
  GENERATING_PROPOSAL: 'doing',
  AWAITING_DIAGRAM_APPROVAL: 'doing',
  GENERATING_CODE: 'doing',
  RUNNING_TESTS: 'doing',
  SELF_CORRECTING: 'doing',
  AWAITING_COMMIT_APPROVAL: 'doing',
  COMMITTING: 'doing',
  DONE: 'done',
  FAILED: 'todo',
  REJECTED: 'todo',
};

export function getTaskColumn(task: Task): KanbanColumn {
  return task.kanban_column ?? STATUS_TO_COLUMN[task.status] ?? 'todo';
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  QUEUED: 'Queued',
  GENERATING_PROPOSAL: 'Generating Proposal',
  AWAITING_DIAGRAM_APPROVAL: 'Awaiting Approval',
  GENERATING_CODE: 'Coding',
  RUNNING_TESTS: 'Running Tests',
  SELF_CORRECTING: 'Self-Correcting',
  AWAITING_COMMIT_APPROVAL: 'Awaiting Commit',
  COMMITTING: 'Committing',
  DONE: 'Done',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  QUEUED: '#60a5fa',
  GENERATING_PROPOSAL: '#fbbf24',
  AWAITING_DIAGRAM_APPROVAL: '#a78bfa',
  GENERATING_CODE: '#fbbf24',
  RUNNING_TESTS: '#34d399',
  SELF_CORRECTING: '#f87171',
  AWAITING_COMMIT_APPROVAL: '#818cf8',
  COMMITTING: '#818cf8',
  DONE: '#34d399',
  FAILED: '#f87171',
  REJECTED: '#9ca3af',
};

export const PROJECT_COLORS = [
  '#6c63ff', '#3a7bd5', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];
