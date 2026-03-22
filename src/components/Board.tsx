import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Task, KanbanColumn, Project } from '../types';
import { getTaskColumn } from '../types';
import { moveTask, deleteTask } from '../firebase';
import Column from './Column';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';
import ConfirmDialog from './ConfirmDialog';

const COLUMNS: { id: KanbanColumn; label: string; color: string }[] = [
  { id: 'todo',  label: 'To Do',  color: '#3a7bd5' },
  { id: 'doing', label: 'Doing',  color: '#f59e0b' },
  { id: 'done',  label: 'Done',   color: '#10b981' },
];

interface Props {
  project: Project;
  tasks: Task[];
  onEditProject: () => void;
}

export default function Board({ project, tasks, onEditProject }: Props) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null;

  const tasksByColumn: Record<KanbanColumn, Task[]> = {
    todo:  tasks.filter(t => getTaskColumn(t) === 'todo'),
    doing: tasks.filter(t => getTaskColumn(t) === 'doing'),
    done:  tasks.filter(t => getTaskColumn(t) === 'done'),
  };

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const validColumns: KanbanColumn[] = ['todo', 'doing', 'done'];
    const targetColumn = validColumns.includes(overId as KanbanColumn)
      ? (overId as KanbanColumn)
      : null;

    if (!targetColumn) return;

    const task = tasks.find(t => t.id === taskId);
    if (task && getTaskColumn(task) !== targetColumn) {
      await moveTask(taskId, targetColumn);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteTask(deleteTarget.id);
    setDeleteTarget(null);
    if (viewTask?.id === deleteTarget.id) setViewTask(null);
  }

  return (
    <div className="board-container">
      {/* Board header */}
      <div className="board-header">
        <div className="board-title-row">
          <span className="project-color-dot" style={{ background: project.color }} />
          <h1 className="board-title">{project.name}</h1>
        </div>
        {project.description && (
          <p className="board-desc">{project.description}</p>
        )}
        <div className="board-stats">
          <span>{tasks.length} tasks</span>
          <span>{tasksByColumn.done.length} done</span>
          <span>{tasksByColumn.todo.length} queued</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="board-toolbar">
        <button className="btn-outline" onClick={onEditProject}>
          ✎ Edit Project
        </button>
        <button className="btn-primary" onClick={() => setShowCreateTask(true)}>
          + New Task
        </button>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board">
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              color={col.color}
              tasks={tasksByColumn[col.id]}
              onView={setViewTask}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onView={() => {}}
              onDelete={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={project.id}
          onClose={() => setShowCreateTask(false)}
        />
      )}

      {viewTask && (
        <TaskDetailModal
          task={viewTask}
          onClose={() => setViewTask(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Task"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Yes, Delete"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
