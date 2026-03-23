// Centralized API fetch wrapper
const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getRulebooks: () => get('/rulebooks'),
  getRulebook: (name) => get(`/rulebooks/${name}`),
  getRulebookVersions: (name) => get(`/rulebooks/${name}/versions`),
  getRulebookVersion: (name, tag) => get(`/rulebooks/${name}/versions/${tag}`),
  getRulebookMarkdown: (name) => get(`/rulebooks/${name}/markdown`),
  getRulebookComponents: (name) => get(`/rulebooks/${name}/components`),
  getSessions: () => get('/sessions'),
  getSession: (id) => get(`/sessions/${id}`),
  getReferences: () => get('/references'),
  getReference: (name) => get(`/references/${name}`),
  getReferenceByPath: (game, version, name) => get(`/references/${game}/${version}/${name}`),
  getPlaytestLogs: () => get('/playtest-logs'),
  getSyndicateContent: () => get('/syndicate/content'),
  getDesignResources: (name) => get(`/rulebooks/${name}/designs`),
  getDesignResource: (name, id) => get(`/rulebooks/${name}/designs/${id}`),
  validate: () => get('/validate'),
  getDesignerProfile: () => get('/designer-profile'),
  getDesignSessions: () => get('/design-sessions'),
  getDesignSession: (game, id) => get(`/design-sessions/${game}/${id}`),
};
