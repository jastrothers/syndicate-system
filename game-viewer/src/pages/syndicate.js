import { api } from '../api.js';
import { formatDate, emptyStateHtml, escapeHtml } from '../utils.js';
import { marked } from 'marked';

export async function renderSyndicate(container, params) {
  if (params) return renderSyndicateDetail(container, params);
  
  const content = await api.getSyndicateContent();

  if (content.length === 0) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Syndicate R&D</h1><p>System design, themes, and planning</p></div>
        ${emptyStateHtml('No Content', 'No Syndicate Deckbuilder content found.')}
      </div>`;
    return;
  }

  // Group by category
  const grouped = {
    'rules': [],
    'themes': [],
    'planning': []
  };

  content.forEach(item => {
    const rootCat = item.category.split('/')[0];
    if (grouped[rootCat]) grouped[rootCat].push(item);
    else {
      if (!grouped[rootCat]) grouped[rootCat] = [];
      grouped[rootCat].push(item);
    }
  });

  const categories = Object.keys(grouped).filter(cat => grouped[cat].length > 0);

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Syndicate R&D</h1>
        <p>Design artifacts and system evolution from <code>syndicate-deckbuilder</code></p>
      </div>
      
      ${categories.map(cat => `
        <div class="section-row" style="margin-top: var(--sp-lg);">
          <div class="section-title" style="text-transform: capitalize;">${escapeHtml(cat)}</div>
          <span class="badge badge-accent">${grouped[cat].length} document${grouped[cat].length !== 1 ? 's' : ''}</span>
        </div>
        <div class="grid-2 stagger">
          ${grouped[cat].map(item => `
            <div class="card card-clickable" onclick="location.hash='#/syndicate/${item.category}/${item.id}'">
              <div class="card-header">
                <div class="card-title">${escapeHtml(item.name)}</div>
                <div class="card-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                </div>
              </div>
              <div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--sp-xs);">
                Path: <code>${escapeHtml(item.path)}</code>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>`;
}

async function renderSyndicateDetail(container, params) {
  const content = await api.getSyndicateContent();
  // params will be categories/id
  const item = content.find(i => `${i.category}/${i.id}` === params);

  if (!item) {
    container.innerHTML = emptyStateHtml('Not Found', 'The requested document could not be found.');
    return;
  }

  container.innerHTML = `
    <div class="fade-in">
      <button class="back-btn" onclick="location.hash='#/syndicate'">← Back to Syndicate R&D</button>
      <div class="page-header">
        <h1>${escapeHtml(item.name)}</h1>
        <p>Category: <strong style="text-transform: capitalize;">${escapeHtml(item.category)}</strong> · Path: <code>${escapeHtml(item.path)}</code></p>
      </div>
      <div class="detail-panel">
        <div class="detail-body markdown-body" id="doc-content"></div>
      </div>
    </div>`;

  container.querySelector('#doc-content').innerHTML = marked.parse(item.content || '');
}
