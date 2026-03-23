import { api } from '../api.js';
import { formatDate, emptyStateHtml, escapeHtml } from '../utils.js';

export async function renderDesignerProfile(container) {
  let profile;
  try {
    profile = await api.getDesignerProfile();
  } catch {
    container.innerHTML = `
      <div class="fade-in">
        <div class="page-header"><h1>Designer Profile</h1><p>Accumulated design preferences from the Nova Loop</p></div>
        ${emptyStateHtml('Profile Not Found', 'No designer profile has been created yet. Start a design session to build preferences.')}
      </div>`;
    return;
  }

  const affinities = profile.affinities || {};
  const sortedAffinities = Object.entries(affinities).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const complexityTolerance = profile.complexityTolerance || 0;
  const thematicPreferences = profile.thematicPreferences || [];

  container.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Designer Profile</h1>
        <p>Accumulated preferences from the Nova reinforcement learning loop</p>
      </div>

      <div class="grid-2" style="margin-bottom: var(--sp-xl);">
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Profile Metadata</div>
              <div class="card-subtitle">Last updated ${formatDate(profile.lastUpdated)}</div>
            </div>
          </div>
          <div style="margin-top: var(--sp-md);">
            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--sp-xs);">Complexity Tolerance</div>
            <div class="pip-row">
              ${[1, 2, 3, 4, 5].map(i => `<span class="pip ${i <= complexityTolerance ? 'pip-active' : 'pip-inactive'}" title="Level ${i}"></span>`).join('')}
              <span style="font-size: var(--text-sm); color: var(--text-secondary); margin-left: var(--sp-sm);">${complexityTolerance} / 5</span>
            </div>
          </div>
          <div style="margin-top: var(--sp-lg);">
            <div style="font-size: var(--text-sm); color: var(--text-secondary); margin-bottom: var(--sp-sm);">Thematic Preferences</div>
            ${thematicPreferences.length === 0
              ? '<p style="font-size: var(--text-sm); color: var(--text-muted);">No thematic preferences recorded yet.</p>'
              : `<div class="tag-list">${thematicPreferences.map(p => `<span class="badge badge-accent">${escapeHtml(p)}</span>`).join('')}</div>`
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">Mechanism Affinities</div>
              <div class="card-subtitle">${sortedAffinities.length} mechanism${sortedAffinities.length !== 1 ? 's' : ''} tracked</div>
            </div>
          </div>
          <div style="margin-top: var(--sp-md); font-size: var(--text-xs); color: var(--text-muted); margin-bottom: var(--sp-sm);">
            Green bars = positive affinity · Red bars = negative affinity · Sorted by signal strength
          </div>
          ${sortedAffinities.length === 0
            ? '<p style="font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--sp-md);">No affinities recorded yet.</p>'
            : sortedAffinities.map(([mech, val]) => `
              <div class="affinity-row">
                <span class="affinity-label">${escapeHtml(mech.replace(/_/g, ' '))}</span>
                <div class="affinity-bar-track">
                  <div class="affinity-bar ${val >= 0 ? 'affinity-pos' : 'affinity-neg'}"
                       style="width: ${Math.abs(val) * 100}%">
                  </div>
                </div>
                <span class="affinity-value">${val >= 0 ? '+' : ''}${val.toFixed(3)}</span>
              </div>
            `).join('')
          }
        </div>
      </div>

      <div style="font-size: var(--text-xs); color: var(--text-muted); text-align: center;">
        Affinities are updated via <code>record_decision</code> in the Nova Loop · Range: −1.0 (strong reject) to +1.0 (strong accept)
      </div>
    </div>
  `;
}
