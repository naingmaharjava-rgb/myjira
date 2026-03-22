import type { Project, Task } from '../types';

interface Props {
  projects: Project[];
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
}

export default function Sidebar({
  projects,
  tasks,
  selectedId,
  onSelect,
  onCreateProject,
  onEditProject,
  onDeleteProject,
}: Props) {
  function taskCount(projectId: string) {
    return tasks.filter(t => t.project_id === projectId).length;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">MyPA</span>
        </div>
        <p className="logo-sub">Automation Pipeline</p>
      </div>

      <div className="sidebar-section-title">Projects</div>

      <nav className="project-list">
        {projects.length === 0 && (
          <p className="sidebar-empty">No projects yet</p>
        )}
        {projects.map(project => (
          <div
            key={project.id}
            className={`project-item ${selectedId === project.id ? 'active' : ''}`}
            onClick={() => onSelect(project.id)}
          >
            <span className="project-dot" style={{ background: project.color }} />

            <div className="project-item-info">
              <span className="project-item-name">{project.name}</span>
              <span className="project-item-count">
                {taskCount(project.id)} tasks
                {project.detail_md && <span className="project-md-badge" title="Has AI context">·doc</span>}
              </span>
            </div>

            {/* Action buttons — shown on hover */}
            <div className="project-item-actions">
              <button
                className="project-action-btn"
                title="Edit project"
                onClick={e => { e.stopPropagation(); onEditProject(project); }}
              >
                ✎
              </button>
              <button
                className="project-action-btn danger"
                title="Delete project"
                onClick={e => { e.stopPropagation(); onDeleteProject(project); }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </nav>

      <button className="sidebar-new-btn" onClick={onCreateProject}>
        + New Project
      </button>

      <div className="sidebar-footer">
        <button
          className="sidebar-action-btn"
          onClick={async () => {
            const res = await fetch('/api/tasks/export?status=done');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tasks-export.json';
            a.click();
          }}
        >
          📤 Export API
        </button>
        <button
          className="sidebar-action-btn"
          onClick={async () => {
            const taskId = tasks[0]?.id;
            if (!taskId) {
              alert('No tasks found to update');
              return;
            }
            const res = await fetch('/api/tasks/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'move', taskId, nextStatus: 'doing' }),
            });
            const result = await res.json();
            alert(JSON.stringify(result, null, 2));
          }}
        >
          🔄 Update API
        </button>
      </div>
    </aside>
  );
}
