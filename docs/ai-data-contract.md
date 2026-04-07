# AI Data Contract

This file documents the runtime data model for FerbNotice so another AI agent can understand and extend the extension without reverse-engineering the codebase first.

## Storage Location

- Chrome storage area: `chrome.storage.local`
- Root key: `noticeCheckInState`

## Schema

```json
{
  "noticeCheckInState": {
    "version": 1,
    "settings": {
      "enabled": true,
      "latestCheckInTime": "10:00",
      "workDurationMinutes": 540,
      "roundingSlotMinutes": 30
    },
    "records": {
      "2026-04-06": {
        "dayKey": "2026-04-06",
        "promptShownAt": 1775437200000,
        "checkInAt": 1775437323456,
        "checkoutReminderDueAt": 1775469723456,
        "checkoutReminderShownAt": 1775469725000
      }
    }
  }
}
```

## Field Semantics

- `version`: schema version for future migrations.
- `settings`: user setup edited from the extension action popup.
- `settings.enabled`: disables all injected reminders when `false`; action badge shows `OFF`.
- `settings.latestCheckInTime`: local latest on-time check-in threshold in `HH:mm` format.
- `settings.workDurationMinutes`: required work duration before checkout reminder.
- `settings.roundingSlotMinutes`: checkout due time rounding slot.
- `records`: map indexed by the local day key in `YYYY-MM-DD` format.
- `dayKey`: local calendar day derived from the machine system clock.
- `promptShownAt`: timestamp when the daily check-in prompt rendered successfully.
- `checkInAt`: timestamp recorded when the user confirms check-in, or the manually corrected local check-in time from the setup popup.
- `checkoutReminderDueAt`: due timestamp for the checkout reminder, calculated from `checkInAt + settings.workDurationMinutes` and then rounded up by `settings.roundingSlotMinutes`.
- `checkoutReminderShownAt`: timestamp when the checkout reminder rendered successfully.

## Message Flow

- `SHOW_DAILY_CHECKIN_PROMPT`: background -> content
- `COMPLETE_CHECKIN`: content -> background
- `SHOW_CHECKOUT_REMINDER`: background -> content
- `ACKNOWLEDGE_CHECKOUT_REMINDER`: content -> background
- `GET_SETTINGS`: setup popup -> background, returns persisted settings and today's derived status.
- `UPDATE_SETTINGS`: setup popup -> background, saves setup settings.
- `UPDATE_TODAY_CHECKIN`: setup popup -> background, overwrites today's `checkInAt`, recalculates `checkoutReminderDueAt`, resets the checkout reminder delivery marker when the due time changes, and refreshes the action badge/alarm.

## Implementation Pointers

- `src/background.ts` owns `chrome.storage.local`, `chrome.alarms`, badge state, tab activation handling, and runtime message handlers.
- `src/content.ts` owns the injected check-in and checkout reminder modals shown inside eligible tabs.
- `src/popup.ts` owns the extension action setup popup behavior.
- `static/popup.html` owns the setup popup markup and styles.
- `src/types.d.ts` owns shared message and storage contracts.

## Setup Today Status

The setup popup receives a derived `today` object from `GET_SETTINGS`, `UPDATE_SETTINGS`, and `UPDATE_TODAY_CHECKIN`. This object is not persisted separately.

```json
{
  "dayKey": "2026-04-07",
  "hasCheckIn": true,
  "checkInTime": "09:30",
  "checkoutReminderDueTime": "18:30"
}
```

## Derived Rules

- A check-in is considered late when the local system time is later than `settings.latestCheckInTime`.
- Late warning copy is defined by `LATE_CHECKIN_MESSAGE` in `src/background.ts`.
- Checkout due time is rounded up by this rule:
  - `09:00` stays `09:00`
  - `09:01` through `09:30` becomes `09:30`
  - `09:31` through `09:59` becomes `10:00`
- The action badge is derived, not persisted:
  - `OFF` with gray badge when `settings.enabled` is `false`.
  - `IN?` with red badge when there is no active check-in for the current day.
  - countdown text such as `8h` or `42m` with amber badge while the 9-hour work window is still running.
  - `OUT` with green badge when today's record has already completed the 9-hour work duration.

## Daily Lifecycle

1. The user activates the first injectable Chrome tab of the day.
2. The background service worker injects the content script and shows the daily check-in prompt.
3. When the user confirms the check-in prompt, the background saves `checkInAt` and schedules a `chrome.alarms` reminder.
4. If the saved check-in time is wrong, the user can open the extension action popup and edit today's check-in time. The background updates today's record and recomputes the checkout reminder.
5. After the configured work duration, the result is rounded up to the configured slot, then the background tries to show the checkout reminder on the currently active tab.
6. If the alarm fires while the active tab cannot receive the injected UI, the reminder stays pending until the next eligible tab activation.

## Assumptions

- Timezone behavior follows Chrome's system timezone.
- The daily check-in prompt is shown at most once per day after a successful render.
- The checkout reminder is considered delivered once the background can inject the UI and send the message to the content script.
