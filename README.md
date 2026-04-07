# FerbNotice

FerbNotice is a Chrome MV3 extension that reminds the user to check in on the first eligible active tab of each local day, then reminds them to check out after the configured work duration. Made by Ferb.

## Requirements

- `nvm`
- Latest Node.js through `nvm`. This workspace has been tested with `v25.9.0`.

## Commands

```bash
source ~/.nvm/nvm.sh
nvm use node
npm install
npm run typecheck
npm run build
```

## Load In Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Select `Load unpacked`
4. Choose the `dist` directory

## Behavior

- Clicking the extension icon opens the setup popup. The setup popup can enable or disable reminders, edit the latest on-time check-in threshold, edit the required work duration, edit the checkout rounding slot, and correct today's recorded check-in time.
- Each local day, the first time the user activates an eligible Chrome tab, the extension injects a modal asking whether the user has checked in.
- When the user confirms check-in, the extension stores the timestamp in `chrome.storage.local`.
- If Chrome or the computer opens late and the stored check-in time is wrong, the user can correct today's check-in time in the setup popup. The extension then recomputes the checkout due time, alarm, and action badge.
- If the user checks in later than the configured latest on-time check-in threshold, the injected modal shows the late warning copy defined by `LATE_CHECKIN_MESSAGE` in `src/background.ts`.
- After the configured work duration, the checkout time is rounded upward by the configured slot. With the default 30-minute slot:
  - `09:01` -> `09:30`
  - `09:31` -> `10:00`
- The extension shows the checkout reminder modal at the rounded due time.
- The action badge shows:
  - `OFF` with a gray badge when reminders are disabled
  - `IN?` with a red badge when today's check-in is still missing
  - a countdown such as `8h` or `42m` with an amber badge while the work window is still running
  - `OUT` with a green badge when today's configured work duration is complete

## Project Structure

- `src/background.ts`: service worker that manages state, alarms, tab activation, and badge state
- `src/content.ts`: injected modal UI for check-in and checkout reminders
- `src/popup.ts`: setup popup controller for settings and manual check-in correction
- `src/types.d.ts`: shared runtime contracts
- `static/manifest.json`: manifest MV3
- `static/popup.html`: setup popup document and styles
- `docs/ai-data-contract.md`: storage schema, message flow, and derived rules for future AI agents

## AI Agent Notes

- Start with `docs/ai-data-contract.md` to understand persisted state, derived state, and message contracts.
- Reminder scheduling, storage normalization, action badge state, and manual check-in correction are implemented in `src/background.ts`.
- The tab-injected reminder UI is implemented in `src/content.ts`.
- The extension action setup popup is implemented in `static/popup.html` and `src/popup.ts`.
- Build output is generated into `dist`; do not edit `dist` directly unless intentionally patching built artifacts.
