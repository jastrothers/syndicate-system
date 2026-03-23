import { api } from '../api.js';
import { formatDate, emptyStateHtml, escapeHtml } from '../utils.js';
import { marked } from 'marked';

export async function renderRulebooks(container, params) {
  if (params) return renderRulebookDetail(container, params);
  const rulebooks = await api.getRulebooks();

  if (rulebooks.length === 0) {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Rulebooks</h1><p>All game rulebooks stored in the system</p></div>
        ${emptyStateHtml('No Rulebooks', 'No rulebooks have been created yet. Use the MCP tools to create one.')}
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header"><h1>Rulebooks</h1><p>All game rulebooks stored in the system</p></div>
      <div class="grid-2 stagger">
        ${rulebooks.map(r => `
          <div class="card card-clickable" onclick="location.hash='#/rulebooks/${r.name}'">
            <div class="card-header">
              <div>
                <div class="card-title">${escapeHtml(r.metadata?.title || r.name)}</div>
                <div class="card-subtitle">${r.name}</div>
              </div>
              <span class="badge badge-accent">v${r.metadata?.version || '?'}</span>
            </div>
            <div class="meta-row">
              <div class="meta-item"><strong>${r.sectionCount}</strong> sections</div>
              <div class="meta-item">Updated ${formatDate(r.metadata?.lastUpdated)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}

async function renderRulebookDetail(container, name) {
  const [rulebook, versions, components, markdown, designs] = await Promise.all([
    api.getRulebook(name),
    api.getRulebookVersions(name).catch(() => []),
    api.getRulebookComponents(name).catch(() => []),
    api.getRulebookMarkdown(name).catch(() => ({ content: '' })),
    api.getDesignResources(name).catch(() => [])
  ]);

  container.innerHTML = `
    <div class="fade-in">
      <button class="back-btn" onclick="location.hash='#/rulebooks'">← Back to Rulebooks</button>
      <div class="page-header">
        <h1>${escapeHtml(rulebook.metadata?.title || name)}</h1>
        <p>v${rulebook.metadata?.version || '?'} · Last updated ${formatDate(rulebook.metadata?.lastUpdated)}</p>
      </div>

      <div class="tabs" id="rb-tabs">
        <button class="tab-btn active" data-tab="markdown">Rulebook</button>
        <button class="tab-btn" data-tab="structure">Rule Structure</button>
        <button class="tab-btn" data-tab="versions">Versions (${versions.length})</button>
        <button class="tab-btn" data-tab="components">Components (${components.length})</button>
        <button class="tab-btn" data-tab="design">Design History (${designs.length})</button>
      </div>

      <div id="tab-content"></div>
    </div>`;

  const tabContent = container.querySelector('#tab-content');
  const tabBtns = container.querySelectorAll('.tab-btn');

  function showTab(tab) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'markdown') renderMarkdownTab(tabContent, markdown.content);
    else if (tab === 'structure') renderTree(tabContent, rulebook.sections || {});
    else if (tab === 'versions') renderVersions(tabContent, versions);
    else if (tab === 'components') renderComponents(tabContent, components);
    else if (tab === 'design') renderDesignTab(tabContent, name, designs);
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));
  showTab('markdown');
}

async function renderDesignTab(container, gameName, designs) {
  if (designs.length === 0) {
    container.innerHTML = emptyStateHtml('No Design History', 'No design steps or sessions found for this game.');
    return;
  }

  container.innerHTML = `
    <div class="grid-2 stagger" style="margin-top: var(--sp-md);">
      ${designs.map(d => `
        <div class="card card-clickable" onclick="this.dispatchEvent(new CustomEvent('view-design', { detail: { id: '${d.id}', type: '${d.type}' }, bubbles: true }))">
          <div class="card-header">
            <div>
              <div class="card-title">${escapeHtml(d.name)}</div>
              <div class="card-subtitle">${escapeHtml(d.id)}</div>
            </div>
            <span class="badge ${d.type === 'step' ? 'badge-accent' : 'badge-info'}">${d.type}</span>
          </div>
          ${d.updatedAt ? `<div class="meta-row"><div class="meta-item">Updated ${formatDate(d.updatedAt)}</div></div>` : ''}
        </div>
      `).join('')}
    </div>
    <div id="design-detail-view" style="margin-top: var(--sp-lg); display: none;"></div>
  `;

  const detailView = container.querySelector('#design-detail-view');

  container.addEventListener('view-design', async (e) => {
    const { id, type } = e.detail;
    detailView.style.display = 'block';
    detailView.innerHTML = '<div class="card" style="padding: var(--sp-md);">Loading design content...</div>';
    detailView.scrollIntoView({ behavior: 'smooth' });

    try {
      const resource = await api.getDesignResource(gameName, id);
      if (type === 'step') {
        detailView.innerHTML = `
          <div class="detail-panel fade-in">
            <div class="detail-header">
              <div class="detail-title">${escapeHtml(id)}</div>
              <button class="back-btn" style="margin: 0;" onclick="this.closest('#design-detail-view').style.display='none'">Close</button>
            </div>
            <div class="detail-body markdown-body">
              ${marked.parse(resource.content || '')}
            </div>
          </div>`;
      } else {
        // Design Session
        const steps = resource.content.steps || [];
        detailView.innerHTML = `
          <div class="detail-panel fade-in">
            <div class="detail-header">
              <div class="detail-title">${escapeHtml(resource.content.theme || 'Design Session')}</div>
              <button class="back-btn" style="margin: 0;" onclick="this.closest('#design-detail-view').style.display='none'">Close</button>
            </div>
            <div class="detail-body">
              <div class="meta-row" style="margin-bottom: var(--sp-md);">
                <span class="badge badge-accent">Session ID: ${resource.content.sessionId}</span>
                <span class="badge badge-neutral">Status: ${resource.content.status}</span>
              </div>
              <ul class="timeline">
                ${steps.map(s => `
                  <li class="timeline-item">
                    <div class="timeline-dot ${s.persona === 'MechanicsArchitect' ? 'accent' : 'default'}"></div>
                    <div class="timeline-content">
                      <div class="timeline-action">${escapeHtml(s.persona)} - Step ${s.stepNumber}</div>
                      <div class="timeline-actor" style="font-weight: 600;">${escapeHtml(s.summary)}</div>
                      <div class="markdown-body" style="margin-top: var(--sp-sm); font-size: var(--text-sm);">
                        ${marked.parse(s.output || '')}
                      </div>
                      <div class="mono" style="font-size: var(--text-xs); color: var(--text-muted); margin-top: var(--sp-xs);">${formatDate(s.timestamp)}</div>
                    </div>
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>`;
      }
    } catch (err) {
      detailView.innerHTML = `<div class="card" style="padding: var(--sp-md); color: var(--text-error);">Error loading design resource: ${err.message}</div>`;
    }
  });
}

function extractHeadings(md) {
  const headings = [];
  const re = /^(#{1,3})\s+(.+)$/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    headings.push({ level: m[1].length, text: m[2].trim() });
  }
  return headings;
}

function renderMarkdownTab(container, content) {
  if (!content) {
    container.innerHTML = emptyStateHtml('No Content', 'No markdown content available for this rulebook.');
    return;
  }

  const headings = extractHeadings(content);
  const showToc = headings.length >= 3;

  if (showToc) {
    container.innerHTML = `
      <div style="display:flex;gap:var(--sp-xl);align-items:flex-start;">
        <nav style="width:190px;flex-shrink:0;position:sticky;top:var(--sp-lg);max-height:80vh;overflow-y:auto;padding-right:var(--sp-sm);">
          <div style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--sp-sm);font-weight:600;">Contents</div>
          ${headings.map((h, i) => `
            <div style="padding:3px 0 3px ${(h.level - 1) * 12}px;">
              <a class="toc-link" data-idx="${i}" href="javascript:void(0)"
                 style="font-size:var(--text-xs);color:var(--text-secondary);line-height:1.4;display:block;transition:color var(--duration) var(--ease);"
                 onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text-secondary)'"
              >${escapeHtml(h.text)}</a>
            </div>
          `).join('')}
        </nav>
        <div class="detail-panel stagger" style="flex:1;min-width:0;">
          <div class="detail-body markdown-body" id="md-content">${marked.parse(content)}</div>
        </div>
      </div>`;

    const mdEl = container.querySelector('#md-content');
    const hdEls = mdEl ? Array.from(mdEl.querySelectorAll('h1,h2,h3')) : [];
    hdEls.forEach((el, i) => { el.id = `md-h-${i}`; });
    container.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', () => {
        const idx = parseInt(link.dataset.idx, 10);
        hdEls[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  } else {
    container.innerHTML = `
      <div class="detail-panel stagger">
        <div class="detail-body markdown-body">${marked.parse(content)}</div>
      </div>`;
  }
}

function renderTree(container, sections, depth = 0) {
  if (!sections || Object.keys(sections).length === 0) {
    container.innerHTML = emptyStateHtml('No Sections', 'This rulebook has no rule sections.');
    return;
  }

  const html = buildTreeHtml(sections, depth);
  container.innerHTML = `
    <div style="display:flex;gap:var(--sp-sm);margin-bottom:var(--sp-md);align-items:center;">
      <input type="text" id="tree-search" placeholder="Search sections…"
        style="flex:1;background:var(--bg-active);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:var(--sp-xs) var(--sp-md);color:var(--text-primary);font-size:var(--text-sm);font-family:var(--font-sans);outline:none;"
        oninput="filterTree(this.value)">
      <button class="tab-btn" onclick="expandAllTree()">Expand All</button>
      <button class="tab-btn" onclick="collapseAllTree()">Collapse All</button>
    </div>
    <ul class="tree stagger">${html}</ul>`;

  // Toggle handlers
  container.querySelectorAll('.tree-label').forEach(label => {
    label.addEventListener('click', () => {
      label.classList.toggle('open');
      const content = label.nextElementSibling;
      if (content) content.classList.toggle('visible');
    });
  });

  window.filterTree = (query) => {
    const q = query.toLowerCase().trim();
    container.querySelectorAll('.tree-item').forEach(item => {
      const text = item.querySelector('.tree-label span:last-child')?.textContent.toLowerCase() || '';
      const key = item.querySelector('.tree-label .badge')?.textContent.toLowerCase() || '';
      item.style.display = (!q || text.includes(q) || key.includes(q)) ? '' : 'none';
    });
  };
  window.expandAllTree = () => {
    container.querySelectorAll('.tree-content').forEach(el => el.classList.add('visible'));
    container.querySelectorAll('.tree-label').forEach(el => el.classList.add('open'));
  };
  window.collapseAllTree = () => {
    container.querySelectorAll('.tree-content').forEach(el => el.classList.remove('visible'));
    container.querySelectorAll('.tree-label').forEach(el => el.classList.remove('open'));
  };
}

function buildTreeHtml(sections, depth) {
  return Object.entries(sections).map(([key, section]) => {
    const hasContent = section.content || (section.examples && section.examples.length > 0);
    const hasSubsections = section.subsections && Object.keys(section.subsections).length > 0;

    return `
      <li class="tree-item">
        <div class="tree-label">
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          <span class="badge badge-neutral" style="font-family: var(--font-mono);">${escapeHtml(key)}</span>
          <span>${escapeHtml(section.title || key)}</span>
        </div>
        <div class="tree-content">
          ${section.content ? `<p>${escapeHtml(section.content)}</p>` : ''}
          ${section.examples && section.examples.length > 0 ? `
            <ul class="tree-examples">
              ${section.examples.map(ex => `<li>${escapeHtml(ex)}</li>`).join('')}
            </ul>
          ` : ''}
          ${hasSubsections ? `<ul class="tree" style="margin-top: var(--sp-sm);">${buildTreeHtml(section.subsections, depth + 1)}</ul>` : ''}
        </div>
      </li>`;
  }).join('');
}

function renderVersions(container, versions) {
  if (versions.length === 0) {
    container.innerHTML = emptyStateHtml('No Versions', 'No version snapshots have been created yet.');
    return;
  }

  container.innerHTML = `
    <ul class="timeline stagger">
      ${versions.map(v => `
        <li class="timeline-item">
          <div class="timeline-dot default">📌</div>
          <div class="timeline-content">
            <div class="timeline-action">v${escapeHtml(v.versionTag)}</div>
            <div class="timeline-actor">${v.metadata?.description || v.description || 'No description'}</div>
            <div style="margin-top: 4px; font-size: var(--text-xs); color: var(--text-muted);">
              ${v.sectionCount} sections · ${formatDate(v.metadata?.lastUpdated || v.lastUpdated)}
            </div>
          </div>
        </li>
      `).join('')}
    </ul>`;
}

function renderComponents(container, components) {
  if (components.length === 0) {
    container.innerHTML = emptyStateHtml('No Components', 'No components have been defined for this game.');
    return;
  }

  container.innerHTML = `
    <div class="grid-2 stagger" style="margin-top: var(--sp-md);">
      ${components.map(c => `
        <div class="card" style="padding: 0; overflow: hidden;">
          <div class="card-header card-clickable" style="padding: var(--sp-md); margin: 0; background: var(--bg-elevated);" onclick="
            const el = document.getElementById('comp-${escapeHtml(c.id)}');
            const isOpen = el.style.display !== 'none';
            el.style.display = isOpen ? 'none' : 'block';
            this.style.borderBottom = isOpen ? 'none' : '1px solid var(--glass-border)';
          ">
            <div>
              <div class="card-title">${escapeHtml(c.name)}</div>
              <div class="tag-list" style="margin-top: var(--sp-xs);">
                <span class="badge badge-accent">${escapeHtml(c.type)}</span>
                ${(c.tags || []).map(t => `<span class="badge badge-neutral">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>
          </div>
          <div id="comp-${escapeHtml(c.id)}" style="display: none; padding: var(--sp-md); max-height: 400px; overflow-y: auto;">
            <div class="markdown-body">
              ${marked.parse(c.content || '')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>`;
}
