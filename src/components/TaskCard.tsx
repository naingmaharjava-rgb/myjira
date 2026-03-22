import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../types';
import { STATUS_LABEL, STATUS_COLOR } from '../types';

interface Props {
  task: Task;
  onView: (task: Task) => void;
  onDelete: (task: Task) => void;
  isDragOverlay?: boolean;
}

function formatDate(ts: Task['created_at']) {
  if (!ts) return '';
  const d = ts.toDate?.() ?? new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TaskCard({ task, onView, onDelete, isDragOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragOverlay ? 'grabbing' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''} ${isDragOverlay ? 'drag-overlay' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="task-card-inner" onClick={e => { e.stopPropagation(); onView(task); }}>
        <div className="task-card-top">
          <p className="task-title">{task.title}</p>
          <button
            className="task-delete-btn"
            title="Delete task"
            onClick={e => { e.stopPropagation(); onDelete(task); }}
          >
            ×
          </button>
        </div>

        <p className="task-desc">{task.description}</p>

        {task.commit_hash && (
          <p className="task-commit">🔗 {task.commit_hash}</p>
        )}

        <div className="task-card-footer">
          <span
            className="status-badge"
            style={{
              background: STATUS_COLOR[task.status] + '22',
              color: STATUS_COLOR[task.status],
            }}
          >
            {STATUS_LABEL[task.status]}
          </span>
          <span className="task-date">{formatDate(task.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
