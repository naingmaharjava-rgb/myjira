import { useRef, useState } from 'react';
import type { Project } from '../types';
import { PROJECT_COLORS } from '../types';
import { createProject, updateProject } from '../firebase';

interface Props {
  /** Pass existing project to edit; omit for create mode */
  project?: Project;
  onClose: () => void;
}

const PLACEHOLDER_MD = `# Project Overview
Describe your project in detail. This document is used by Gemini AI as context when generating code.

## Goals
- ...

## Tech Stack
- ...

## Architecture
- ...

## Conventions
- ...
`;

export default function ProjectModal({ project, onClose }: Props) {
  const isEdit = !!project;

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [detailMd, setDetailMd] = useState(project?.detail_md ?? '');
  const [mdTab, setMdTab] = useState<'write' | 'preview'>('write');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File upload ─────────────────────────────────────────────────────────────
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      setError('Only .md or .txt files are supported');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setDetailMd((ev.target?.result as string) ?? '');
      setMdTab('write');
      setError('');
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !detailMd.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (isEdit) {
        await updateProject(project.id, {
          name: name.trim(),
          description: description.trim(),
          color,
          detail_md: detailMd.trim(),
        });
      } else {
        await createProject({
          name: name.trim(),
          description: description.trim(),
          color,
          detail_md: detailMd.trim(),
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim() && description.trim() && detailMd.trim() && !loading;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal project-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-header">
          <h2>{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Row 1: Title + Color ── */}
          <div className="pm-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label>Title *</label>
              <input
                autoFocus
                type="text"
                placeholder="e.g. E-Commerce Backend"
                value={name}
                maxLength={80}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group pm-color-group">
              <label>Color</label>
              <div className="color-picker">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Short summary of what this project does"
              value={description}
              rows={2}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          {/* ── Project Detail (AI Context) ── */}
          <div className="form-group">
            <div className="md-label-row">
              <label>
                Project Detail
                <span className="label-required"> *</span>
                <span className="label-hint"> — AI context for Gemini</span>
              </label>
              <div className="md-actions">
                {/* Upload */}
                <button
                  type="button"
                  className="btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📄 Upload .md
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                {/* Write / Preview tabs */}
                <div className="md-tabs">
                  <button
                    type="button"
                    className={`md-tab ${mdTab === 'write' ? 'active' : ''}`}
                    onClick={() => setMdTab('write')}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    className={`md-tab ${mdTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setMdTab('preview')}
                  >
                    Preview
                  </button>
                </div>
              </div>
            </div>

            {mdTab === 'write' ? (
              <textarea
                className="md-editor"
                placeholder={PLACEHOLDER_MD}
                value={detailMd}
                rows={12}
                onChange={e => setDetailMd(e.target.value)}
                spellCheck={false}
              />
            ) : (
              <div className="md-preview">
                {detailMd.trim() ? (
                  <MarkdownPreview content={detailMd} />
                ) : (
                  <p className="md-preview-empty">Nothing to preview yet.</p>
                )}
              </div>
            )}

            <div className="md-footer">
              <span className="md-char-count">
                {detailMd.length.toLocaleString()} chars
              </span>
              {!detailMd.trim() && (
                <span className="md-hint">
                  Gemini uses this to understand project context when coding
                </span>
              )}
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!canSubmit}
            >
              {loading
                ? isEdit ? 'Saving…' : 'Creating…'
                : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Simple Markdown preview (no external library) ────────────────────────────
function MarkdownPreview({ content }: { content: string }) {
  const html = content
    // Code blocks
    .replace(/```[\s\S]*?```/g, m => `<pre><code>${escHtml(m.slice(3, -3).replace(/^\w+\n/, ''))}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, (_, c) => `<code>${escHtml(c)}</code>`)
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Line breaks → paragraphs
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return (
    <div
      className="md-preview-content"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
