import { api } from '../api.js';
import { formatDate, formatTime, shortId, renderJson, emptyStateHtml, escapeHtml } from '../utils.js';

export async function renderSessions(container, params) {
  if (params) return renderSessionDetail(container, params);
  const sessions = await api.getSessions();

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Playtest Sessions</h1><p>All recorded game sessions</p></div>
        ${emptyStateHtml('No Sessions', 'No playtest sessions have been created yet.')}
      </div>`;
    return;
  }

  // Group sessions by game
  const grouped = {};
  sessions.forEach(s => {
    const key = s.game || s.rulebookName || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header"><h1>Playtest Sessions</h1><p>${sessions.length} sessions across ${Object.keys(grouped).length} game(s)</p></div>
      ${Object.entries(grouped).map(([game, gameSessions]) => `
        <div class="section-row" style="margin-top: var(--sp-lg);">
          <div class="section-title">${escapeHtml(game)}</div>
          <span class="badge badge-accent">${gameSessions.length} session${gameSessions.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="card">
          <table class="data-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Rulebook</th>
                <th>Version</th>
                <th>State Keys</th>
                <th>Actions</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody class="stagger">
              ${gameSessions.map(s => `
                <tr class="table-row-clickable" onclick="location.hash='#/sessions/${s.sessionId}'">
                  <td class="mono">${shortId(s.sessionId)}…</td>
                  <td><span class="badge badge-accent">${escapeHtml(s.rulebookName)}</span></td>
                  <td><span class="badge badge-neutral">${escapeHtml(s.version || '—')}</span></td>
                  <td>${s.stateKeys.length}</td>
                  <td><span class="badge badge-info">${s.ledgerCount} actions</span></td>
                  <td class="mono">${formatDate(s.createdAt)}</td>
                  <td class="mono">${formatDate(s.lastUpdatedAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>`;
}

async function renderSessionDetail(container, sessionId) {
  const session = await api.getSession(sessionId);

  container.innerHTML = `
    <div class="fade-in">
      <button class="back-btn" onclick="location.hash='#/sessions'">← Back to Sessions</button>
      <div class="page-header">
        <h1>Session ${shortId(session.sessionId)}</h1>
        <p>Linked to rulebook <strong>${escapeHtml(session.rulebookName)}</strong>${session.rulebookVersion ? ` (v${session.rulebookVersion})` : ''}${session._game ? ` · Game: <strong>${escapeHtml(session._game)}</strong>` : ''}${session._version ? ` · Version: <strong>${escapeHtml(session._version)}</strong>` : ''}</p>
      </div>

      <div class="meta-row">
        <div class="meta-item">Created <strong>${formatDate(session.createdAt)}</strong></div>
        <div class="meta-item">Updated <strong>${formatDate(session.lastUpdatedAt)}</strong></div>
        <div class="meta-item">Actions <strong>${session.ledger.length}</strong></div>
      </div>

      <div class="tabs" id="session-tabs">
        <button class="tab-btn active" data-tab="state">Game State</button>
        <button class="tab-btn" data-tab="ledger">Action Ledger (${session.ledger.length})</button>
        <button class="tab-btn" data-tab="stats">Statistics</button>
      </div>

      <div id="session-tab-content"></div>
    </div>`;

  const tabContent = container.querySelector('#session-tab-content');
  const tabBtns = container.querySelectorAll('.tab-btn');

  function showTab(tab) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'state') renderState(tabContent, session.state);
    else if (tab === 'ledger') renderLedger(tabContent, session.ledger);
    else renderStats(tabContent, session);
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  showTab('state');
}

function renderState(container, state) {
  container.innerHTML = `
    <div class="detail-panel slide-in">
      <div class="detail-header">
        <span class="card-title">Current Game State</span>
        <span class="badge badge-info">${Object.keys(state).length} keys</span>
      </div>
      <div class="detail-body">
        <pre class="json-viewer">${renderJson(state)}</pre>
      </div>
    </div>`;
}

function getActionDotClass(actionType) {
  if (actionType.includes('shuffle')) return 'shuffle';
  if (actionType.includes('draw')) return 'draw';
  if (actionType.includes('move')) return 'move';
  if (actionType.includes('roll')) return 'roll';
  if (actionType.includes('buy')) return 'buy';
  if (actionType.includes('reveal')) return 'reveal';
  if (actionType.includes('create')) return 'create';
  if (actionType.includes('resolve')) return 'resolve';
  return 'default';
}

function getActionEmoji(actionType) {
  if (actionType.includes('shuffle')) return '🔀';
  if (actionType.includes('draw')) return '🃏';
  if (actionType.includes('move')) return '➡️';
  if (actionType.includes('roll')) return '🎲';
  if (actionType.includes('buy')) return '💰';
  if (actionType.includes('reveal')) return '👁️';
  if (actionType.includes('create')) return '🏗️';
  if (actionType.includes('resolve')) return '⚔️';
  return '⚡';
}

function renderLedger(container, ledger) {
  if (ledger.length === 0) {
    container.innerHTML = emptyStateHtml('No Actions', 'This session has no recorded actions.');
    return;
  }

  container.innerHTML = `
    <ul class="timeline stagger">
      ${ledger.map(entry => `
        <li class="timeline-item">
          <div class="timeline-dot ${getActionDotClass(entry.actionType)}">${getActionEmoji(entry.actionType)}</div>
          <div class="timeline-content">
            <div class="timeline-action">${escapeHtml(entry.actionType.replace(/_/g, ' '))}</div>
            <div class="timeline-actor">by ${escapeHtml(entry.actor)}</div>
            ${Object.keys(entry.data).length > 0 ? `
              <div class="timeline-details">${Object.entries(entry.data).map(([k, v]) =>
                `<div><span class="json-key">${escapeHtml(k)}</span>: ${typeof v === 'object' ? JSON.stringify(v) : escapeHtml(String(v))}</div>`
              ).join('')}</div>
            ` : ''}
          </div>
          <div class="timeline-time">${formatTime(entry.timestamp)}</div>
        </li>
      `).join('')}
    </ul>`;
}

function renderStats(container, session) {
  const actionCounts = {};
  const actorCounts = {};
  session.ledger.forEach(entry => {
    actionCounts[entry.actionType] = (actionCounts[entry.actionType] || 0) + 1;
    actorCounts[entry.actor] = (actorCounts[entry.actor] || 0) + 1;
  });

  const duration = session.ledger.length >= 2
    ? ((new Date(session.ledger[session.ledger.length - 1].timestamp) - new Date(session.ledger[0].timestamp)) / 1000).toFixed(1)
    : 0;

  container.innerHTML = `
    <div class="grid-2 slide-in">
      <div class="card">
        <div class="card-title" style="margin-bottom: var(--sp-md);">Action Breakdown</div>
        <table class="data-table">
          <thead><tr><th>Action Type</th><th>Count</th></tr></thead>
          <tbody>
            ${Object.entries(actionCounts).map(([type, count]) => `
              <tr>
                <td>${getActionEmoji(type)} ${escapeHtml(type.replace(/_/g, ' '))}</td>
                <td><span class="badge badge-info">${count}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom: var(--sp-md);">Session Info</div>
        <table class="data-table">
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Total Actions</td><td>${session.ledger.length}</td></tr>
            <tr><td>Session Duration</td><td>${duration}s</td></tr>
            <tr><td>State Keys</td><td>${Object.keys(session.state).length}</td></tr>
            ${Object.entries(actorCounts).map(([actor, count]) => `
              <tr><td>Actions by ${escapeHtml(actor)}</td><td>${count}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
