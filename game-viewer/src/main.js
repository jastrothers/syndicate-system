import './style.css';
import { renderDashboard } from './pages/dashboard.js';
import { renderRulebooks } from './pages/rulebooks.js';
import { renderSessions } from './pages/sessions.js';
import { renderReferences } from './pages/references.js';
import { renderPlaytestLogs } from './pages/playtest-logs.js';
import { renderSyndicate } from './pages/syndicate.js';
import { renderValidation } from './pages/validation.js';

const app = document.getElementById('app');
const navLinks = document.querySelectorAll('.nav-link');

const routes = {
  '/': renderDashboard,
  '/rulebooks': renderRulebooks,
  '/sessions': renderSessions,
  '/references': renderReferences,
  '/playtest-logs': renderPlaytestLogs,
  '/syndicate': renderSyndicate,
  '/validation': renderValidation,
};

function getRoute() {
  const hash = window.location.hash.slice(1) || '/';
  // Support sub-routes like /sessions/abc-123
  for (const key of Object.keys(routes)) {
    if (hash === key || hash.startsWith(key + '/')) return { path: key, params: hash.slice(key.length + 1) };
  }
  return { path: '/', params: '' };
}

function updateNav(path) {
  navLinks.forEach(link => {
    const page = link.getAttribute('href').slice(1) || '/';
    link.classList.toggle('active', path === page || (page !== '/' && path.startsWith(page)));
  });
}

async function navigate() {
  const { path, params } = getRoute();
  updateNav(path);
  app.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const renderer = routes[path] || routes['/'];
  try {
    app.innerHTML = '';
    await renderer(app, params);
  } catch (err) {
    app.innerHTML = `<div class="empty-state"><h3>Error loading page</h3><p>${err.message}</p></div>`;
    console.error(err);
  }
}

window.addEventListener('hashchange', navigate);
navigate();
