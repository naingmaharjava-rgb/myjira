import { useState } from 'react';
import type { Task } from '../types';
import { STATUS_LABEL, STATUS_COLOR } from '../types';
import { deleteTask } from '../firebase';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  task: Task;
  onClose: () => void;
}

function formatDate(ts: Task['created_at']) {
  if (!ts) return '—';
  const d = ts.toDate?.() ?? new Date();
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TaskDetailModal({ task, onClose }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteTask(task.id);
    onClose();
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
          <div className="detail-header">
            <h2>{task.title}</h2>
            <span
              className="status-badge"
              style={{ background: STATUS_COLOR[task.status] + '22', color: STATUS_COLOR[task.status] }}
            >
              {STATUS_LABEL[task.status]}
            </span>
          </div>

          <div className="detail-fields">
            <div className="detail-field">
              <span className="detail-label">Description</span>
              <span className="detail-value">{task.description}</span>
            </div>

            {task.commit_hash && (
              <div className="detail-field">
                <span className="detail-label">Commit</span>
                <code className="detail-value mono">{task.commit_hash}</code>
              </div>
            )}

            {task.diagram_url && (
              <div className="detail-field">
                <span className="detail-label">Diagram</span>
                <a href={task.diagram_url} target="_blank" rel="noreferrer" className="detail-link">
                  View Diagram ↗
                </a>
              </div>
            )}

            {task.error_log && (
              <div className="detail-field">
                <span className="detail-label">Last Error</span>
                <pre className="detail-error">{task.error_log}</pre>
              </div>
            )}

            <div className="detail-field">
              <span className="detail-label">Retries</span>
              <span className="detail-value">{task.retry_count ?? 0}</span>
            </div>

            <div className="detail-field">
              <span className="detail-label">Created</span>
              <span className="detail-value">{formatDate(task.created_at)}</span>
            </div>

            <div className="detail-field">
              <span className="detail-label">Task ID</span>
              <code className="detail-value mono small">{task.id}</code>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              🗑 Delete Task
            </button>
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
          confirmLabel="Yes, Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
