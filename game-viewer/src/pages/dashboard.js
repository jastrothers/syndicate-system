import { api } from '../api.js';
import { formatDate, shortId, escapeHtml } from '../utils.js';

export async function renderDashboard(container) {
  const [rulebooks, sessions, references, validation] = await Promise.all([
    api.getRulebooks().catch(() => []),
    api.getSessions().catch(() => []),
    api.getReferences().catch(() => []),
    api.validate().catch(() => ({ summary: { pass: 0, warn: 0, fail: 0 } })),
  ]);

  const totalSections = rulebooks.reduce((sum, r) => sum + (r.sectionCount || 0), 0);

  // Count unique games from sessions & references
  const sessionGames = new Set(sessions.map(s => s.game || s.rulebookName).filter(Boolean));
  const refGames = new Set(references.map(r => r.game).filter(g => g && g !== 'general'));
  const allGames = new Set([...sessionGames, ...refGames]);

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Overview of all stored game data in the MCP system</p>
      </div>

      <div class="stats-grid stagger">
        <div class="stat-card" data-color="violet">
          <span class="stat-value">${rulebooks.length}</span>
          <span class="stat-label">Rulebooks</span>
        </div>
        <div class="stat-card" data-color="blue">
          <span class="stat-value">${sessions.length}</span>
          <span class="stat-label">Sessions</span>
        </div>
        <div class="stat-card" data-color="green">
          <span class="stat-value">${references.length}</span>
          <span class="stat-label">References</span>
        </div>
        <div class="stat-card" data-color="amber">
          <span class="stat-value">${totalSections}</span>
          <span class="stat-label">Rule Sections</span>
        </div>
      </div>

      <div class="stats-grid stagger" style="margin-bottom: var(--sp-lg);">
        <div class="stat-card" data-color="green">
          <span class="stat-value">${validation.summary.pass}</span>
          <span class="stat-label">Checks Passed</span>
        </div>
        <div class="stat-card" data-color="amber">
          <span class="stat-value">${validation.summary.warn}</span>
          <span class="stat-label">Warnings</span>
        </div>
        <div class="stat-card" data-color="violet">
          <span class="stat-value">${validation.summary.fail}</span>
          <span class="stat-label">Failures</span>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <div class="section-title">Recent Sessions</div>
          <div class="card">
            ${sessions.length === 0 ? '<p style="color: var(--text-muted); padding: var(--sp-md);">No sessions yet</p>' : `
            <table class="data-table">
              <thead><tr><th>ID</th><th>Game</th><th>Actions</th><th>Updated</th></tr></thead>
              <tbody>
                ${sessions.slice(0, 5).map(s => `
                  <tr class="table-row-clickable" onclick="location.hash='#/sessions/${s.sessionId}'">
                    <td class="mono">${shortId(s.sessionId)}…</td>
                    <td><span class="badge badge-accent">${escapeHtml(s.game || s.rulebookName)}</span></td>
                    <td><span class="badge badge-info">${s.ledgerCount} actions</span></td>
                    <td class="mono">${formatDate(s.lastUpdatedAt)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`}
          </div>
        </div>

        <div>
          <div class="section-title">Rulebooks</div>
          <div class="card">
            ${rulebooks.length === 0 ? '<p style="color: var(--text-muted); padding: var(--sp-md);">No rulebooks yet</p>' : `
            ${rulebooks.map(r => `
              <div style="padding: var(--sp-sm) var(--sp-md); border-bottom: 1px solid var(--glass-border); cursor: pointer;" onclick="location.hash='#/rulebooks/${r.name}'">
                <div style="font-weight: 600;">${escapeHtml(r.metadata?.title || r.name)}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">
                  ${r.sectionCount} sections · v${r.metadata?.version || '?'} · ${formatDate(r.metadata?.lastUpdated)}
                </div>
              </div>
            `).join('')}`}
          </div>
        </div>
      </div>
    </div>
  `;
}
