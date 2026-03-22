'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Project, Task } from '../src/types';
import { subscribeProjects, subscribeTasks, deleteProject } from '../src/firebase';
import Sidebar from '../src/components/Sidebar';
import Board from '../src/components/Board';
import ProjectModal from '../src/components/ProjectModal';
import ConfirmDialog from '../src/components/ConfirmDialog';
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // null = closed, 'create' = create mode, Project = edit mode
  const [projectModal, setProjectModal] = useState<null | 'create' | Project>(null);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<Project | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to all projects
  useEffect(() => {
    const unsub = subscribeProjects(list => {
      setProjects(list);
      setSelectedProjectId(prev => {
        if (prev && list.find(p => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    });
    return unsub;
  }, []);

  // Subscribe to tasks for selected project
  useEffect(() => {
    if (!selectedProjectId) { setTasks([]); return; }
    const unsub = subscribeTasks(selectedProjectId, setTasks);
    return unsub;
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId) ?? null;

  async function handleDeleteProject() {
    if (!deleteProjectTarget) return;
    await deleteProject(deleteProjectTarget.id);
    setDeleteProjectTarget(null);
    if (selectedProjectId === deleteProjectTarget.id) setSelectedProjectId(null);
  }

  if (!mounted) return null;

  return (
    <div className="app">
...
      <Sidebar
        projects={projects}
        tasks={tasks}
        selectedId={selectedProjectId}
        onSelect={id => { setSelectedProjectId(id); setTasks([]); }}
        onCreateProject={() => setProjectModal('create')}
        onEditProject={p => setProjectModal(p)}
        onDeleteProject={setDeleteProjectTarget}
      />

      <main className="main">
        {selectedProject ? (
          <Board
            project={selectedProject}
            tasks={tasks}
            onEditProject={() => setProjectModal(selectedProject)}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">⚡</div>
            <h2>Welcome to MyPA</h2>
            <p>Create a project to get started.</p>
            <button className="btn-primary" onClick={() => setProjectModal('create')}>
              + New Project
            </button>
          </div>
        )}
      </main>

      {/* Create or Edit modal */}
      {projectModal !== null && (
        <ProjectModal
          project={projectModal === 'create' ? undefined : projectModal}
          onClose={() => setProjectModal(null)}
        />
      )}

      {deleteProjectTarget && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${deleteProjectTarget.name}"? Tasks in this project will remain in Firestore.`}
          confirmLabel="Yes, Delete"
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteProjectTarget(null)}
        />
      )}

      {/* Floating Dev Console button */}
      <Link
        href="/dev"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 999,
          background: '#22263a', border: '1px solid #2e3250',
          color: '#7b82a8', padding: '8px 16px', borderRadius: 20,
          fontSize: 12, fontWeight: 600, textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#6c63ff';
          (e.currentTarget as HTMLAnchorElement).style.color = '#6c63ff';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = '#2e3250';
          (e.currentTarget as HTMLAnchorElement).style.color = '#7b82a8';
        }}
      >
        🔧 Dev API
      </Link>
    </div>
  );
}
