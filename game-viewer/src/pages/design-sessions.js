import { api } from '../api.js';
import { formatDate, shortId, emptyStateHtml, escapeHtml } from '../utils.js';
import { marked } from 'marked';

const PERSONA_CONFIG = {
  MechanicsArchitect: { colorClass: 'roll', emoji: '⚙️' },
  ThemeWeaver:        { colorClass: 'draw', emoji: '🎨' },
  ComponentDesigner:  { colorClass: 'move', emoji: '🧩' },
  DetailsArchitect:   { colorClass: 'shuffle', emoji: '📐' },
  FunFactorJudge:     { colorClass: 'buy', emoji: '🎉' },
};

export async function renderDesignSessions(container, params) {
  if (params) {
    const slashIdx = params.indexOf('/');
    if (slashIdx !== -1) {
      const game = params.slice(0, slashIdx);
      const id = params.slice(slashIdx + 1);
      return renderDesignSessionDetail(container, game, id);
    }
  }

  let sessions;
  try {
    sessions = await api.getDesignSessions();
  } catch {
    sessions = [];
  }

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Design Sessions</h1><p>Nova Loop design history</p></div>
        ${emptyStateHtml('No Design Sessions', 'No design sessions have been created yet. Use the game-gen pipeline to start one.')}
      </div>`;
    return;
  }

  const grouped = {};
  sessions.forEach(s => {
    if (!grouped[s.game]) grouped[s.game] = [];
    grouped[s.game].push(s);
  });

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Design Sessions</h1>
        <p>${sessions.length} session${sessions.length !== 1 ? 's' : ''} across ${Object.keys(grouped).length} game${Object.keys(grouped).length !== 1 ? 's' : ''}</p>
      </div>

      ${Object.entries(grouped).map(([game, gameSessions]) => `
        <div class="section-row" style="margin-top: var(--sp-lg);">
          <div class="section-title">${escapeHtml(game)}</div>
          <span class="badge badge-accent">${gameSessions.length} session${gameSessions.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="grid-2 stagger">
          ${gameSessions.map(s => `
            <div class="card card-clickable" onclick="location.hash='#/design/${encodeURIComponent(s.game)}/${encodeURIComponent(s.sessionId)}'">
              <div class="card-header">
                <div>
                  <div class="card-title">${escapeHtml(s.gameName || s.game)}</div>
                  <div class="card-subtitle">${escapeHtml((s.theme || '').substring(0, 90))}${(s.theme || '').length > 90 ? '…' : ''}</div>
                </div>
                <span class="badge badge-${s.status === 'completed' ? 'pass' : s.status === 'active' ? 'info' : 'neutral'}">${escapeHtml(s.status || 'unknown')}</span>
              </div>
              <div class="meta-row" style="margin-top: var(--sp-sm);">
                <div class="meta-item"><strong>${s.stepCount}</strong> step${s.stepCount !== 1 ? 's' : ''}</div>
                <div class="meta-item">Created ${formatDate(s.createdAt)}</div>
                <div class="meta-item">Updated ${formatDate(s.lastUpdatedAt)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>`;
}

async function renderDesignSessionDetail(container, game, id) {
  let session;
  try {
    session = await api.getDesignSession(game, id);
  } catch (e) {
    container.innerHTML = `
      <div class="fade-in">
        <button class="back-btn" onclick="location.hash='#/design'">← Back to Design Sessions</button>
        ${emptyStateHtml('Session Not Found', e.message)}
      </div>`;
    return;
  }

  const steps = session.steps || [];
  const artifacts = session._artifacts || [];
  const decisionMap = {};
  const decisionLog = session._decisionLog;
  if (decisionLog) {
    const decisions = Array.isArray(decisionLog) ? decisionLog : (decisionLog.decisions || []);
    decisions.forEach(d => { decisionMap[d.stepId || d.stepNumber] = d; });
  }

  const stepsHtml = steps.length === 0
    ? emptyStateHtml('No Steps Yet', 'This design session has no recorded steps.')
    : `<ul class="timeline">
      ${steps.map(step => {
        const cfg = PERSONA_CONFIG[step.persona] || { colorClass: 'default', emoji: '📝' };
        const decisionKey = step.stepNumber || step.stepId;
        const decision = decisionMap[decisionKey];
        return `
          <li class="timeline-item">
            <div class="timeline-dot ${cfg.colorClass}">${cfg.emoji}</div>
            <div class="timeline-content">
              <div class="timeline-action">Step ${step.stepNumber !== undefined ? step.stepNumber : ''} · ${escapeHtml(step.persona || 'Unknown')}</div>
              <div class="timeline-actor">${escapeHtml(step.summary || '')}</div>
              ${decision ? `
                <div style="margin-top: var(--sp-xs); display: flex; align-items: center; gap: var(--sp-sm); flex-wrap: wrap;">
                  <span class="badge badge-${decision.decision === 'accept' ? 'pass' : decision.decision === 'reject' ? 'fail' : 'warn'}">${escapeHtml(decision.decision)}</span>
                  ${decision.rationale ? `<span style="font-size: var(--text-xs); color: var(--text-secondary);">${escapeHtml(decision.rationale)}</span>` : ''}
                  ${(decision.impactedMechanisms || []).length > 0 ? `<div class="tag-list">${decision.impactedMechanisms.map(m => `<span class="badge badge-neutral">${escapeHtml(m)}</span>`).join('')}</div>` : ''}
                </div>
              ` : ''}
              <div id="step-output-${step.stepNumber}" style="display: none; margin-top: var(--sp-sm);">
                <div class="detail-panel">
                  <div class="detail-body markdown-body">${marked.parse(step.output || '')}</div>
                </div>
              </div>
              <button class="tab-btn" style="margin-top: var(--sp-xs); padding: var(--sp-xs) var(--sp-sm);"
                      onclick="toggleStepOutput(${step.stepNumber}, this)">Expand</button>
            </div>
            <div class="timeline-time">${formatDate(step.timestamp)}</div>
          </li>`;
      }).join('')}
    </ul>`;

  const artifactsHtml = artifacts.length === 0
    ? emptyStateHtml('No Artifacts', 'No design artifact files found for this session.')
    : artifacts.map(a => `
      <div class="detail-panel" style="margin-bottom: var(--sp-md);">
        <div class="detail-header">
          <div>
            <div class="card-title">${escapeHtml(a.title)}</div>
            <div class="card-subtitle">${escapeHtml(a.filename)}</div>
          </div>
          <span class="badge badge-neutral">${escapeHtml(a.type)}</span>
        </div>
        <div class="detail-body markdown-body">${marked.parse(a.content)}</div>
      </div>
    `).join('');

  container.innerHTML = `
    <div class="fade-in">
      <button class="back-btn" onclick="location.hash='#/design'">← Back to Design Sessions</button>

      <div class="page-header">
        <h1>${escapeHtml(session.gameName || game)}</h1>
        <p>${escapeHtml(session.theme || '')}${session.status ? ` · <span class="badge badge-${session.status === 'completed' ? 'pass' : 'info'}">${escapeHtml(session.status)}</span>` : ''}</p>
      </div>

      <div class="meta-row">
        <div class="meta-item">Session <strong class="mono">${shortId(session.sessionId || id)}</strong></div>
        <div class="meta-item">Created <strong>${formatDate(session.createdAt)}</strong></div>
        <div class="meta-item">Updated <strong>${formatDate(session.lastUpdatedAt)}</strong></div>
        <div class="meta-item"><strong>${steps.length}</strong> step${steps.length !== 1 ? 's' : ''}</div>
        ${artifacts.length > 0 ? `<div class="meta-item"><strong>${artifacts.length}</strong> artifact${artifacts.length !== 1 ? 's' : ''}</div>` : ''}
      </div>

      <div class="tabs" id="ds-tabs">
        <button class="tab-btn active" onclick="switchDSTab('steps', this)">Steps <span class="badge badge-neutral" style="margin-left:4px">${steps.length}</span></button>
        ${artifacts.length > 0 ? `<button class="tab-btn" onclick="switchDSTab('artifacts', this)">Artifacts <span class="badge badge-neutral" style="margin-left:4px">${artifacts.length}</span></button>` : ''}
      </div>

      <div id="ds-tab-steps">${stepsHtml}</div>
      <div id="ds-tab-artifacts" style="display:none">${artifactsHtml}</div>
    </div>`;

  window.toggleStepOutput = (stepNum, btn) => {
    const el = document.getElementById(`step-output-${stepNum}`);
    if (!el) return;
    const isOpen = el.style.display !== 'none';
    el.style.display = isOpen ? 'none' : 'block';
    btn.textContent = isOpen ? 'Expand' : 'Collapse';
  };

  window.switchDSTab = (tab, btn) => {
    document.querySelectorAll('#ds-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('ds-tab-steps').style.display = tab === 'steps' ? '' : 'none';
    const artifactsEl = document.getElementById('ds-tab-artifacts');
    if (artifactsEl) artifactsEl.style.display = tab === 'artifacts' ? '' : 'none';
  };
}
