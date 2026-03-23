import { api } from '../api.js';
import { formatDate, shortId, escapeHtml } from '../utils.js';

export async function renderDashboard(container) {
  const [rulebooks, sessions, references, validation, designSessions, profile] = await Promise.all([
    api.getRulebooks().catch(() => []),
    api.getSessions().catch(() => []),
    api.getReferences().catch(() => []),
    api.validate().catch(() => ({ summary: { pass: 0, warn: 0, fail: 0 } })),
    api.getDesignSessions().catch(() => []),
    api.getDesignerProfile().catch(() => null),
  ]);

  const totalSections = rulebooks.reduce((sum, r) => sum + (r.sectionCount || 0), 0);

  // Per-game stats map
  const gameMap = {};
  rulebooks.forEach(r => {
    gameMap[r.name] = { rulebook: r, sessions: 0, refs: 0, designs: 0, worstStatus: 'pass' };
  });
  sessions.forEach(s => { if (gameMap[s.game]) gameMap[s.game].sessions++; });
  references.forEach(r => { if (r.game && gameMap[r.game]) gameMap[r.game].refs++; });
  designSessions.forEach(d => { if (gameMap[d.game]) gameMap[d.game].designs++; });
  validation.checks.forEach(c => {
    const g = c.game || c.id;
    if (gameMap[g]) {
      if (c.status === 'fail') gameMap[g].worstStatus = 'fail';
      else if (c.status === 'warn' && gameMap[g].worstStatus !== 'fail') gameMap[g].worstStatus = 'warn';
    }
  });

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
        <div class="stat-card" data-color="violet" style="cursor: pointer;" onclick="location.hash='#/design'">
          <span class="stat-value">${designSessions.length}</span>
          <span class="stat-label">Design Sessions</span>
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

      <div class="grid-2" style="margin-bottom: var(--sp-lg);">
        <div>
          <div class="section-title">Designer Affinities</div>
          <div class="card">
            ${(() => {
              if (!profile) return '<p style="color: var(--text-muted); padding: var(--sp-md); font-size: var(--text-sm);">No profile data yet.</p>';
              const top3 = Object.entries(profile.affinities || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3);
              if (top3.length === 0) return '<p style="color: var(--text-muted); padding: var(--sp-md); font-size: var(--text-sm);">No affinities recorded yet.</p>';
              return top3.map(([mech, val]) => `
                <div style="padding: var(--sp-sm) var(--sp-md); border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: var(--sp-md);">
                  <span style="flex: 1; font-size: var(--text-sm); text-transform: capitalize;">${escapeHtml(mech.replace(/_/g, ' '))}</span>
                  <span class="badge badge-${val >= 0 ? 'pass' : 'fail'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}</span>
                </div>
              `).join('') + `<div style="padding: var(--sp-sm) var(--sp-md);"><a href="#/profile" style="font-size: var(--text-xs); color: var(--accent);">View full profile →</a></div>`;
            })()}
          </div>
        </div>
        <div>
          <div class="section-title">Design Sessions</div>
          <div class="card">
            ${designSessions.length === 0 ? '<p style="color: var(--text-muted); padding: var(--sp-md); font-size: var(--text-sm);">No design sessions yet.</p>' : `
            ${designSessions.slice(0, 4).map(s => `
              <div style="padding: var(--sp-sm) var(--sp-md); border-bottom: 1px solid var(--glass-border); cursor: pointer;" onclick="location.hash='#/design/${encodeURIComponent(s.game)}/${encodeURIComponent(s.sessionId)}'">
                <div style="font-weight: 600; font-size: var(--text-sm);">${escapeHtml(s.gameName || s.game)}</div>
                <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px;">${s.stepCount} steps · ${formatDate(s.lastUpdatedAt)}</div>
              </div>
            `).join('')}
            ${designSessions.length > 4 ? `<div style="padding: var(--sp-sm) var(--sp-md);"><a href="#/design" style="font-size: var(--text-xs); color: var(--accent);">View all ${designSessions.length} sessions →</a></div>` : ''}`}
          </div>
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
          <div class="section-title">Games</div>
          ${Object.keys(gameMap).length === 0 ? '<p style="color: var(--text-muted); font-size: var(--text-sm);">No games yet</p>' : `
          <div class="grid-2 stagger" style="gap: var(--sp-sm);">
            ${Object.entries(gameMap).map(([name, g]) => {
              const statusColor = g.worstStatus === 'fail' ? 'var(--color-fail)' : g.worstStatus === 'warn' ? 'var(--color-warn)' : 'var(--color-pass)';
              return `
              <div class="card card-clickable" onclick="location.hash='#/rulebooks/${encodeURIComponent(name)}'" style="padding: var(--sp-md);">
                <div class="card-header" style="margin-bottom: var(--sp-xs);">
                  <div>
                    <div class="card-title" style="font-size: var(--text-sm);">${escapeHtml(g.rulebook.metadata?.title || name)}</div>
                    <div class="card-subtitle">v${escapeHtml(g.rulebook.metadata?.version || '?')}</div>
                  </div>
                  <span style="width:10px;height:10px;border-radius:50%;background:${statusColor};display:inline-block;flex-shrink:0;" title="${g.worstStatus}"></span>
                </div>
                <div class="meta-row" style="margin-top:var(--sp-xs);gap:var(--sp-sm);">
                  <div class="meta-item" style="font-size:var(--text-xs);"><strong>${g.rulebook.sectionCount}</strong> sections</div>
                  <div class="meta-item" style="font-size:var(--text-xs);"><strong>${g.refs}</strong> refs</div>
                  ${g.sessions > 0 ? `<div class="meta-item" style="font-size:var(--text-xs);"><strong>${g.sessions}</strong> sessions</div>` : ''}
                  ${g.designs > 0 ? `<div class="meta-item" style="font-size:var(--text-xs);"><strong>${g.designs}</strong> designs</div>` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>`}
        </div>
      </div>
    </div>
  `;
}
