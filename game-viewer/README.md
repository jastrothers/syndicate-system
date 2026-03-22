# Game Viewer

A web-based interface for viewing game rulebooks, sessions, and references.

## Features

- **Full Rulebook Content**: View the complete markdown version of rulebooks, compiled from JSON or served directly from R&D files.
- **Rule Structure**: Inspect hierarchical rule nodes, content, and examples.
- **Version History**: Track rulebook snapshots over time.
- **Component Reference**: Browse card and component definitions with full markdown formatting.
- **Design History**: View step-by-step design progress (`stepX-*.md`) and historical design sessions from the MCP.
- **Syndicate R&D**: Direct access to system design artifacts and themes.

## Development

To start the development server:

```bash
cd game-viewer
npm install
npm run dev
```

The `dev` command performs the following:

1. **Port Clearing**: Runs `kill-dev` (via `predev`) to kill any existing processes on ports 3000 (Vite) and 3001 (Server).
2. **Concurrent Startup**: Starts Vite on port 3000 and the Express API server on port 3001.

### Scripts

- `npm run dev`: Start Vite (3000) and Server (3001).
- `npm run kill-dev`: Forcefully kill processes on ports 3000 and 3001.
- `npm run build`: Build for production.
- `npm run preview`: Preview the production build.

## Architecture

- **Frontend**: Vite + Vanilla JS/HTML.
- **Backend**: Express server (`server.js`) serving game data from `../game-rules-system-mcp/game-data`.
- **Proxy**: Vite is configured to proxy `/api` requests to the Express server.
