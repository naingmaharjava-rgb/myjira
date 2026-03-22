'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

// ─── Endpoint definition schema ───────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface QueryParam {
  name: string;
  type: 'string' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
  description: string;
  defaultValue?: string;
}

interface EndpointDef {
  id: string;
  tag: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  authRequired: boolean;
  queryParams?: QueryParam[];
  bodySchema?: object;
  responses: Record<string, string>;
}

const AUTH_TOKEN = 'TyTNJXAeponLTm';

const ENDPOINTS: EndpointDef[] = [
  // ── Tasks ──────────────────────────────────────────────────────────────────
  {
    id: 'export-tasks',
    tag: 'Tasks',
    method: 'GET',
    path: '/api/tasks/export',
    summary: 'Export Tasks',
    description: 'Returns all tasks that belong to a given Kanban column. Useful for external integrations, reports, or pipeline triggers.',
    authRequired: true,
    queryParams: [
      {
        name: 'status',
        type: 'select',
        options: ['todo', 'doing', 'done'],
        required: true,
        description: 'Kanban column to filter by',
        defaultValue: 'done',
      },
    ],
    responses: {
      '200': 'Array of task objects matching the given status',
      '400': 'Missing or invalid status parameter',
      '500': 'Firestore error',
    },
  },
  {
    id: 'update-task',
    tag: 'Tasks',
    method: 'POST',
    path: '/api/tasks/update',
    summary: 'Update / Move / Delete Task',
    description: 'Moves a task to a different Kanban column, or deletes it. This uses the Firebase Admin SDK (server-side), bypassing Firestore Security Rules.',
    authRequired: true,
    bodySchema: {
      action: 'move',
      taskId: '',
      nextStatus: 'doing',
    },
    responses: {
      '200': '{ success: true, message: string }',
      '400': 'Validation error — missing required fields or invalid action',
      '500': 'Firestore error',
    },
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function methodColor(method: HttpMethod) {
  const map: Record<HttpMethod, string> = {
    GET: '#10b981',
    POST: '#6c63ff',
    PUT: '#f59e0b',
    PATCH: '#f59e0b',
    DELETE: '#ef4444',
  };
  return map[method];
}

function statusColor(code: number) {
  if (code < 300) return '#10b981';
  if (code < 400) return '#f59e0b';
  return '#ef4444';
}

function buildCurl(
  endpoint: EndpointDef,
  queryValues: Record<string, string>,
  bodyText: string,
  authToken: string,
): string {
  const qs = endpoint.queryParams
    ? endpoint.queryParams
        .map(p => `${p.name}=${queryValues[p.name] ?? p.defaultValue ?? ''}`)
        .join('&')
    : '';

  const url = `http://localhost:3000${endpoint.path}${qs ? `?${qs}` : ''}`;
  const authFlag = authToken ? ` \\\n  -H "auth: ${authToken}"` : '';

  if (endpoint.method === 'GET') {
    return `curl -s "${url}"${authFlag}`;
  }
  return `curl -s -X ${endpoint.method} "${url}"${authFlag} \\\n  -H "Content-Type: application/json" \\\n  -d '${bodyText}'`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResponseBlock({ data }: { data: { status: number; body: unknown; ms: number } }) {
  const color = statusColor(data.status);
  const json = JSON.stringify(data.body, null, 2);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{
          background: color + '22', color, fontWeight: 700, fontSize: 12,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {data.status} {data.status < 300 ? '✓' : '✗'}
        </span>
        <span style={{ color: '#7b82a8', fontSize: 12 }}>{data.ms}ms</span>
      </div>
      <pre style={{
        background: '#0a0c14', border: '1px solid #2e3250', borderRadius: 8,
        padding: '14px 16px', overflowX: 'auto', fontSize: 12.5,
        color: data.status < 300 ? '#a5f3c6' : '#fca5a5',
        lineHeight: 1.6, maxHeight: 320, overflowY: 'auto',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}>
        {json}
      </pre>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        background: copied ? '#10b98122' : '#22263a', color: copied ? '#10b981' : '#7b82a8',
        border: '1px solid #2e3250', borderRadius: 6, padding: '4px 12px', fontSize: 12,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ─── Endpoint Card ────────────────────────────────────────────────────────────

function EndpointCard({ ep, globalAuth }: { ep: EndpointDef; globalAuth: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: unknown; ms: number } | null>(null);
  const [error, setError] = useState('');

  // Query param values
  const initQuery: Record<string, string> = {};
  ep.queryParams?.forEach(p => { initQuery[p.name] = p.defaultValue ?? ''; });
  const [queryValues, setQueryValues] = useState<Record<string, string>>(initQuery);

  // Body text
  const [bodyText, setBodyText] = useState(
    ep.bodySchema ? JSON.stringify(ep.bodySchema, null, 2) : '',
  );

  const curlCmd = buildCurl(ep, queryValues, bodyText, globalAuth);

  const execute = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setError('');
    const t0 = Date.now();

    try {
      const qs = ep.queryParams
        ? '?' + ep.queryParams.map(p => `${p.name}=${encodeURIComponent(queryValues[p.name] ?? '')}`).join('&')
        : '';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (globalAuth) headers['auth'] = globalAuth;

      const res = await fetch(`${ep.path}${ep.method === 'GET' ? qs : ''}`, {
        method: ep.method,
        headers,
        ...(ep.method !== 'GET' ? { body: bodyText } : {}),
      });

      let body: unknown;
      try { body = await res.json(); }
      catch { body = await res.text(); }

      setResponse({ status: res.status, body, ms: Date.now() - t0 });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [ep, queryValues, bodyText, globalAuth]);

  return (
    <div style={{
      border: '1px solid #2e3250', borderRadius: 10, overflow: 'hidden',
      marginBottom: 14, transition: 'border-color 0.15s',
    }}>
      {/* Header row — click to expand */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', background: open ? '#22263a' : '#1a1d27',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          background: methodColor(ep.method) + '22', color: methodColor(ep.method),
          fontWeight: 800, fontSize: 11, padding: '3px 10px', borderRadius: 6,
          fontFamily: 'monospace', letterSpacing: '0.05em', minWidth: 52, textAlign: 'center',
        }}>
          {ep.method}
        </span>
        <span style={{ fontFamily: 'monospace', color: '#c5cae9', fontSize: 13.5, flex: 1 }}>
          {ep.path}
        </span>
        <span style={{ color: '#7b82a8', fontSize: 13 }}>{ep.summary}</span>
        {ep.authRequired && (
          <span style={{ fontSize: 10, color: '#f59e0b', background: '#f59e0b11',
            padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>🔒 AUTH</span>
        )}
        <span style={{ color: '#7b82a8', fontSize: 16, marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '20px 20px 20px', background: '#1a1d27', borderTop: '1px solid #2e3250' }}>
          <p style={{ color: '#7b82a8', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            {ep.description}
          </p>

          {/* Query Params */}
          {ep.queryParams && ep.queryParams.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#7b82a8', marginBottom: 10 }}>
                Query Parameters
              </p>
              <div style={{ border: '1px solid #2e3250', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#22263a' }}>
                      {['Name', 'Required', 'Description', 'Value'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left',
                          color: '#7b82a8', fontWeight: 600, fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ep.queryParams.map((p, i) => (
                      <tr key={p.name} style={{ borderTop: i > 0 ? '1px solid #2e3250' : 'none' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <code style={{ color: '#a78bfa', fontSize: 12 }}>{p.name}</code>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700,
                            color: p.required ? '#ef4444' : '#6b7280' }}>
                            {p.required ? 'Yes *' : 'No'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12.5 }}>
                          {p.description}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {p.type === 'select' ? (
                            <select
                              value={queryValues[p.name] ?? ''}
                              onChange={e => setQueryValues(v => ({ ...v, [p.name]: e.target.value }))}
                              style={{ background: '#0f1117', border: '1px solid #2e3250',
                                color: '#e8eaf6', padding: '5px 10px', borderRadius: 6,
                                fontSize: 12, cursor: 'pointer' }}
                            >
                              {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              value={queryValues[p.name] ?? ''}
                              onChange={e => setQueryValues(v => ({ ...v, [p.name]: e.target.value }))}
                              placeholder={`Enter ${p.name}`}
                              style={{ background: '#0f1117', border: '1px solid #2e3250',
                                color: '#e8eaf6', padding: '5px 10px', borderRadius: 6,
                                fontSize: 12, width: 160 }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Request Body */}
          {ep.bodySchema && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: '#7b82a8' }}>Request Body (JSON)</p>
                <button
                  onClick={() => setBodyText(JSON.stringify(ep.bodySchema, null, 2))}
                  style={{ fontSize: 11, color: '#6c63ff', background: 'none',
                    border: '1px solid #6c63ff33', padding: '3px 10px', borderRadius: 4, cursor: 'pointer' }}
                >
                  ↺ Reset
                </button>
              </div>
              <textarea
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
                rows={8}
                spellCheck={false}
                style={{
                  width: '100%', background: '#0a0c14', border: '1px solid #2e3250',
                  borderRadius: 8, padding: '12px 14px', color: '#a5f3c6',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontSize: 12.5, lineHeight: 1.6, resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Curl command */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#7b82a8' }}>cURL</p>
              <CopyButton text={curlCmd} />
            </div>
            <pre style={{
              background: '#0a0c14', border: '1px solid #2e3250', borderRadius: 8,
              padding: '12px 14px', fontSize: 12, color: '#fbbf24',
              overflowX: 'auto', lineHeight: 1.7,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}>
              {curlCmd}
            </pre>
          </div>

          {/* Execute */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={execute}
              disabled={loading}
              style={{
                background: loading ? '#2e3250' : '#6c63ff',
                color: loading ? '#7b82a8' : '#fff',
                border: 'none', padding: '9px 22px', borderRadius: 8,
                fontWeight: 700, fontSize: 13.5, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s',
              }}
            >
              {loading ? (
                <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Sending…</>
              ) : (
                '▶  Execute'
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#ef444411', border: '1px solid #ef4444', borderRadius: 8,
              padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          {/* Response */}
          {response && <ResponseBlock data={response} />}

          {/* Responses schema */}
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: '#7b82a8', marginBottom: 10 }}>Responses</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(ep.responses).map(([code, desc]) => (
                <div key={code} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <span style={{
                    background: statusColor(parseInt(code)) + '22',
                    color: statusColor(parseInt(code)),
                    fontWeight: 700, fontSize: 11, padding: '2px 8px',
                    borderRadius: 4, fontFamily: 'monospace', minWidth: 36, textAlign: 'center',
                  }}>
                    {code}
                  </span>
                  <span style={{ color: '#9ca3af', fontSize: 12.5 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevPage() {
  const [globalAuth, setGlobalAuth] = useState(AUTH_TOKEN);
  const [authVisible, setAuthVisible] = useState(false);

  const tags = [...new Set(ENDPOINTS.map(e => e.tag))];

  return (
    <div style={{
      minHeight: '100vh', background: '#0f1117', color: '#e8eaf6',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Top nav */}
      <nav style={{
        background: '#1a1d27', borderBottom: '1px solid #2e3250',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        gap: 24, height: 56, position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8,
          color: '#6c63ff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
          ← MyPA
        </Link>
        <span style={{ color: '#2e3250' }}>|</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#e8eaf6' }}>
          🔧 Dev API Console
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, background: '#10b98122',
          color: '#10b981', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
          v1.0
        </span>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>MyPA API</h1>
          <p style={{ color: '#7b82a8', fontSize: 13.5, lineHeight: 1.6 }}>
            Interactive API documentation for the MyPA dashboard. Execute requests directly from the browser.
            All requests are sent to <code style={{ color: '#a78bfa' }}>localhost:3000</code>.
          </p>
        </div>

        {/* Auth token */}
        <div style={{
          background: '#1a1d27', border: '1px solid #2e3250', borderRadius: 10,
          padding: '16px 20px', marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              🔒 Auth Token
            </span>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={authVisible ? 'text' : 'password'}
                value={globalAuth}
                onChange={e => setGlobalAuth(e.target.value)}
                placeholder="Enter auth token"
                style={{
                  width: '100%', background: '#0f1117', border: '1px solid #2e3250',
                  borderRadius: 8, padding: '7px 40px 7px 12px', color: '#e8eaf6',
                  fontFamily: 'monospace', fontSize: 13, boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setAuthVisible(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#7b82a8', cursor: 'pointer', fontSize: 14 }}
              >
                {authVisible ? '🙈' : '👁'}
              </button>
            </div>
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              Sent as <code style={{ color: '#a78bfa' }}>auth</code> header
            </span>
          </div>
        </div>

        {/* Endpoint groups */}
        {tags.map(tag => (
          <div key={tag} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: '#7b82a8' }}>
                {tag}
              </h2>
              <div style={{ flex: 1, height: 1, background: '#2e3250' }} />
              <span style={{ fontSize: 11, color: '#5a6080' }}>
                {ENDPOINTS.filter(e => e.tag === tag).length} endpoint{ENDPOINTS.filter(e => e.tag === tag).length !== 1 ? 's' : ''}
              </span>
            </div>

            {ENDPOINTS.filter(e => e.tag === tag).map(ep => (
              <EndpointCard key={ep.id} ep={ep} globalAuth={globalAuth} />
            ))}
          </div>
        ))}

        <footer style={{ textAlign: 'center', color: '#5a6080', fontSize: 12,
          paddingTop: 24, borderTop: '1px solid #2e3250', marginTop: 8 }}>
          MyPA Dev Console · Requests sent from browser to localhost:3000
        </footer>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2e3250; border-radius: 10px; }
      `}</style>
    </div>
  );
}
