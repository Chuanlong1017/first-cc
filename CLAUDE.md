# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

The root directory (`E:\first-cc`) is a workspace containing the actual application under `pomodoro-app/`. All source code changes should happen inside `pomodoro-app/`.

- `pomodoro-app/` — Electron desktop Pomodoro timer app
- `gh/` — GitHub CLI (`gh`) portable installation (v2.71.2)
- `.gitignore` — ignores `node_modules/`, `*.msi`, `*.exe`, `*.zip`, OS files
- Git remote: `origin` → `https://github.com/chuanlong1017/first-cc.git`

## Pomodoro App Architecture

`pomodoro-app/` is a single-window Electron app with no frontend framework.

### Process Model

- **Main process** (`main.js`): Creates a fixed-size (480x640) `BrowserWindow`, a system `Tray`, and handles IPC for notifications.
- **Preload** (`preload.js`): Exposes two APIs via `contextBridge`:
  - `window.electronAPI.showNotification(title, body)`
  - `window.electronAPI.updateTrayTooltip(text)`
- **Renderer** (`pomodoro.html` + `renderer.js` + `styles.css`): Runs the timer, mode switching, stats tracking, and UI updates.

### Key Behaviors

- The window hides to the system tray on close instead of quitting. Use the tray context menu or `before-quit` event to actually exit.
- Three timer modes are hard-coded in HTML (`data-mode` / `data-time` attributes): work (25 min), short break (5 min), long break (15 min).
- Stats are stored in `localStorage` under key `pomodoro_stats`, keyed by ISO date (`YYYY-MM-DD`).
- A Web Audio oscillator generates the completion beep directly in the renderer.
- Spacebar toggles start/pause when focus is on the document body.

## Common Commands

All commands assume `cd pomodoro-app` first.

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build Windows installer (NSIS)
npm run build
```

The build outputs to `pomodoro-app/dist/` via `electron-builder`. Config is inlined in `package.json` under the `"build"` key.

## Git & GitHub

- `gh` is authenticated as `Chuanlong1017` with `repo` scope.
- `gh auth setup-git` has already been run, so `git push` over HTTPS uses the `gh` token automatically.
- If `gh` ever needs re-authentication: `./gh/bin/gh.exe auth login`.
