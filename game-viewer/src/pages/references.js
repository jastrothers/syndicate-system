import { api } from '../api.js';
import { formatDate, emptyStateHtml, escapeHtml } from '../utils.js';
import { marked } from 'marked';

export async function renderReferences(container, params) {
  if (params) return renderReferenceDetail(container, params);
  const refs = await api.getReferences();

  if (refs.length === 0) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>References</h1><p>Reusable game modules and templates</p></div>
        ${emptyStateHtml('No References', 'No references have been saved yet.')}
      </div>`;
    return;
  }

  // Group references by game
  const grouped = {};
  refs.forEach(r => {
    const key = r.game || 'general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  });

  // Sort games alphabetically, but put 'general' last
  const sortedGames = Object.keys(grouped).sort((a, b) => {
    if (a === 'general') return 1;
    if (b === 'general') return -1;
    return a.localeCompare(b);
  });

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header"><h1>References</h1><p>${refs.length} modules across ${sortedGames.length} game(s)</p></div>
      ${sortedGames.map(game => `
        <div class="section-row" style="margin-top: var(--sp-lg);">
          <div class="section-title">${escapeHtml(game)}</div>
          <span class="badge badge-accent">${grouped[game].length} reference${grouped[game].length !== 1 ? 's' : ''}</span>
        </div>
        <div class="grid-2 stagger">
          ${grouped[game].map(r => `
            <div class="card card-clickable" onclick="location.hash='#/references/${r.game}/${r.version}/${r.id}'">
              <div class="card-header">
                <div class="card-title">${escapeHtml(r.name)}</div>
                <span class="badge badge-accent">${escapeHtml(r.type)}</span>
              </div>
              <div class="tag-list" style="margin-bottom: var(--sp-sm);">
                <span class="badge badge-neutral">${escapeHtml(r.version)}</span>
                ${(r.tags || []).map(t => `<span class="badge badge-neutral">${escapeHtml(t)}</span>`).join('')}
              </div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">Updated ${formatDate(r.lastUpdated)}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>`;
}

async function renderReferenceDetail(container, params) {
  // params can be "game/version/name" or just "name" (legacy)
  const parts = params.split('/');
  let ref;
  if (parts.length >= 3) {
    const [game, version, ...nameParts] = parts;
    const name = nameParts.join('/');
    ref = await api.getReferenceByPath(game, version, name);
  } else {
    ref = await api.getReference(parts[0]);
  }

  container.innerHTML = `
    <div class="fade-in">
      <button class="back-btn" onclick="location.hash='#/references'">← Back to References</button>
      <div class="page-header">
        <h1>${escapeHtml(ref.name)}</h1>
        <p>Type: <strong>${escapeHtml(ref.type)}</strong>${ref.game ? ` · Game: <strong>${escapeHtml(ref.game)}</strong>` : ''}${ref.version ? ` · Version: <strong>${escapeHtml(ref.version)}</strong>` : ''} · Updated ${formatDate(ref.lastUpdated)}</p>
      </div>
      <div class="tag-list" style="margin-bottom: var(--sp-lg);">
        ${(ref.tags || []).map(t => `<span class="badge badge-neutral">${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="detail-panel">
        <div class="detail-body markdown-body" id="ref-content"></div>
      </div>
    </div>`;

  container.querySelector('#ref-content').innerHTML = marked.parse(ref.content || '');
}
