import { api } from '../api.js';
import { emptyStateHtml } from '../utils.js';
import { marked } from 'marked';

export async function renderPlaytestLogs(container) {
  const logs = await api.getPlaytestLogs();

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Playtest Logs</h1><p>Observations and notes from playtesting</p></div>
        ${emptyStateHtml('No Logs', 'No playtest logs have been recorded yet.')}
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header"><h1>Playtest Logs</h1><p>${logs.length} log source(s) found</p></div>
      <div class="stagger">
        ${logs.map(log => `
          <div class="detail-panel" style="margin-bottom: var(--sp-lg);">
            <div class="detail-header">
              <span class="card-title">${log.source === 'global' ? 'Global Playtest Log' : `${log.source} — Playtest Log`}</span>
              <span class="badge badge-info">${log.source}</span>
            </div>
            <div class="detail-body markdown-body">${marked.parse(log.content || '')}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
}
