import { useDroppable } from '@dnd-kit/core';
import type { Task, KanbanColumn as KanbanColumnType } from '../types';
import TaskCard from './TaskCard';

interface Props {
  id: KanbanColumnType;
  label: string;
  color: string;
  tasks: Task[];
  onView: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function Column({ id, label, color, tasks, onView, onDelete }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className={`column ${isOver ? 'drop-over' : ''}`}>
      <div className="column-header">
        <span className="column-dot" style={{ background: color }} />
        <span className="column-title">{label}</span>
        <span className="column-count">{tasks.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className="column-body"
        style={{ borderColor: isOver ? color : 'transparent' }}
      >
        {tasks.length === 0 ? (
          <div className="column-empty">
            {isOver ? 'Drop here' : 'No tasks'}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onView={onView}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
