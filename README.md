# FerbNotice

FerbNotice is a Chrome MV3 extension that reminds the user to check in on the first eligible active tab of each local day, then reminds them to check out after the configured work duration.

Made by Ferb.

## Overview

FerbNotice is designed for a lightweight daily work-time reminder flow:

- Ask the user whether they have checked in when they first activate an eligible Chrome tab each day.
- Store the check-in timestamp in `chrome.storage.local`.
- Compute the checkout reminder from the configured work duration.
- Round the checkout reminder upward by the configured rounding slot.
- Show a checkout reminder when the work duration is complete.
- Show action badge status directly on the extension icon.
- Let the user correct today's check-in time manually from the extension popup.

## Features

- Daily check-in prompt based on the local system date.
- Checkout reminder after the configured work duration.
- Configurable latest on-time check-in threshold.
- Configurable work duration.
- Configurable checkout rounding slot.
- Manual correction for today's recorded check-in time.
- Action badge states:
  - `OFF` with a gray badge when reminders are disabled
  - `IN?` with a red badge when today's check-in is still missing
  - a countdown such as `8h` or `42m` with an amber badge while the work window is still running
  - `OUT` with a green badge when today's configured work duration is complete
- Setup popup opened by clicking the extension icon.
- TypeScript source with strict type checking.

## Requirements

- `nvm`
- Node.js `>=25.9.0`
- Chrome or another Chromium-based browser that supports Manifest V3

This workspace has been tested with Node.js `v25.9.0`.

## Quick Start

```bash
source ~/.nvm/nvm.sh
nvm use node
npm install
npm run typecheck
npm run build
```

The unpacked extension will be generated in `dist`.

## Production Build

Run the production build from the repository root:

```bash
source ~/.nvm/nvm.sh
nvm use node
npm ci
npm run build:production
```

`npm run build:production` does the following:

- Removes old build output from `dist`.
- Runs `npm run typecheck`.
- Runs `tsc`.
- Copies static extension assets from `static` into `dist`.

The production-ready unpacked extension is `dist`.

## Production Package

To create a zip file that can be attached to a GitHub release:

```bash
source ~/.nvm/nvm.sh
nvm use node
npm ci
npm run pack:production
```

This creates:

```text
ferbnotice-production.zip
```

The zip contains the generated extension files from `dist`, including:

- `manifest.json`
- `background.js`
- `content.js`
- `popup.js`
- `popup.html`
- `icons/*`

## GitHub Pages

This repository includes a static landing page at `docs/index.html`.

To publish it with GitHub Pages:

1. Open the repository settings on GitHub.
2. Go to `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select the target branch.
5. Select the `/docs` folder.
6. Save the Pages configuration.

GitHub Pages will serve `docs/index.html` as the site entry point. The AI data contract remains available as `docs/ai-data-contract.md`.

## Load The Production Build In Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Select `Load unpacked`
4. Choose the `dist` directory
5. Pin `FerbNotice` to the Chrome toolbar
6. Click the extension icon to open the setup popup

## Behavior

- The first eligible tab activation each local day triggers the check-in reminder modal.
- When the user confirms check-in, the extension stores the timestamp in `chrome.storage.local`.
- If Chrome or the computer opens late and the stored check-in time is wrong, the user can correct today's check-in time in the setup popup.
- When today's check-in time is corrected, FerbNotice recomputes the checkout due time, alarm, and action badge.
- If the user checks in later than the configured latest on-time check-in threshold, the injected modal shows the late warning copy defined by `LATE_CHECKIN_MESSAGE` in `src/background.ts`.
- After the configured work duration, the checkout time is rounded upward by the configured rounding slot. With the default 30-minute slot:
  - `09:00` stays `09:00`
  - `09:01` through `09:30` becomes `09:30`
  - `09:31` through `09:59` becomes `10:00`
- The extension shows the checkout reminder modal at the rounded due time.

## Data Storage

Runtime data is stored in Chrome local extension storage:

```text
chrome.storage.local
```

Root key:

```text
noticeCheckInState
```

See `docs/ai-data-contract.md` for the full storage schema, derived state, and runtime message contracts.

## Project Structure

- `src/background.ts`: service worker that manages state, alarms, tab activation, runtime messages, and badge state
- `src/content.ts`: injected modal UI for check-in and checkout reminders
- `src/popup.ts`: setup popup controller for settings and manual check-in correction
- `src/types.d.ts`: shared runtime contracts
- `static/manifest.json`: Chrome MV3 manifest
- `static/popup.html`: setup popup document and styles
- `static/icons/*`: extension icon assets
- `docs/index.html`: GitHub Pages landing page
- `docs/ai-data-contract.md`: storage schema, message flow, and derived rules for future AI agents
- `dist`: generated build output

## AI Agent Notes

- Start with `docs/ai-data-contract.md` to understand persisted state, derived state, and message contracts.
- Reminder scheduling, storage normalization, action badge state, and manual check-in correction are implemented in `src/background.ts`.
- The tab-injected reminder UI is implemented in `src/content.ts`.
- The extension action setup popup is implemented in `static/popup.html` and `src/popup.ts`.
- The GitHub Pages landing page is implemented in `docs/index.html`.
- Build output is generated into `dist`; do not edit `dist` directly unless intentionally patching built artifacts.

## Release Checklist

1. Run `npm ci`.
2. Run `npm run build:production`.
3. Load `dist` into Chrome and smoke test the setup popup.
4. Run `npm run pack:production`.
5. Attach `ferbnotice-production.zip` to the GitHub release.
