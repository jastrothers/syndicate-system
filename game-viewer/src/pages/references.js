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

  const allTypes = [...new Set(refs.map(r => r.type).filter(Boolean))].sort();
  const allTags = [...new Set(refs.flatMap(r => r.tags || []))].sort();

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

      <div style="margin-bottom:var(--sp-lg);">
        <div style="display:flex;gap:var(--sp-xs);flex-wrap:wrap;margin-bottom:var(--sp-sm);">
          <button class="tab-btn active" data-ref-type="all" onclick="filterRefs('type','all',this)">All Types</button>
          ${allTypes.map(t => `<button class="tab-btn" data-ref-type="${escapeHtml(t)}" onclick="filterRefs('type','${escapeHtml(t)}',this)">${escapeHtml(t)}</button>`).join('')}
        </div>
        ${allTags.length > 0 ? `
        <div style="display:flex;gap:var(--sp-xs);flex-wrap:wrap;">
          ${allTags.map(t => `<button class="tab-btn" data-ref-tag="${escapeHtml(t)}" onclick="filterRefs('tag','${escapeHtml(t)}',this)" style="font-size:var(--text-xs);">#${escapeHtml(t)}</button>`).join('')}
        </div>` : ''}
      </div>

      ${sortedGames.map(game => `
        <div class="section-row" style="margin-top: var(--sp-lg);" data-game-section="${escapeHtml(game)}">
          <div class="section-title">${escapeHtml(game)}</div>
          <span class="badge badge-accent">${grouped[game].length} reference${grouped[game].length !== 1 ? 's' : ''}</span>
        </div>
        <div class="grid-2 stagger" data-game-grid="${escapeHtml(game)}">
          ${grouped[game].map(r => `
            <div class="card card-clickable" data-ref-type="${escapeHtml(r.type)}" data-ref-tags="${escapeHtml((r.tags||[]).join(','))}" onclick="location.hash='#/references/${r.game}/${r.version}/${r.id}'">
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

  let _refTypeFilter = 'all', _refTagFilter = null;
  window.filterRefs = (dimension, value, btn) => {
    if (dimension === 'type') {
      container.querySelectorAll('[data-ref-type]').forEach(b => { if (b.tagName === 'BUTTON') b.classList.remove('active'); });
      btn.classList.add('active');
      _refTypeFilter = value;
    } else {
      const wasActive = btn.classList.contains('active');
      container.querySelectorAll('[data-ref-tag]').forEach(b => b.classList.remove('active'));
      _refTagFilter = wasActive ? null : value;
      if (!wasActive) btn.classList.add('active');
    }
    container.querySelectorAll('.card[data-ref-type]').forEach(card => {
      const typeMatch = _refTypeFilter === 'all' || card.dataset.refType === _refTypeFilter;
      const tagMatch = !_refTagFilter || (card.dataset.refTags || '').split(',').includes(_refTagFilter);
      card.style.display = (typeMatch && tagMatch) ? '' : 'none';
    });
    // Hide empty game sections
    sortedGames.forEach(game => {
      const grid = container.querySelector(`[data-game-grid="${CSS.escape(game)}"]`);
      const section = container.querySelector(`[data-game-section="${CSS.escape(game)}"]`);
      if (grid && section) {
        const anyVisible = Array.from(grid.querySelectorAll('.card')).some(c => c.style.display !== 'none');
        grid.style.display = anyVisible ? '' : 'none';
        section.style.display = anyVisible ? '' : 'none';
      }
    });
  };
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
