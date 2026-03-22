// Shared utility functions

/** Format an ISO date string to a friendly relative/absolute format */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format a time from ISO */
export function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Truncate a UUID for display */
export function shortId(id) {
  if (!id) return '—';
  return id.substring(0, 8);
}

/** Render JSON with syntax highlighting */
export function renderJson(obj, indent = 0) {
  if (obj === null) return '<span class="json-null">null</span>';
  if (typeof obj === 'boolean') return `<span class="json-boolean">${obj}</span>`;
  if (typeof obj === 'number') return `<span class="json-number">${obj}</span>`;
  if (typeof obj === 'string') return `<span class="json-string">"${escapeHtml(obj)}"</span>`;

  const pad = '  '.repeat(indent);
  const padInner = '  '.repeat(indent + 1);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '<span class="json-bracket">[]</span>';
    const items = obj.map(v => `${padInner}${renderJson(v, indent + 1)}`).join(',\n');
    return `<span class="json-bracket">[</span>\n${items}\n${pad}<span class="json-bracket">]</span>`;
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) return '<span class="json-bracket">{}</span>';
  const entries = keys.map(k =>
    `${padInner}<span class="json-key">"${escapeHtml(k)}"</span>: ${renderJson(obj[k], indent + 1)}`
  ).join(',\n');
  return `<span class="json-bracket">{</span>\n${entries}\n${pad}<span class="json-bracket">}</span>`;
}

/** Escape HTML */
export function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Simple loading spinner */
export function loadingHtml() {
  return '<div class="loading"><div class="spinner"></div></div>';
}

/** Empty state */
export function emptyStateHtml(title, desc) {
  return `
    <div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>`;
}
