/** Shared panel stylesheet — forest theme + larger type. */
export const GUIDE_STYLES = `
:host, .opg-root {
  color-scheme: light;
  --bg: #f3f1ec;
  --bg2: #e7ebe6;
  --ink: #14231a;
  --muted: #3d5247;
  --accent: #1b4332;
  --accent-soft: #2d6a4f;
  --accent-hot: #40916c;
  --card: #ffffff;
  --line: rgba(20, 35, 26, 0.14);
  --shadow: 0 18px 50px rgba(20, 35, 26, 0.18);
  font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif;
  color: var(--ink);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

.opg-root, .opg-root * { box-sizing: border-box; }

.opg-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background:
    radial-gradient(120% 80% at 0% 0%, #d8f3dc 0%, transparent 55%),
    radial-gradient(90% 70% at 100% 0%, #b7e4c7 0%, transparent 45%),
    linear-gradient(165deg, var(--bg) 0%, var(--bg2) 100%);
}

.opg-top {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: default;
  user-select: none;
  border-bottom: 1px solid var(--line);
  background: rgba(255,255,255,0.55);
}

.opg-top.draggable { cursor: grab; }
.opg-top.draggable:active { cursor: grabbing; }

.opg-mark {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  overflow: hidden;
  flex: 0 0 36px;
  background: transparent;
  box-shadow: 0 0 0 1px var(--line);
}
.opg-mark-img {
  display: block;
  width: 36px;
  height: 36px;
  object-fit: contain;
  border: 0;
  pointer-events: none;
}

.opg-titles {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1 1 auto;
  min-width: 0;
  gap: 2px;
}
.opg-brand {
  display: block;
  margin: 0;
  padding: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", "Songti SC", Georgia, serif;
  font-size: 22px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 700;
  color: var(--ink);
}
.opg-sub {
  display: block;
  margin: 0;
  padding: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.3;
  font-weight: 500;
}

.opg-iconbtn {
  border: 0;
  background: rgba(255,255,255,0.75);
  color: var(--ink);
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  font-weight: 600;
}
.opg-iconbtn:hover { background: #fff; }

.opg-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px 8px;
}

.opg-btn {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  background: var(--accent);
  color: #f6fff8;
  font-family: inherit;
}
.opg-btn.ghost {
  background: rgba(27, 67, 50, 0.14);
  color: var(--accent);
}
.opg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.opg-tabs {
  display: flex;
  gap: 0;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
}
.opg-tab {
  flex: 1;
  border: 0;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--muted);
  border-radius: 0;
  padding: 12px 8px;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
}
.opg-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent-hot);
}

.opg-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 14px 16px 16px;
}

.opg-shell.chat-mode .opg-body {
  padding-bottom: 8px;
}

.opg-summary {
  margin: 0 0 14px;
  font-size: 16px;
  font-weight: 500;
  color: #24362c;
  line-height: 1.55;
}

.opg-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.opg-card {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 14px 16px;
}
.opg-feat {
  display: block;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  font-weight: 800;
  color: var(--ink);
  cursor: pointer;
  padding: 0;
  font-size: 18px;
  line-height: 1.35;
  font-family: inherit;
}
.opg-desc {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--muted);
  line-height: 1.5;
}
.opg-howto {
  margin: 12px 0 0;
  font-size: 16px;
  color: #24362c;
  line-height: 1.55;
}
.opg-howto-step { margin: 4px 0; }
.opg-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.opg-mini {
  margin-top: 0;
  border: 0;
  background: rgba(45, 106, 79, 0.12);
  color: var(--accent-soft);
  font-weight: 750;
  cursor: pointer;
  padding: 8px 12px;
  font-size: 15px;
  border-radius: 8px;
  font-family: inherit;
}
.opg-mini:hover { background: rgba(45, 106, 79, 0.2); }
.opg-mini-primary {
  background: var(--accent);
  color: #f6fff8;
}
.opg-mini-primary:hover { background: var(--accent-soft); color: #f6fff8; }
.opg-chat-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 2px 0 4px;
  align-self: stretch;
}

.opg-chat-log {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}
.opg-bubble {
  max-width: 94%;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 16px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}
.opg-bubble.user {
  align-self: flex-end;
  background: var(--accent);
  color: #f6fff8;
  border-bottom-right-radius: 4px;
}
.opg-bubble.assistant {
  align-self: flex-start;
  background: rgba(255,255,255,0.92);
  border: 1px solid var(--line);
  color: var(--ink);
  border-bottom-left-radius: 4px;
  min-height: 1.5em;
}
.opg-bubble.assistant.streaming::after {
  content: "|";
  display: inline-block;
  margin-left: 2px;
  color: var(--accent-hot);
  animation: opg-blink 1s step-end infinite;
}
@keyframes opg-blink {
  50% { opacity: 0; }
}
.opg-chat-empty {
  color: var(--muted);
  font-size: 16px;
  margin: 8px 4px;
  line-height: 1.5;
}

.opg-composer {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
  padding: 10px 16px 12px;
  border-top: 1px solid var(--line);
  background: rgba(255,255,255,0.88);
}
.opg-composer[hidden] {
  display: none !important;
}
.opg-input {
  flex: 1;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 14px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
  min-width: 0;
}
.opg-send {
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  background: var(--accent);
  color: #f6fff8;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.opg-send:disabled { opacity: 0.45; }

.opg-status {
  padding: 4px 16px 10px;
  font-size: 14px;
  color: var(--muted);
}

.opg-settings-pane {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  background:
    radial-gradient(120% 80% at 0% 0%, #d8f3dc 0%, transparent 55%),
    linear-gradient(165deg, var(--bg) 0%, var(--bg2) 100%);
  padding: 0 0 16px;
}
.opg-settings-pane[hidden] {
  display: none !important;
}
.opg-settings-inner {
  padding: 0 16px 8px;
}
.opg-settings-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 8px;
  position: sticky;
  top: 0;
  background: rgba(243, 241, 236, 0.92);
  backdrop-filter: blur(6px);
  z-index: 1;
}
.opg-settings-title {
  font-weight: 800;
  font-size: 17px;
}
.opg-settings-title-lg {
  font-family: "Iowan Old Style", "Palatino Linotype", "Songti SC", Georgia, serif;
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0 0 8px;
}
.opg-settings-page {
  max-width: 520px;
}
.opg-settings-note {
  color: var(--muted);
  font-size: 14px;
  margin: 6px 0 10px;
  line-height: 1.45;
}
.opg-settings-label {
  display: block;
  margin: 10px 0;
  font-size: 14px;
  font-weight: 650;
}
.opg-settings-field {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 15px;
  box-sizing: border-box;
}
.opg-settings-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  font-size: 14px;
}
.opg-settings-risk {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid #c47b2b;
  border-radius: 10px;
  background: #fff7eb;
  color: #6a3b0c;
  font-size: 13px;
  line-height: 1.5;
}
.opg-settings-risk[hidden] {
  display: none !important;
}
.opg-vault {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #f7f8f6;
}
.opg-vault[hidden] {
  display: none !important;
}
.opg-vault-actions[hidden] {
  display: none !important;
}
.opg-settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
`;

/**
 * Hard overrides so host-page CSS (h1/p/flex/float) cannot break the float panel.
 * Prefixed with #omnipilot-web-guide-float for specificity.
 */
export const FLOAT_PAGE_SHIELD = `
#omnipilot-web-guide-float {
  font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif !important;
  font-size: 16px !important;
  line-height: 1.55 !important;
  color: #14231a !important;
  text-align: left !important;
}
#omnipilot-web-guide-float, #omnipilot-web-guide-float * {
  box-sizing: border-box !important;
  max-width: none;
}
#omnipilot-web-guide-float .opg-top {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-start !important;
  gap: 12px !important;
  margin: 0 !important;
  padding: 14px 16px !important;
  float: none !important;
  position: relative !important;
  width: 100% !important;
  min-height: 64px !important;
  border-bottom: 1px solid rgba(20, 35, 26, 0.14) !important;
  background: rgba(255,255,255,0.55) !important;
}
#omnipilot-web-guide-float .opg-mark {
  display: block !important;
  float: none !important;
  position: relative !important;
  width: 36px !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: 0 0 36px !important;
}
#omnipilot-web-guide-float .opg-mark-img {
  display: block !important;
  width: 36px !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  float: none !important;
}
#omnipilot-web-guide-float .opg-titles {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  align-items: flex-start !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  float: none !important;
  position: static !important;
  gap: 2px !important;
  text-align: left !important;
}
#omnipilot-web-guide-float .opg-brand,
#omnipilot-web-guide-float .opg-sub {
  display: block !important;
  float: none !important;
  position: static !important;
  width: auto !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  text-align: left !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  transform: none !important;
  letter-spacing: normal !important;
}
#omnipilot-web-guide-float .opg-brand {
  font-family: "Iowan Old Style", "Palatino Linotype", "Songti SC", Georgia, serif !important;
  font-size: 22px !important;
  line-height: 1.2 !important;
  font-weight: 700 !important;
  color: #14231a !important;
}
#omnipilot-web-guide-float .opg-sub {
  font-size: 14px !important;
  line-height: 1.3 !important;
  font-weight: 500 !important;
  color: #3d5247 !important;
}
#omnipilot-web-guide-float .opg-iconbtn {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  float: none !important;
  position: relative !important;
  width: 36px !important;
  height: 36px !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: 0 0 36px !important;
}
#omnipilot-web-guide-float .opg-btn,
#omnipilot-web-guide-float .opg-tab,
#omnipilot-web-guide-float .opg-feat,
#omnipilot-web-guide-float .opg-mini,
#omnipilot-web-guide-float .opg-send {
  float: none !important;
  text-transform: none !important;
}
`;
