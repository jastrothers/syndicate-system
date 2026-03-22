import { api } from '../api.js';
import { escapeHtml, shortId } from '../utils.js';

export async function renderValidation(container) {
  const results = await api.validate();

  const statusIcon = (status) => {
    if (status === 'pass') return '<div class="validation-icon pass">✓</div>';
    if (status === 'warn') return '<div class="validation-icon warn">!</div>';
    return '<div class="validation-icon fail">✗</div>';
  };

  const grouped = {};
  results.checks.forEach(c => {
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type].push(c);
  });

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header"><h1>Validation</h1><p>Structural integrity checks across all stored data</p></div>

      <div class="stats-grid stagger" style="margin-bottom: var(--sp-xl);">
        <div class="stat-card" data-color="green">
          <span class="stat-value">${results.summary.pass}</span>
          <span class="stat-label">Passed</span>
        </div>
        <div class="stat-card" data-color="amber">
          <span class="stat-value">${results.summary.warn}</span>
          <span class="stat-label">Warnings</span>
        </div>
        <div class="stat-card" data-color="violet">
          <span class="stat-value">${results.summary.fail}</span>
          <span class="stat-label">Failures</span>
        </div>
      </div>

      ${Object.entries(grouped).map(([type, checks]) => `
        <div class="section-row">
          <div class="section-title" style="text-transform: capitalize;">${escapeHtml(type)} Checks</div>
          <span class="badge badge-info">${checks.length}</span>
        </div>
        <div class="card" style="margin-bottom: var(--sp-xl);">
          <ul class="validation-list stagger">
            ${checks.map(c => `
              <li class="validation-item">
                ${statusIcon(c.status)}
                <div class="validation-info">
                  <div class="validation-type">${escapeHtml(c.type)}</div>
                  <div class="validation-id">${escapeHtml(c.id.length > 12 ? shortId(c.id) + '…' : c.id)}</div>
                  <div class="validation-msg">${escapeHtml(c.message)}</div>
                </div>
                <span class="badge badge-${c.status}">${c.status}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    </div>`;
}
