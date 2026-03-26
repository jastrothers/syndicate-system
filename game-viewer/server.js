console.log('--- SERVER CODE RELOADED V5 ---');
import express from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fsSync.writeFileSync('server-start.log', 'SERVER STARTING AT ' + new Date().toISOString() + '\n');
const GAME_DATA = path.resolve(__dirname, '../game-rules-system-mcp/game-data');
const SYNDICATE_DIR = path.resolve(__dirname, '../syndicate-deckbuilder');

const app = express();

app.get('/api/debug-now', (req, res) => {
  res.json({ debug: 'active-v2', time: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), gameData: GAME_DATA });
});

// Request logging middleware
app.use((req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.url}\n`;
  console.log(log.trim());
  fsSync.appendFileSync('requests.log', log);
  next();
});

// ── Helpers ──────────────────────────────────────────────────────────

/** Safely check if a path exists */
async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

/** Recursively walk [game]/[type]/[version]/ directories and collect files matching an extension */
async function walkGameTypeDir(baseDir, type, ext) {
  const results = [];
  if (!await exists(baseDir)) return results;
  
  const gameEntries = await fs.readdir(baseDir, { withFileTypes: true });

  for (const gameEntry of gameEntries) {
    if (!gameEntry.isDirectory() || gameEntry.name.startsWith('_')) continue;
    const gameName = gameEntry.name;
    const typeDir = path.join(baseDir, gameName, type);
    
    if (!await exists(typeDir)) continue;

    const versionEntries = await fs.readdir(typeDir, { withFileTypes: true }).catch(() => []);

    for (const versionEntry of versionEntries) {
      if (!versionEntry.isDirectory()) continue;
      const versionName = versionEntry.name;
      const versionDir = path.join(typeDir, versionName);
      const files = await fs.readdir(versionDir).catch(() => []);

      for (const file of files) {
        if (file.endsWith(ext)) {
          results.push({ filePath: path.join(versionDir, file), game: gameName, version: versionName });
        }
      }
    }
  }

  return results;
}

// ── Rulebooks ────────────────────────────────────────────────────────
app.get('/api/rulebooks', async (_req, res) => {
  try {
    const games = (await fs.readdir(GAME_DATA, { withFileTypes: true })).filter(e => e.isDirectory() && !e.name.startsWith('_'));
    const results = [];
    for (const game of games) {
      const rbDir = path.join(GAME_DATA, game.name, 'rulebooks');
      if (!await exists(rbDir)) continue;
      
      try {
        const data = JSON.parse(await fs.readFile(path.join(rbDir, 'latest.json'), 'utf-8'));
        results.push({ 
          name: game.name, 
          metadata: data.metadata, 
          sectionCount: countSections(data.sections || {}) 
        });
      } catch { 
        results.push({ name: game.name, metadata: null, sectionCount: 0 }); 
      }
    }
    res.json(results);
  } catch (e) { res.json([]); }
});

app.get('/api/rulebooks/:name/markdown', async (req, res) => {
  const { name } = req.params;
  console.log(`Fetching markdown for rulebook: ${name}`);
  try {
    // Special case for syndicate (source of truth is in syndicate-deckbuilder)
    if (name === 'syndicate' || name === 'CoreRules') {
      const coreRulesPath = path.join(SYNDICATE_DIR, 'rules', 'CoreRules.md');
      if (await exists(coreRulesPath)) {
        const content = await fs.readFile(coreRulesPath, 'utf-8');
        return res.json({ content });
      }
    }

    const rbDir = path.join(GAME_DATA, name, 'rulebooks');
    const mdPath = path.join(rbDir, 'latest.md');
    
    if (await exists(mdPath)) {
      console.log(`Serving existing markdown for ${name}`);
      const content = await fs.readFile(mdPath, 'utf-8');
      return res.json({ content });
    }

    // Fallback: generate from latest.json
    const jsonPath = path.join(rbDir, 'latest.json');
    console.log(`Checking fallback path: ${jsonPath}`);
    if (await exists(jsonPath)) {
      console.log(`Generating markdown from JSON for ${name}`);
      const data = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));
      let md = `# ${data.metadata?.title || name}\n\n`;
      if (data.metadata?.version) md += `*Version: ${data.metadata.version}*\n`;
      if (data.metadata?.lastUpdated) md += `*Last Updated: ${new Date(data.metadata.lastUpdated).toLocaleString()}*\n\n`;
      md += `---\n\n`;
      md += generateMarkdown(data.sections || {}, 2);
      return res.json({ content: md });
    }

    console.warn(`Markdown not found for ${name}`);
    res.status(404).json({ error: 'Rulebook markdown not found' });
  } catch (e) {
    console.error(`Error generating markdown for ${name}:`, e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/rulebooks/:name/versions', async (req, res) => {
  try {
    const dir = path.join(GAME_DATA, req.params.name, 'rulebooks');
    const files = await fs.readdir(dir);
    const versions = [];
    for (const file of files) {
      if (!file.endsWith('.json') || file === 'latest.json') continue;
      try {
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        versions.push({
          versionTag: file.replace(/^v/, '').replace(/\.json$/, ''),
          metadata: data.metadata,
          sectionCount: countSections(data.sections || {})
        });
      } catch {}
    }
    res.json(versions);
  } catch { res.json([]); }
});

app.get('/api/rulebooks/:name/versions/:tag', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(path.join(GAME_DATA, req.params.name, 'rulebooks', `v${req.params.tag}.json`), 'utf-8'));
    res.json(data);
  } catch { res.status(404).json({ error: 'Version not found' }); }
});

app.get('/api/rulebooks/:name/components', async (req, res) => {
  try {
    // Look in the nested reference structure: game-data/[game]/reference/latest/
    const componentsDir = path.join(GAME_DATA, req.params.name, 'reference', 'latest');
    if (!await exists(componentsDir)) { res.json([]); return; }
    const files = (await fs.readdir(componentsDir)).filter(f => f.endsWith('.md'));
    const components = [];
    for (const file of files) {
      try {
        const raw = await fs.readFile(path.join(componentsDir, file), 'utf-8');
        const { data, content } = matter(raw);
        components.push({
          id: file.replace(/\.md$/, ''),
          name: data.title || file.replace(/\.md$/, ''),
          type: data.type || 'general',
          tags: data.tags || [],
          game: req.params.name,
          version: 'latest',
          lastUpdated: data.lastUpdated,
          content: content.trim()
        });
      } catch {}
    }
    res.json(components);
  } catch { res.json([]); }
});

app.get('/api/rulebooks/:name/designs', async (req, res) => {
  const { name } = req.params;
  const gameDir = path.join(GAME_DATA, name);
  const designs = [];

  try {
    if (!await exists(gameDir)) return res.json([]);

    // 1. Collect stepX-*.md files from game root (legacy location)
    const items = await fs.readdir(gameDir, { withFileTypes: true });
    for (const item of items) {
      if (item.isFile() && item.name.startsWith('step') && item.name.endsWith('.md')) {
        designs.push({
          id: item.name,
          name: item.name.replace(/^step\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' '),
          type: 'step',
          filename: item.name
        });
      }
    }

    // 2. Collect design sessions (JSON) and step*.md artifacts from [game]/design/
    const designDir = path.join(gameDir, 'design');
    if (await exists(designDir)) {
      const designDirItems = await fs.readdir(designDir, { withFileTypes: true });
      for (const item of designDirItems) {
        if (item.isFile() && item.name.startsWith('step') && item.name.endsWith('.md')) {
          designs.push({
            id: `design/${item.name}`,
            name: item.name.replace(/^step\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' '),
            type: 'step',
            filename: item.name
          });
        }
      }
      const sessionFiles = designDirItems.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name);
      for (const file of sessionFiles) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(designDir, file), 'utf-8'));
          designs.push({
            id: file,
            name: `Design Session: ${data.theme ||'Untitled'}`,
            type: 'session',
            filename: file,
            updatedAt: data.lastUpdatedAt || data.createdAt
          });
        } catch {}
      }
    }

    designs.sort((a, b) => a.id.localeCompare(b.id));
    res.json(designs);
  } catch (e) {
    console.error(`Error listing designs for ${name}:`, e);
    res.json([]);
  }
});

app.get('/api/rulebooks/:name/designs/:id', async (req, res) => {
  const { name, id } = req.params;
  const gameDir = path.join(GAME_DATA, name);
  
  try {
    let filePath;
    if (id.startsWith('design/') && id.endsWith('.md')) {
      // step*.md living inside the design/ subdirectory
      filePath = path.join(gameDir, id);
    } else if (id.endsWith('.md')) {
      // legacy step*.md at game root
      filePath = path.join(gameDir, id);
    } else if (id.endsWith('.json')) {
      filePath = path.join(gameDir, 'design', id);
    } else {
      return res.status(400).json({ error: 'Invalid design resource ID' });
    }

    if (!await exists(filePath)) {
      return res.status(404).json({ error: 'Design resource not found' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    if (id.endsWith('.md')) {
      const { data, content: mdContent } = matter(content);
      res.json({ id, type: 'step', content: mdContent, metadata: data });
    } else {
      res.json({ id, type: 'session', content: JSON.parse(content) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/rulebooks/:name', async (req, res) => {
  res.setHeader('X-Debug', 'Active-V3');
  try {
    const data = JSON.parse(await fs.readFile(path.join(GAME_DATA, req.params.name, 'rulebooks', 'latest.json'), 'utf-8'));
    res.json(data);
  } catch { res.status(404).json({ error: 'Rulebook not found' }); }
});


// ── Sessions (nested: sessions/[game]/[version]/*.json) ─────────────
app.get('/api/sessions', async (_req, res) => {
  try {
    const entries = await walkGameTypeDir(GAME_DATA, 'sessions', '.json');
    const sessions = [];
    for (const { filePath, game, version } of entries) {
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        sessions.push({
          sessionId: data.sessionId,
          rulebookName: data.rulebookName,
          rulebookVersion: data.rulebookVersion,
          game,
          version,
          stateKeys: Object.keys(data.state || {}),
          ledgerCount: (data.ledger || []).length,
          createdAt: data.createdAt,
          lastUpdatedAt: data.lastUpdatedAt
        });
      } catch {}
    }
    sessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
    res.json(sessions);
  } catch { res.json([]); }
});

app.get('/api/sessions/:id', async (req, res) => {
  try {
    // Search across all [game]/[version]/ for the matching session ID
    const entries = await walkGameTypeDir(GAME_DATA, 'sessions', '.json');
    const match = entries.find(e => path.basename(e.filePath, '.json') === req.params.id);
    if (!match) { res.status(404).json({ error: 'Session not found' }); return; }
    const data = JSON.parse(await fs.readFile(match.filePath, 'utf-8'));
    data._game = match.game;
    data._version = match.version;
    res.json(data);
  } catch { res.status(404).json({ error: 'Session not found' }); }
});

// ── References (nested: reference/[game]/[version]/*.md) ────────────
app.get('/api/references', async (_req, res) => {
  try {
    const entries = await walkGameTypeDir(GAME_DATA, 'reference', '.md');
    const refs = [];
    for (const { filePath, game, version } of entries) {
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(raw);
        refs.push({
          id: path.basename(filePath, '.md'),
          name: data.title || path.basename(filePath, '.md'),
          type: data.type || 'general',
          tags: data.tags || [],
          game,
          version,
          lastUpdated: data.lastUpdated
        });
      } catch {}
    }
    res.json(refs);
  } catch { res.json([]); }
});

app.get('/api/references/:game/:version/:name', async (req, res) => {
  try {
    const filePath = path.join(GAME_DATA, req.params.game, 'reference', req.params.version, `${req.params.name}.md`);
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    res.json({
      name: data.title || req.params.name,
      type: data.type || 'general',
      tags: data.tags || [],
      game: req.params.game,
      version: req.params.version,
      lastUpdated: data.lastUpdated,
      content: content.trim()
    });
  } catch { res.status(404).json({ error: 'Reference not found' }); }
});

// Backwards-compat: search across all games for a reference by name
app.get('/api/references/:name', async (req, res) => {
  try {
    const entries = await walkGameTypeDir(GAME_DATA, 'reference', '.md');
    const match = entries.find(e => path.basename(e.filePath, '.md') === req.params.name);
    if (!match) {
      res.status(404).json({ error: 'Reference not found' });
      return;
    }
    const raw = await fs.readFile(match.filePath, 'utf-8');
    const { data, content } = matter(raw);
    res.json({
      name: data.title || req.params.name,
      type: data.type || 'general',
      tags: data.tags || [],
      game: match.game,
      version: match.version,
      lastUpdated: data.lastUpdated,
      content: content.trim()
    });
  } catch { res.status(404).json({ error: 'Reference not found' }); }
});

// ── Playtest Logs ────────────────────────────────────────────────────
app.get('/api/playtest-logs', async (_req, res) => {
  try {
    const logs = [];
    // Per-game logs
    try {
      const games = (await fs.readdir(GAME_DATA, { withFileTypes: true })).filter(e => e.isDirectory() && !e.name.startsWith('_'));
      for (const game of games) {
        const logPath = path.join(GAME_DATA, game.name, 'logs', 'playtest_logs.md');
        if (!await exists(logPath)) continue;
        try {
          logs.push({ source: game.name, content: await fs.readFile(logPath, 'utf-8') });
        } catch {}
      }
    } catch {}
    // Global log (top level game-data)
    const globalLog = path.join(GAME_DATA, 'playtest_logs.md');
    try {
      if (await exists(globalLog)) {
        logs.push({ source: 'global', content: await fs.readFile(globalLog, 'utf-8') });
      }
    } catch {}
    res.json(logs);
  } catch { res.json([]); }
});

// ── Validation ───────────────────────────────────────────────────────
app.get('/api/validate', async (_req, res) => {
  const results = { checks: [], summary: { pass: 0, warn: 0, fail: 0 } };

  // 1. Check sessions (nested structure)
  try {
    const entries = await walkGameTypeDir(GAME_DATA, 'sessions', '.json');
    for (const { filePath, game, version } of entries) {
      const fileName = path.basename(filePath);
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        const issues = [];
        if (!data.sessionId) issues.push('Missing sessionId');
        if (!data.rulebookName) issues.push('Missing rulebookName');
        if (!data.state || typeof data.state !== 'object') issues.push('Missing or invalid state');
        if (!Array.isArray(data.ledger)) issues.push('Missing or invalid ledger');
        if (!data.createdAt) issues.push('Missing createdAt');
        if (issues.length === 0) {
          results.checks.push({ type: 'session', id: data.sessionId, game, version, status: 'pass', message: 'Valid session file' });
          results.summary.pass++;
        } else {
          results.checks.push({ type: 'session', id: fileName, game, version, status: 'fail', message: issues.join('; ') });
          results.summary.fail++;
        }
      } catch (e) {
        results.checks.push({ type: 'session', id: fileName, game, version, status: 'fail', message: `Invalid JSON: ${e.message}` });
        results.summary.fail++;
      }
    }
  } catch {}

  // 2. Check rulebooks
  try {
    const games = (await fs.readdir(GAME_DATA, { withFileTypes: true })).filter(e => e.isDirectory() && !e.name.startsWith('_'));
    for (const game of games) {
      const latestPath = path.join(GAME_DATA, game.name, 'rulebooks', 'latest.json');
      if (!await exists(latestPath)) continue;
      
      try {
        const data = JSON.parse(await fs.readFile(latestPath, 'utf-8'));
        const issues = [];
        if (!data.metadata) issues.push('Missing metadata');
        else {
          if (!data.metadata.title) issues.push('Missing metadata.title');
          if (!data.metadata.version) issues.push('Missing metadata.version');
        }
        if (!data.sections || typeof data.sections !== 'object') issues.push('Missing sections');
        if (issues.length === 0) {
          results.checks.push({ type: 'rulebook', id: game.name, status: 'pass', message: `Valid rulebook with ${countSections(data.sections || {})} sections` });
          results.summary.pass++;
        } else {
          results.checks.push({ type: 'rulebook', id: game.name, status: 'warn', message: issues.join('; ') });
          results.summary.warn++;
        }
      } catch (e) {
        results.checks.push({ type: 'rulebook', id: game.name, status: 'fail', message: `Cannot read latest.json: ${e.message}` });
        results.summary.fail++;
      }
    }
  } catch {}

  // 3. Check references (nested structure)
  try {
    const entries = await walkGameTypeDir(GAME_DATA, 'reference', '.md');
    for (const { filePath, game, version } of entries) {
      const fileName = path.basename(filePath);
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const { data } = matter(raw);
        const issues = [];
        if (!data.title) issues.push('Missing frontmatter title');
        if (!data.type) issues.push('Missing frontmatter type');
        if (issues.length === 0) {
          results.checks.push({ type: 'reference', id: fileName.replace(/\.md$/, ''), game, version, status: 'pass', message: `Valid reference (${data.type})` });
          results.summary.pass++;
        } else {
          results.checks.push({ type: 'reference', id: fileName.replace(/\.md$/, ''), game, version, status: 'warn', message: issues.join('; ') });
          results.summary.warn++;
        }
      } catch (e) {
        results.checks.push({ type: 'reference', id: fileName, game, version, status: 'fail', message: `Parse error: ${e.message}` });
        results.summary.fail++;
      }
    }
  } catch {}

  // 4. Cross-reference: sessions reference existing rulebooks
  try {
    const sessionEntries = await walkGameTypeDir(GAME_DATA, 'sessions', '.json');
    const games = (await fs.readdir(GAME_DATA, { withFileTypes: true })).filter(e => e.isDirectory() && !e.name.startsWith('_'));
    const validGames = new Set(games.map(g => g.name));

    for (const { filePath } of sessionEntries) {
      try {
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        if (data.rulebookName && !validGames.has(data.rulebookName)) {
          results.checks.push({ type: 'cross-ref', id: data.sessionId || path.basename(filePath), status: 'warn', message: `References non-existent game/rulebook '${data.rulebookName}'` });
          results.summary.warn++;
        }
      } catch {}
    }
  } catch {}

  res.json(results);
});

// ── Syndicate Deckbuilder ───────────────────────────────────────────
app.get('/api/syndicate/content', async (_req, res) => {
  try {
    const results = [];
    
    // Helper to walk and collect markdown files
    async function collectDocs(dir, category) {
      if (!await exists(dir)) return;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await collectDocs(path.join(dir, entry.name), `${category}/${entry.name}`);
        } else if (entry.name.endsWith('.md')) {
          const filePath = path.join(dir, entry.name);
          const raw = await fs.readFile(filePath, 'utf-8');
          const { data, content } = matter(raw);
          results.push({
            id: entry.name.replace(/\.md$/, ''),
            name: data.title || entry.name.replace(/\.md$/, ''),
            category,
            path: filePath.replace(SYNDICATE_DIR, '').replace(/\\/g, '/'),
            lastUpdated: data.lastUpdated,
            content: content.trim()
          });
        }
      }
    }

    await collectDocs(path.join(SYNDICATE_DIR, 'rules'), 'rules');
    await collectDocs(path.join(SYNDICATE_DIR, 'themes'), 'themes');
    await collectDocs(path.join(SYNDICATE_DIR, 'planning'), 'planning');

    res.json(results);
  } catch (e) { res.json([]); }
});

function countSections(sections) {
  let count = 0;
  for (const key of Object.keys(sections)) {
    count++;
    if (sections[key].subsections) count += countSections(sections[key].subsections);
  }
  return count;
}

function generateMarkdown(sections, level = 1) {
  let md = "";
  const headingPrefix = "#".repeat(Math.min(level, 6));

  for (const [, section] of Object.entries(sections)) {
    md += `${headingPrefix} ${section.title || 'Untitled Section'}\n\n`;
    
    if (section.content) {
      md += `${section.content}\n\n`;
    }
    
    if (section.examples && section.examples.length > 0) {
      md += `**Examples:**\n`;
      for (const ex of section.examples) {
        md += `- ${ex}\n`;
      }
      md += `\n`;
    }
    
    if (section.subsections && Object.keys(section.subsections).length > 0) {
      md += generateMarkdown(section.subsections, level + 1);
    }
  }
  return md;
}

// ── Designer Profile ─────────────────────────────────────────────
app.get('/api/designer-profile', async (_req, res) => {
  try {
    const p = path.join(GAME_DATA, '_system', 'designer_profile.json');
    if (!await exists(p)) return res.status(404).json({ error: 'Designer profile not found' });
    res.json(JSON.parse(await fs.readFile(p, 'utf-8')));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Design Sessions ───────────────────────────────────────────────
app.get('/api/design-sessions', async (_req, res) => {
  try {
    const gameEntries = (await fs.readdir(GAME_DATA, { withFileTypes: true })).filter(e => e.isDirectory() && !e.name.startsWith('_'));
    const sessions = [];
    for (const gameEntry of gameEntries) {
      const designDir = path.join(GAME_DATA, gameEntry.name, 'design');
      if (!await exists(designDir)) continue;
      const files = (await fs.readdir(designDir)).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(await fs.readFile(path.join(designDir, file), 'utf-8'));
          sessions.push({
            game: gameEntry.name,
            sessionId: data.sessionId,
            gameName: data.gameName || gameEntry.name,
            theme: data.theme || '',
            status: data.status || 'unknown',
            stepCount: (data.steps || []).length,
            createdAt: data.createdAt,
            lastUpdatedAt: data.lastUpdatedAt
          });
        } catch {}
      }
    }
    sessions.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
    res.json(sessions);
  } catch { res.json([]); }
});

app.get('/api/design-sessions/:game/:id', async (req, res) => {
  try {
    const filePath = path.join(GAME_DATA, req.params.game, 'design', `${req.params.id}.json`);
    if (!await exists(filePath)) return res.status(404).json({ error: 'Design session not found' });
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const decisionLogPath = path.join(GAME_DATA, req.params.game, 'logs', 'decision_log.json');
    if (await exists(decisionLogPath)) {
      try { data._decisionLog = JSON.parse(await fs.readFile(decisionLogPath, 'utf-8')); } catch {}
    }
    // Attach .md artifacts from same design/ directory
    const designDir = path.join(GAME_DATA, req.params.game, 'design');
    const allFiles = await fs.readdir(designDir).catch(() => []);
    data._artifacts = [];
    for (const file of allFiles.filter(f => f.endsWith('.md'))) {
      try {
        const raw = await fs.readFile(path.join(designDir, file), 'utf-8');
        const { data: fm, content } = matter(raw);
        data._artifacts.push({
          filename: file,
          title: fm.title || file.replace(/\.md$/, '').replace(/-/g, ' '),
          type: fm.type || 'artifact',
          content: content.trim()
        });
      } catch {}
    }
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Game Viewer API running on http://localhost:${PORT}`));
