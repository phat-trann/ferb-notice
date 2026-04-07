namespace NoticeCheckInContent {
  const WINDOW_FLAG = "__noticeCheckInExtensionBootstrapped__";

  interface NoticeContentElements {
    host: HTMLDivElement;
    badge: HTMLSpanElement;
    title: HTMLHeadingElement;
    body: HTMLParagraphElement;
    meta: HTMLParagraphElement;
    credit: HTMLParagraphElement;
    primaryButton: HTMLButtonElement;
    secondaryButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
  }

  interface NoticeContentState {
    elements: NoticeContentElements | null;
  }

  interface NoticeContentWindow extends Window {
    __noticeCheckInExtensionBootstrapped__?: boolean;
  }

  bootstrapContentScript();

function bootstrapContentScript(): void {
  const extensionWindow: NoticeContentWindow = window as NoticeContentWindow;

  if (extensionWindow[WINDOW_FLAG]) {
    return;
  }

  extensionWindow[WINDOW_FLAG] = true;

  const state: NoticeContentState = {
    elements: null
  };

  chrome.runtime.onMessage.addListener((message: unknown): void => {
    if (isShowDailyCheckInPromptMessage(message)) {
      renderDailyCheckInPrompt(state, message);
      return;
    }

    if (isShowCheckoutReminderMessage(message)) {
      renderCheckoutReminder(state, message);
    }
  });
}

function renderDailyCheckInPrompt(
  state: NoticeContentState,
  message: NoticeShowDailyCheckInPromptMessage
): void {
  const elements: NoticeContentElements = ensureNoticeElements(state);
  const lateMessage: string = message.isLate ? ` • ${message.lateMessage ?? ""}` : "";

  applyNoticeVariant(elements, "checkin");
  elements.badge.textContent = "CHECK IN";
  elements.title.textContent = "Bạn đã check in chưa?";
  elements.body.textContent =
    "Lưu lại thời điểm bắt đầu làm việc để extension nhắc bạn checkout sau đúng 9 giờ.";
  elements.meta.textContent = `Ngày làm việc: ${message.dayKey}${lateMessage}`;
  elements.primaryButton.textContent = "Đã check in";
  elements.primaryButton.disabled = false;
  elements.secondaryButton.textContent = "Để sau";
  elements.secondaryButton.hidden = false;
  elements.closeButton.hidden = false;
  elements.primaryButton.onclick = (): void => {
    void handleCheckInConfirmation(state);
  };
  elements.secondaryButton.onclick = (): void => {
    clearNotice(state);
  };
  elements.closeButton.onclick = (): void => {
    clearNotice(state);
  };
}

function renderCheckoutReminder(
  state: NoticeContentState,
  message: NoticeShowCheckoutReminderMessage
): void {
  const elements: NoticeContentElements = ensureNoticeElements(state);

  applyNoticeVariant(elements, "checkout");
  elements.badge.textContent = "NHẮC CHECKOUT";
  elements.title.textContent = "Đã làm đủ giờ";
  elements.body.textContent = "Nhớ checkout trước khi ra về.";
  elements.meta.textContent = `Check in lúc ${formatTime(message.checkInAt)} • Đủ 9 giờ lúc ${formatTime(
    message.dueAt
  )}.`;
  elements.primaryButton.textContent = "Đã rõ";
  elements.primaryButton.disabled = false;
  elements.secondaryButton.hidden = true;
  elements.closeButton.hidden = false;
  elements.primaryButton.onclick = (): void => {
    void acknowledgeCheckoutReminder(state, message.dayKey);
  };
  elements.closeButton.onclick = (): void => {
    void acknowledgeCheckoutReminder(state, message.dayKey);
  };
}

async function handleCheckInConfirmation(state: NoticeContentState): Promise<void> {
  const elements: NoticeContentElements = ensureNoticeElements(state);

  elements.primaryButton.disabled = true;
  elements.primaryButton.textContent = "Đang lưu...";
  elements.secondaryButton.disabled = true;
  elements.closeButton.disabled = true;

  try {
    const response: NoticeCompleteCheckInResponse = await sendRuntimeMessage<
      NoticeCompleteCheckInMessage,
      NoticeCompleteCheckInResponse
    >({
      type: "COMPLETE_CHECKIN"
    });

    if (!response.success || typeof response.dueAt !== "number") {
      throw new Error(response.error ?? "Unable to save your check-in.");
    }

    renderCheckInSuccess(state, response.dueAt, response.lateMessage);
  } catch (error: unknown) {
    elements.primaryButton.disabled = false;
    elements.primaryButton.textContent = "Thử lại";
    elements.secondaryButton.disabled = false;
    elements.closeButton.disabled = false;
    elements.meta.textContent =
      error instanceof Error ? error.message : "Unable to save your check-in.";
  }
}

function renderCheckInSuccess(state: NoticeContentState, dueAt: number, lateMessage?: string): void {
  const elements: NoticeContentElements = ensureNoticeElements(state);

  applyNoticeVariant(elements, "success");
  elements.badge.textContent = "ĐÃ LƯU";
  elements.title.textContent = "Đã ghi nhận giờ check in";
  elements.body.textContent = `Mình sẽ nhắc bạn checkout lúc ${formatTime(dueAt)}.`;
  elements.meta.textContent = lateMessage ?? "Bạn có thể đóng popup này.";
  elements.primaryButton.textContent = "Đóng";
  elements.primaryButton.disabled = false;
  elements.secondaryButton.hidden = true;
  elements.closeButton.hidden = true;
  elements.primaryButton.onclick = (): void => {
    clearNotice(state);
  };

  window.setTimeout((): void => {
    clearNotice(state);
  }, 2600);
}

async function acknowledgeCheckoutReminder(
  state: NoticeContentState,
  dayKey: string
): Promise<void> {
  try {
    await sendRuntimeMessage<
      NoticeAcknowledgeCheckoutReminderMessage,
      NoticeAcknowledgeCheckoutReminderResponse
    >({
      type: "ACKNOWLEDGE_CHECKOUT_REMINDER",
      dayKey
    });
  } catch (error: unknown) {
    console.error("Failed to acknowledge checkout reminder", error);
  } finally {
    clearNotice(state);
  }
}

function ensureNoticeElements(state: NoticeContentState): NoticeContentElements {
  if (state.elements) {
    return state.elements;
  }

  state.elements = createNoticeElements(state);
  return state.elements;
}

function createNoticeElements(state: NoticeContentState): NoticeContentElements {
  const host: HTMLDivElement = document.createElement("div");
  const shadowRoot: ShadowRoot = host.attachShadow({ mode: "open" });
  const styleElement: HTMLStyleElement = document.createElement("style");
  const overlay: HTMLDivElement = document.createElement("div");
  const backdrop: HTMLDivElement = document.createElement("div");
  const panel: HTMLDivElement = document.createElement("div");
  const glow: HTMLDivElement = document.createElement("div");
  const closeButton: HTMLButtonElement = document.createElement("button");
  const badge: HTMLSpanElement = document.createElement("span");
  const title: HTMLHeadingElement = document.createElement("h2");
  const body: HTMLParagraphElement = document.createElement("p");
  const meta: HTMLParagraphElement = document.createElement("p");
  const credit: HTMLParagraphElement = document.createElement("p");
  const actionRow: HTMLDivElement = document.createElement("div");
  const secondaryButton: HTMLButtonElement = document.createElement("button");
  const primaryButton: HTMLButtonElement = document.createElement("button");

  styleElement.textContent = getStyles();
  overlay.className = "notice-overlay";
  backdrop.className = "notice-backdrop";
  panel.className = "notice-panel";
  glow.className = "notice-glow";
  closeButton.className = "notice-close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  badge.className = "notice-badge";
  title.className = "notice-title";
  body.className = "notice-body";
  meta.className = "notice-meta";
  credit.className = "notice-credit";
  credit.textContent = "FerbNotice • Made by Ferb";
  actionRow.className = "notice-actions";
  secondaryButton.className = "notice-button notice-button-secondary";
  secondaryButton.type = "button";
  primaryButton.className = "notice-button notice-button-primary";
  primaryButton.type = "button";

  backdrop.addEventListener("click", (): void => {
    clearNotice(state);
  });

  actionRow.append(secondaryButton, primaryButton);
  panel.append(glow, closeButton, badge, title, body, meta, actionRow, credit);
  overlay.append(backdrop, panel);
  shadowRoot.append(styleElement, overlay);
  document.documentElement.appendChild(host);

  return {
    host,
    badge,
    title,
    body,
    meta,
    credit,
    primaryButton,
    secondaryButton,
    closeButton
  };
}

function applyNoticeVariant(elements: NoticeContentElements, variant: "checkin" | "checkout" | "success"): void {
  const panel: HTMLDivElement | null = elements.host.shadowRoot?.querySelector(".notice-panel") ?? null;

  if (!panel) {
    return;
  }

  panel.dataset.variant = variant;
}

function clearNotice(state: NoticeContentState): void {
  if (!state.elements) {
    return;
  }

  state.elements.host.remove();
  state.elements = null;
}

function getStyles(): string {
  return `
    :host {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      font-family: "Manrope", "Avenir Next", "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    .notice-overlay {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
    }

    .notice-backdrop {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top, rgba(255, 189, 89, 0.18), transparent 42%),
        rgba(15, 23, 42, 0.34);
      backdrop-filter: blur(8px);
    }

    .notice-panel {
      position: relative;
      width: min(100%, 420px);
      padding: 28px;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.5);
      color: #0f172a;
      background:
        linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 240, 0.96)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
      box-shadow:
        0 28px 80px rgba(15, 23, 42, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.75);
      overflow: hidden;
      animation: notice-enter 220ms ease-out;
    }

    .notice-panel[data-variant="checkout"] {
      background:
        linear-gradient(145deg, rgba(255, 251, 235, 0.97), rgba(255, 243, 220, 0.97)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.4), transparent);
    }

    .notice-panel[data-variant="success"] {
      background:
        linear-gradient(145deg, rgba(240, 253, 250, 0.97), rgba(224, 242, 254, 0.97)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.42), transparent);
    }

    .notice-glow {
      position: absolute;
      top: -72px;
      right: -54px;
      width: 190px;
      height: 190px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent 68%);
      pointer-events: none;
    }

    .notice-close {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 999px;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      color: rgba(15, 23, 42, 0.72);
      background: rgba(255, 255, 255, 0.72);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
    }

    .notice-badge {
      display: inline-flex;
      align-items: center;
      margin-bottom: 16px;
      padding: 8px 12px;
      border-radius: 999px;
      letter-spacing: 0.14em;
      font-size: 11px;
      font-weight: 800;
      color: #9a3412;
      background: rgba(255, 237, 213, 0.92);
    }

    .notice-title {
      margin: 0 0 10px;
      font-size: clamp(28px, 4vw, 34px);
      line-height: 1.02;
      letter-spacing: -0.04em;
      max-width: 280px;
    }

    .notice-body {
      margin: 0;
      font-size: 16px;
      line-height: 1.65;
      color: rgba(15, 23, 42, 0.88);
    }

    .notice-meta {
      margin: 16px 0 0;
      font-size: 13px;
      line-height: 1.6;
      color: rgba(15, 23, 42, 0.65);
    }

    .notice-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }

    .notice-credit {
      margin: 18px 0 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(15, 23, 42, 0.5);
    }

    .notice-button {
      appearance: none;
      flex: 1;
      min-height: 48px;
      border-radius: 16px;
      border: 1px solid transparent;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.01em;
      cursor: pointer;
      transition:
        transform 160ms ease,
        box-shadow 160ms ease,
        opacity 160ms ease;
    }

    .notice-button:hover {
      transform: translateY(-1px);
    }

    .notice-button:disabled,
    .notice-close:disabled {
      opacity: 0.65;
      cursor: default;
      transform: none;
    }

    .notice-button-primary {
      color: #fff7ed;
      background: linear-gradient(135deg, #ea580c, #f97316);
      box-shadow: 0 20px 36px rgba(234, 88, 12, 0.3);
    }

    .notice-button-secondary {
      color: #0f172a;
      border-color: rgba(148, 163, 184, 0.28);
      background: rgba(255, 255, 255, 0.72);
    }

    @keyframes notice-enter {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 640px) {
      .notice-overlay {
        padding: 16px;
        align-items: end;
      }

      .notice-panel {
        width: 100%;
        padding: 24px 20px 20px;
        border-radius: 24px;
      }

      .notice-actions {
        flex-direction: column-reverse;
      }
    }
  `;
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

async function sendRuntimeMessage<TRequest, TResponse>(message: TRequest): Promise<TResponse> {
  return new Promise((resolve: (value: TResponse) => void, reject: (reason?: unknown) => void): void => {
    chrome.runtime.sendMessage(message, (response: TResponse): void => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function isShowDailyCheckInPromptMessage(
  message: unknown
): message is NoticeShowDailyCheckInPromptMessage {
  return isRecord(message) && message.type === "SHOW_DAILY_CHECKIN_PROMPT" && typeof message.dayKey === "string";
}

function isShowCheckoutReminderMessage(
  message: unknown
): message is NoticeShowCheckoutReminderMessage {
  return (
    isRecord(message) &&
    message.type === "SHOW_CHECKOUT_REMINDER" &&
    typeof message.dayKey === "string" &&
    typeof message.checkInAt === "number" &&
    typeof message.dueAt === "number"
  );
}

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
