import {
  detectUiLocale,
  guideStrings,
  normalizeLocale,
  type UiLocale,
} from '../i18n/locale';
import {
  assistedClickDisabledRefusal,
  classifyChatPageAction,
  forbiddenPageActionRefusal,
  isAssistRequest,
} from '../ai/chat-policy';
import { resolveOperateGoal } from '../ai/operate-goal';
import type { ChatTurn } from '../ai/chat';
import type { ClickPlan } from '../page-action/build-click-plan';
import { getSettings } from '../settings-store';
import { GUIDE_STYLES } from './guide-styles';
import { mountSettingsUi } from './mount-settings-ui';

type Feature = {
  uid: string;
  name: string;
  description: string;
  howTo: string[];
  source?: string;
};

export type MountGuideOptions = {
  mode: 'float' | 'side';
  onClose?: () => void;
  /** Attach drag listeners to header (float mode). */
  enableDrag?: (header: HTMLElement) => void;
};

export function mountGuideUi(
  mount: HTMLElement | ShadowRoot,
  opts: MountGuideOptions,
): { destroy: () => void } {
  const locale: UiLocale = detectUiLocale();
  const t = guideStrings(locale);

  const style = document.createElement('style');
  style.textContent = GUIDE_STYLES;

  const iconUrl = browser.runtime.getURL('/icon-48.png');
  const root = document.createElement('div');
  root.className = 'opg-root opg-shell';
  // Avoid h1/p/ul — host pages often restyle those tags and break the float UI.
  root.innerHTML = `
    <div class="opg-top ${opts.mode === 'float' ? 'draggable' : ''}" data-role="header">
      <div class="opg-mark" aria-hidden="true">
        <img class="opg-mark-img" src="${iconUrl}" alt="" width="36" height="36" draggable="false" />
      </div>
      <div class="opg-titles">
        <div class="opg-brand">${t.brand}</div>
        <div class="opg-sub">${t.subtitle}</div>
      </div>
      <button type="button" class="opg-iconbtn" data-role="settings" title="${t.settings}" aria-label="${t.settings}">⚙</button>
      ${
        opts.mode === 'float'
          ? `<button type="button" class="opg-iconbtn" data-role="close" title="${t.close}" aria-label="${t.close}">✕</button>`
          : ''
      }
    </div>
    <div class="opg-toolbar">
      <button type="button" class="opg-btn" data-role="analyze">${t.analyze}</button>
      <div class="opg-tour-controls" data-role="tour-controls" hidden>
        <button type="button" class="opg-btn" data-role="tour" disabled>${t.startTour}</button>
        <button type="button" class="opg-btn ghost" data-role="next" disabled>${t.next}</button>
        <button type="button" class="opg-btn ghost" data-role="end" disabled>${t.end}</button>
      </div>
    </div>
    <div class="opg-tabs">
      <button type="button" class="opg-tab active" data-tab="guide">${t.tabGuide}</button>
      <button type="button" class="opg-tab" data-tab="chat">${t.tabChat}</button>
    </div>
    <div class="opg-body">
      <div data-pane="guide">
        <div class="opg-empty" data-role="empty">
          <div class="opg-empty-title">${t.emptyTitle}</div>
          <div class="opg-empty-steps">
            <div class="opg-empty-step"><span class="opg-empty-n">1</span><span>${t.emptyStepAnalyze}</span></div>
            <div class="opg-empty-step"><span class="opg-empty-n">2</span><span>${t.emptyStepAsk}</span></div>
          </div>
          <div class="opg-empty-pin">${t.pinTip}</div>
        </div>
        <div class="opg-summary" data-role="summary"></div>
        <div class="opg-list" data-role="list"></div>
      </div>
      <div data-pane="chat" hidden>
        <div class="opg-chat-log" data-role="chat-log">
          <div class="opg-chat-empty">${t.chatEmpty}</div>
        </div>
      </div>
    </div>
    <form class="opg-composer" data-role="chat-form" hidden>
      <input class="opg-input" type="text" data-role="chat-input" placeholder="${t.chatPlaceholder}" autocomplete="off" />
      <button class="opg-send" type="submit">${t.chatSend}</button>
    </form>
    <div class="opg-status" data-role="status"></div>
    <div class="opg-settings-pane" data-role="settings-pane" hidden></div>
  `;

  mount.append(style, root);

  const statusEl = root.querySelector<HTMLElement>('[data-role="status"]')!;
  const summaryEl = root.querySelector<HTMLElement>('[data-role="summary"]')!;
  const listEl = root.querySelector<HTMLElement>('[data-role="list"]')!;
  const emptyEl = root.querySelector<HTMLElement>('[data-role="empty"]')!;
  const tourControls = root.querySelector<HTMLElement>(
    '[data-role="tour-controls"]',
  )!;
  const tourBtn = root.querySelector<HTMLButtonElement>('[data-role="tour"]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-role="next"]')!;
  const endBtn = root.querySelector<HTMLButtonElement>('[data-role="end"]')!;
  const chatLog = root.querySelector<HTMLElement>('[data-role="chat-log"]')!;
  const chatInput = root.querySelector<HTMLInputElement>('[data-role="chat-input"]')!;
  const chatForm = root.querySelector<HTMLFormElement>('[data-role="chat-form"]')!;
  const header = root.querySelector<HTMLElement>('[data-role="header"]')!;
  const settingsPane = root.querySelector<HTMLElement>(
    '[data-role="settings-pane"]',
  )!;

  function setGuideEmpty(show: boolean) {
    emptyEl.hidden = !show;
    tourControls.hidden = show || features.length === 0;
  }

  let features: Feature[] = [];
  let pageSummary = '';
  let touring = false;
  let history: ChatTurn[] = [];
  let activePort: ReturnType<typeof browser.runtime.connect> | null = null;
  let settingsHandle: ReturnType<typeof mountSettingsUi> | null = null;
  let allowAssistedClick = false;
  let pendingPlan: ClickPlan | null = null;
  /** One-time SW plan token — execute sends token only, never client steps. */
  let pendingToken: string | null = null;
  /** Sticky page-action intent — not overwritten by chat complaints. */
  let operateGoal = '';
  const CONFIRM_UNLOCK_MS = 900;

  function rememberOperateGoal(message: string): string {
    operateGoal = resolveOperateGoal(message, operateGoal);
    return operateGoal;
  }

  async function refreshPermissions() {
    try {
      const s = await getSettings();
      allowAssistedClick = s.permissions.allowAssistedClick === true;
    } catch {
      allowAssistedClick = false;
    }
    if (!allowAssistedClick) {
      pendingPlan = null;
      pendingToken = null;
      for (const el of chatLog.querySelectorAll('.opg-chat-actions')) {
        el.remove();
      }
    }
  }

  function featurePayload() {
    return features.map((f) => ({
      uid: f.uid,
      name: f.name,
      description: f.description,
      howTo: f.howTo,
    }));
  }

  function appendChatActions(
    buttons: Array<{ label: string; primary?: boolean; onClick: () => void }>,
  ) {
    const bar = document.createElement('div');
    bar.className = 'opg-chat-actions';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = b.primary ? 'opg-mini opg-mini-primary' : 'opg-mini';
      btn.textContent = b.label;
      btn.addEventListener('click', () => b.onClick());
      bar.appendChild(btn);
    }
    chatLog.appendChild(bar);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  async function presentOperatePlan(goal: string) {
    await refreshPermissions();
    if (!allowAssistedClick) {
      const msg = assistedClickDisabledRefusal(locale);
      appendBubble('assistant', msg);
      history.push({ role: 'assistant', content: msg });
      return;
    }
    statusEl.textContent = t.planBuilding;
    const res = (await browser.runtime.sendMessage({
      type: 'page.plan',
      goal,
      locale,
      features: featurePayload(),
    })) as {
      ok?: boolean;
      plan?: ClickPlan;
      token?: string;
      summary?: string;
      error?: string;
      needPermission?: boolean;
    };
    if (!res?.ok || !res.plan || !res.summary || !res.token) {
      const err = res?.needPermission
        ? t.clickNeedPermission
        : res?.error || t.clickFailed;
      appendBubble('assistant', err);
      history.push({ role: 'assistant', content: err });
      statusEl.textContent = '';
      return;
    }
    pendingPlan = res.plan;
    pendingToken = res.token;
    appendBubble('assistant', res.summary);
    history.push({ role: 'assistant', content: res.summary });

    // Anti-clickjack: confirm stays disabled briefly so a single framed click cannot fire it.
    const bar = document.createElement('div');
    bar.className = 'opg-chat-actions';
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'opg-mini opg-mini-primary';
    confirmBtn.textContent = t.confirmExecute;
    confirmBtn.disabled = true;
    confirmBtn.title = t.confirmExecute;
    confirmBtn.addEventListener('click', () => {
      void runPendingPlan();
    });
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'opg-mini';
    cancelBtn.textContent = t.cancelExecute;
    cancelBtn.addEventListener('click', () => {
      pendingPlan = null;
      pendingToken = null;
      appendBubble('assistant', t.executeCancelled);
      history.push({ role: 'assistant', content: t.executeCancelled });
      bar.remove();
    });
    bar.append(confirmBtn, cancelBtn);
    chatLog.appendChild(bar);
    chatLog.scrollTop = chatLog.scrollHeight;
    window.setTimeout(() => {
      if (pendingToken) confirmBtn.disabled = false;
    }, CONFIRM_UNLOCK_MS);
    statusEl.textContent = '';
  }

  async function runPendingPlan() {
    if (!pendingPlan || !pendingToken) return;
    const token = pendingToken;
    pendingPlan = null;
    pendingToken = null;
    await refreshPermissions();
    if (!allowAssistedClick) {
      statusEl.textContent = t.clickNeedPermission;
      return;
    }
    statusEl.textContent = t.executeRunning;
    const res = (await browser.runtime.sendMessage({
      type: 'page.execute',
      token,
    })) as { ok?: boolean; error?: string; done?: string[] };
    if (!res?.ok) {
      const err = res?.error || t.clickFailed;
      appendBubble('assistant', err);
      history.push({ role: 'assistant', content: err });
      statusEl.textContent = t.clickFailed;
      return;
    }
    const msg =
      locale === 'zh'
        ? `${t.executeDone}\n${(res.done || []).map((x, i) => `${i + 1}. ${x}`).join('\n')}`
        : `${t.executeDone}\n${(res.done || []).map((x, i) => `${i + 1}. ${x}`).join('\n')}`;
    appendBubble('assistant', msg);
    history.push({ role: 'assistant', content: msg });
    statusEl.textContent = t.executeDone;
  }

  function setTouring(on: boolean) {
    touring = on;
    tourControls.hidden = features.length === 0;
    tourBtn.disabled = !features.length || on;
    nextBtn.disabled = !on;
    endBtn.disabled = !on;
  }

  function switchTab(tab: 'guide' | 'chat') {
    for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    }
    root.querySelector<HTMLElement>('[data-pane="guide"]')!.hidden = tab !== 'guide';
    root.querySelector<HTMLElement>('[data-pane="chat"]')!.hidden = tab !== 'chat';
    chatForm.hidden = tab !== 'chat';
    root.classList.toggle('chat-mode', tab === 'chat');
  }

  function renderFeatures() {
    listEl.innerHTML = '';
    setGuideEmpty(features.length === 0 && !summaryEl.textContent);
    for (const f of features) {
      const card = document.createElement('div');
      card.className = 'opg-card';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'opg-feat';
      btn.textContent = f.name;
      btn.title = f.description;
      btn.addEventListener('click', () => {
        void browser.runtime.sendMessage({ type: 'guide.highlight', uid: f.uid });
      });
      card.appendChild(btn);
      const desc = document.createElement('div');
      desc.className = 'opg-desc';
      desc.textContent = f.description;
      card.appendChild(desc);
      if (f.howTo?.length) {
        const steps = document.createElement('div');
        steps.className = 'opg-howto';
        f.howTo.forEach((step, i) => {
          const row = document.createElement('div');
          row.className = 'opg-howto-step';
          row.textContent = `${i + 1}. ${step}`;
          steps.appendChild(row);
        });
        card.appendChild(steps);
      }
      const actions = document.createElement('div');
      actions.className = 'opg-card-actions';
      const tourOne = document.createElement('button');
      tourOne.type = 'button';
      tourOne.className = 'opg-mini';
      tourOne.textContent = t.tourThis;
      tourOne.addEventListener('click', () => {
        void startTour(f.uid);
      });
      actions.appendChild(tourOne);

      // Only show assisted-click controls when the user opted in.
      if (allowAssistedClick) {
        const clickOne = document.createElement('button');
        clickOne.type = 'button';
        clickOne.className = 'opg-mini opg-mini-primary';
        clickOne.textContent = t.clickAction(f.name);
        clickOne.title = t.clickAction(f.name);
        clickOne.addEventListener('click', () => {
          void (async () => {
            await refreshPermissions();
            if (!allowAssistedClick) {
              statusEl.textContent = t.clickNeedPermission;
              renderFeatures();
              return;
            }
            const res = (await browser.runtime.sendMessage({
              type: 'page.click',
              uid: f.uid,
            })) as { ok?: boolean; error?: string; needPermission?: boolean };
            if (!res?.ok) {
              statusEl.textContent = res?.needPermission
                ? t.clickNeedPermission
                : res?.error || t.clickFailed;
              if (res?.needPermission) renderFeatures();
              return;
            }
            statusEl.textContent = `${t.clickDone}：${f.name}`;
          })();
        });
        actions.appendChild(clickOne);
      }
      card.appendChild(actions);
      listEl.appendChild(card);
    }
  }

  function appendBubble(role: 'user' | 'assistant', content: string): HTMLElement {
    const empty = chatLog.querySelector('.opg-chat-empty');
    empty?.remove();
    const div = document.createElement('div');
    div.className = `opg-bubble ${role}`;
    if (role === 'assistant') div.classList.add('streaming');
    div.textContent = content;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
    return div;
  }

  async function startTour(featureUid?: string) {
    const res = (await browser.runtime.sendMessage({
      type: 'guide.tour',
      action: 'start',
      featureUid,
      features,
    })) as { ok: boolean; error?: string; done?: boolean };
    if (!res?.ok) {
      statusEl.textContent = res?.error || t.tourFailed;
      setTouring(false);
      return;
    }
    setTouring(true);
    statusEl.textContent = res.done ? t.tourFinished : t.tourRunning;
    if (res.done) setTouring(false);
  }

  function closeSettings() {
    settingsPane.hidden = true;
    settingsHandle?.destroy();
    settingsHandle = null;
    settingsPane.replaceChildren();
    void refreshPermissions().then(() => renderFeatures());
  }

  function openSettings() {
    // Stay on the current page/panel — never jump to chrome://extensions.
    settingsHandle?.destroy();
    settingsPane.replaceChildren();
    settingsHandle = mountSettingsUi(settingsPane, {
      mode: 'embed',
      locale,
      onBack: closeSettings,
      onSaved: () => {
        void refreshPermissions().then(() => renderFeatures());
      },
    });
    settingsPane.hidden = false;
  }

  const settingsBtn = root.querySelector<HTMLButtonElement>(
    '[data-role="settings"]',
  )!;
  settingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    void openSettings();
  });
  // Some pages swallow click; mousedown is a reliable fallback.
  settingsBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  settingsBtn.addEventListener('mouseup', (e) => {
    e.stopPropagation();
  });

  root.querySelector('[data-role="close"]')?.addEventListener('click', () => {
    activePort?.disconnect();
    activePort = null;
    opts.onClose?.();
  });

  for (const btn of root.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab === 'chat' ? 'chat' : 'guide');
    });
  }

  root.querySelector('[data-role="analyze"]')!.addEventListener('click', () => {
    void (async () => {
      statusEl.textContent = t.analyzing;
      listEl.innerHTML = '';
      summaryEl.textContent = '';
      features = [];
      pageSummary = '';
      setGuideEmpty(true);
      setTouring(false);
      try {
        const res = (await browser.runtime.sendMessage({
          type: 'analyze.page',
          locale,
        })) as {
          ok: boolean;
          pageSummary?: string;
          features?: Feature[];
          error?: string;
          degraded?: boolean;
        };
        if (!res?.ok) {
          statusEl.textContent = res?.error || t.analyzeFailed;
          setGuideEmpty(true);
          return;
        }
        features = res.features || [];
        pageSummary = res.pageSummary || '';
        summaryEl.textContent =
          pageSummary + (res.degraded ? ` · ${t.rulesMode}` : '');
        renderFeatures();
        setTouring(false);
        statusEl.textContent = t.featuresCount(features.length);
        switchTab('guide');
      } catch (e) {
        statusEl.textContent = e instanceof Error ? e.message : String(e);
        setGuideEmpty(true);
      }
    })();
  });

  tourBtn.addEventListener('click', () => {
    void startTour();
  });

  nextBtn.addEventListener('click', () => {
    void (async () => {
      const res = (await browser.runtime.sendMessage({
        type: 'guide.tour',
        action: 'next',
      })) as { ok: boolean; done?: boolean; error?: string };
      if (!res?.ok) {
        statusEl.textContent = res?.error || t.tourFailed;
        return;
      }
      if (res.done) {
        statusEl.textContent = t.tourFinished;
        setTouring(false);
      } else {
        statusEl.textContent = t.tourRunning;
      }
    })();
  });

  endBtn.addEventListener('click', () => {
    void (async () => {
      await browser.runtime.sendMessage({ type: 'guide.tour', action: 'end' });
      statusEl.textContent = t.tourEnded;
      setTouring(false);
    })();
  });

  // Prevent page-level shortcut handlers from seeing keys typed in the panel.
  for (const type of ['keydown', 'keyup', 'keypress'] as const) {
    root.addEventListener(type, (e) => e.stopPropagation());
    chatForm.addEventListener(type, (e) => e.stopPropagation());
    chatInput.addEventListener(type, (e) => e.stopPropagation());
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const question = chatInput.value.trim();
    if (!question) return;
    chatInput.value = '';
    appendBubble('user', question);
    history.push({ role: 'user', content: question });

    const sendBtn = chatForm.querySelector('button')!;
    const actionKind = classifyChatPageAction(question);

    void (async () => {
      if (actionKind === 'forbidden') {
        const msg = forbiddenPageActionRefusal(locale);
        appendBubble('assistant', msg);
        history.push({ role: 'assistant', content: msg });
        return;
      }

      if (actionKind === 'confirm_execute') {
        await runPendingPlan();
        return;
      }
      if (actionKind === 'cancel_execute') {
        pendingPlan = null;
        appendBubble('assistant', t.executeCancelled);
        history.push({ role: 'assistant', content: t.executeCancelled });
        return;
      }

      if (isAssistRequest(actionKind)) {
        const goal = rememberOperateGoal(question);
        await presentOperatePlan(goal || question);
        return;
      }

      rememberOperateGoal(question);
      statusEl.textContent = t.chatThinking;
      sendBtn.disabled = true;

      activePort?.disconnect();
      const port = browser.runtime.connect({ name: 'opg-chat' });
      activePort = port;

      const assistantEl = appendBubble('assistant', '');
      let answer = '';

      port.onMessage.addListener((raw) => {
        const m = raw as {
          type?: string;
          text?: string;
          answer?: string;
          error?: string;
        };
        if (m.type === 'delta' && m.text) {
          answer += m.text;
          assistantEl.textContent = answer;
          chatLog.scrollTop = chatLog.scrollHeight;
          statusEl.textContent = '';
        } else if (m.type === 'done') {
          const final = (m.answer || answer).trim();
          assistantEl.textContent = final;
          assistantEl.classList.remove('streaming');
          if (final) history.push({ role: 'assistant', content: final });
          sendBtn.disabled = false;
          statusEl.textContent = '';
          port.disconnect();
          if (activePort === port) activePort = null;
          void refreshPermissions().then(() => {
            if (!allowAssistedClick || !operateGoal) return;
            const goalForPlan = operateGoal;
            appendChatActions([
              {
                label: t.helpOperate,
                primary: true,
                onClick: () => {
                  void presentOperatePlan(goalForPlan);
                },
              },
            ]);
          });
        } else if (m.type === 'error') {
          const err = m.error || t.chatFailed;
          assistantEl.textContent = err;
          assistantEl.classList.remove('streaming');
          history.push({ role: 'assistant', content: err });
          sendBtn.disabled = false;
          statusEl.textContent = t.chatFailed;
          port.disconnect();
          if (activePort === port) activePort = null;
        }
      });

      port.onDisconnect.addListener(() => {
        sendBtn.disabled = false;
        assistantEl.classList.remove('streaming');
        if (activePort === port) activePort = null;
      });

      port.postMessage({
        type: 'start',
        question,
        locale: normalizeLocale(locale),
        history: history.slice(0, -1),
        pageSummary,
        features: features.map((f) => ({
          name: f.name,
          description: f.description,
          howTo: f.howTo,
        })),
      });
    })();
  });

  if (opts.enableDrag) opts.enableDrag(header);
  void refreshPermissions();

  return {
    destroy() {
      activePort?.disconnect();
      closeSettings();
      style.remove();
      root.remove();
    },
  };
}
