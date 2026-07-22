import {
  chatAboutPage,
  streamChatAboutPage,
  type ChatPageContext,
  type ChatTurn,
} from '../lib/ai/chat';
import {
  assistedClickDisabledRefusal,
  classifyChatPageAction,
  forbiddenPageActionRefusal,
  isAssistRequest,
} from '../lib/ai/chat-policy';
import { interpretWithAi } from '../lib/ai/interpret';
import { rulesFallbackFeatures } from '../lib/ai/rules-fallback';
import {
  cacheKey,
  getCached,
  setCached,
  structureFingerprint,
} from '../lib/cache';
import { normalizeLocale, type UiLocale } from '../lib/i18n/locale';
import {
  isExtensionPageSender,
  isKnownRestrictedUrl,
  isRestrictedUrl,
  isSecurityRequest,
  type ExtensionRequest,
} from '../lib/messages';
import {
  buildClickPlan,
  formatClickPlan,
  type ClickPlan,
} from '../lib/page-action/build-click-plan';
import {
  consumePlanSession,
  createPlanSession,
} from '../lib/page-action/plan-session';
import type { Candidate } from '../lib/scanner';
import { toAiSummary } from '../lib/scanner';
import type { AiConfig } from '../lib/storage';
import {
  getSecurityStatus,
  getSettings,
  lockSession,
  resolveAiConfigForRequest,
  unlockWithPassphrase,
} from '../lib/settings-store';

async function activeAnalyzableTab(): Promise<
  { id: number; url?: string; title?: string } | null
> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || isRestrictedUrl(tab.url)) return null;
  return { id: tab.id, url: tab.url, title: tab.title };
}

async function planClicks(opts: {
  goal: string;
  locale: UiLocale;
  features?: Array<{
    uid: string;
    name: string;
    description: string;
    howTo: string[];
  }>;
}): Promise<
  | { ok: true; plan: ClickPlan; summary: string; token: string }
  | { ok: false; error: string; needPermission?: boolean }
> {
  const settings = await getSettings();
  if (settings.permissions.allowAssistedClick !== true) {
    return {
      ok: false,
      needPermission: true,
      error: assistedClickDisabledRefusal(opts.locale),
    };
  }
  const tab = await activeAnalyzableTab();
  if (!tab) {
    return {
      ok: false,
      error:
        opts.locale === 'zh'
          ? '当前标签页无法规划点击。'
          : 'Cannot plan clicks on this tab.',
    };
  }
  try {
    // Always live-scan — do not require the user to have clicked Analyze.
    const scan = (await browser.tabs.sendMessage(tab.id, {
      type: 'content.scan',
    })) as { ok?: boolean; candidates?: Candidate[] };
    const candidates = scan.candidates || [];

    // Optional: if panel has no analyzed features, synthesize from the live scan.
    let features = opts.features || [];
    if (!features.length && candidates.length) {
      features = rulesFallbackFeatures(candidates, opts.locale).features.map(
        (f) => ({
          uid: f.uid,
          name: f.name,
          description: f.description,
          howTo: f.howTo,
        }),
      );
    }

    const plan = buildClickPlan({
      goal: opts.goal,
      features,
      candidates,
      locale: opts.locale,
    });
    if (!plan) {
      return {
        ok: false,
        error:
          opts.locale === 'zh'
            ? '未能匹配到可执行步骤（1 步或多步）。请说具体控件名（如「播放」「静音」），或「跳到 20:00」这类进度目标。'
            : 'No executable steps matched (1 or more). Name a control (e.g. Play, Mute) or a seek goal like “jump to 20:00”.',
      };
    }
    const token = createPlanSession({
      tabId: tab.id,
      steps: plan.steps,
      goal: plan.goal,
    });
    return {
      ok: true,
      plan,
      token,
      summary: formatClickPlan(plan, opts.locale),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function prepareChatPage(opts: {
  locale: UiLocale;
  pageSummary?: string;
  features?: Array<{ name: string; description: string; howTo: string[] }>;
}): Promise<
  | { ok: true; aiConfig: AiConfig; page: ChatPageContext }
  | { ok: false; error: string }
> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.id || isRestrictedUrl(tab.url)) {
    return { ok: false, error: 'No analyzable tab' };
  }
  const resolved = await resolveAiConfigForRequest();
  if (!resolved.ok) {
    return {
      ok: false,
      error:
        opts.locale === 'zh'
          ? `无法对话：${resolved.reason}。请在设置中配置并解锁 API Key。`
          : `Chat unavailable: ${resolved.reason}. Configure/unlock API key in Settings.`,
    };
  }

  let scanHint = '';
  try {
    const scan = (await browser.tabs.sendMessage(tab.id, {
      type: 'content.scan',
    })) as {
      ok: boolean;
      candidates?: Candidate[];
      meta?: { title: string; url: string };
    };
    if (scan?.ok && scan.candidates) {
      scanHint = JSON.stringify(
        toAiSummary(
          scan.candidates,
          scan.meta || { title: tab.title || '', url: tab.url || '' },
        ),
      ).slice(0, 4000);
    }
  } catch {
    /* optional */
  }

  return {
    ok: true,
    aiConfig: resolved.settings.aiConfig,
    page: {
      title: tab.title || '',
      url: tab.url || '',
      pageSummary: opts.pageSummary,
      features: opts.features,
      scanHint,
    },
  };
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    if (browser.sidePanel?.setPanelBehavior) {
      // Floating panel is primary; keep side panel available but not on icon click.
      void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
    }
  });

  if (browser.sidePanel?.setPanelBehavior) {
    void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }

  async function toggleFloatOnTab(tabId: number): Promise<void> {
    try {
      await browser.tabs.sendMessage(tabId, { type: 'panel.toggle' });
      return;
    } catch {
      /* inject then retry — common after extension reload */
    }
    try {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/content.js'],
      });
      await browser.tabs.sendMessage(tabId, { type: 'panel.toggle' });
    } catch {
      // Last resort: open docked side panel so click is never a no-op.
      try {
        if (browser.sidePanel?.open) {
          await browser.sidePanel.open({ tabId });
        }
      } catch {
        /* ignore */
      }
    }
  }

  browser.action.onClicked.addListener((tab) => {
    void (async () => {
      if (!tab?.id) return;
      // tab.url may be missing without reading tabs; only skip known chrome:// etc.
      if (isKnownRestrictedUrl(tab.url)) return;
      await toggleFloatOnTab(tab.id);
    })();
  });

  // Streaming chat via long-lived port
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'opg-chat') return;
    if (!isExtensionPageSender(port.sender || {})) {
      try {
        port.disconnect();
      } catch {
        /* ignore */
      }
      return;
    }
    let abort: AbortController | null = null;

    port.onDisconnect.addListener(() => {
      abort?.abort();
      abort = null;
    });

    port.onMessage.addListener((raw) => {
      void (async () => {
        const msg = raw as {
          type?: string;
          question?: string;
          locale?: string;
          history?: ChatTurn[];
          pageSummary?: string;
          features?: Array<{ name: string; description: string; howTo: string[] }>;
        };
        if (msg.type !== 'start' || !msg.question) return;

        const locale = normalizeLocale(msg.locale);
        const actionKind = classifyChatPageAction(msg.question);
        if (actionKind === 'forbidden') {
          const answer = forbiddenPageActionRefusal(locale);
          port.postMessage({ type: 'delta', text: answer });
          port.postMessage({ type: 'done', answer });
          return;
        }
        // Assist / confirm flows are handled in the panel UI (plan → confirm → execute).
        if (
          isAssistRequest(actionKind) ||
          actionKind === 'confirm_execute' ||
          actionKind === 'cancel_execute'
        ) {
          const answer =
            locale === 'zh'
              ? '请使用对话下方的「帮我操作 / 确认执行」按钮完成代操作（需先确认点击链路）。'
              : 'Use the “Do it for me / Confirm” buttons below the chat to run assisted actions after confirming the chain.';
          port.postMessage({ type: 'delta', text: answer });
          port.postMessage({ type: 'done', answer });
          return;
        }

        const prepared = await prepareChatPage({
          locale,
          pageSummary: msg.pageSummary,
          features: msg.features,
        });
        if (!prepared.ok) {
          port.postMessage({ type: 'error', error: prepared.error });
          return;
        }

        abort?.abort();
        abort = new AbortController();
        const result = await streamChatAboutPage(
          prepared.aiConfig,
          {
            question: msg.question,
            locale,
            history: msg.history || [],
            page: prepared.page,
          },
          (chunk) => {
            try {
              port.postMessage({ type: 'delta', text: chunk });
            } catch {
              /* port closed */
            }
          },
          abort.signal,
        );

        if (!result.ok) {
          port.postMessage({ type: 'error', error: result.error });
          return;
        }
        port.postMessage({ type: 'done', answer: result.answer });
      })();
    });
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void (async () => {
      try {
        const msg = message as ExtensionRequest;
        if (isSecurityRequest(msg)) {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'security denied' });
            return;
          }
          if (msg.type === 'security.status') {
            sendResponse({ ok: true, ...(await getSecurityStatus()) });
            return;
          }
          if (msg.type === 'security.unlock') {
            await unlockWithPassphrase(msg.passphrase);
            sendResponse({ ok: true, ...(await getSecurityStatus()) });
            return;
          }
          if (msg.type === 'security.lock') {
            await lockSession();
            sendResponse({ ok: true, ...(await getSecurityStatus()) });
            return;
          }
          sendResponse({ ok: false, error: 'unknown security op' });
          return;
        }

        if (msg.type === 'analyze.page') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          const locale = normalizeLocale(msg.locale);
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id || isRestrictedUrl(tab.url)) {
            sendResponse({
              ok: false,
              error: 'Current page cannot be analyzed',
            });
            return;
          }
          const scan = (await browser.tabs.sendMessage(tab.id, {
            type: 'content.scan',
          })) as {
            ok: boolean;
            candidates?: Candidate[];
            meta?: { title: string; url: string };
            error?: string;
          };
          if (!scan?.ok) {
            sendResponse({ ok: false, error: scan?.error || 'Scan failed' });
            return;
          }
          const candidates = scan.candidates || [];
          const meta = scan.meta || {
            title: tab.title || '',
            url: tab.url || '',
          };

          let path = meta.url;
          try {
            const u = new URL(meta.url);
            path = u.origin + u.pathname;
          } catch {
            /* keep */
          }
          const fp = structureFingerprint(candidates);
          const key = cacheKey(path, fp, locale);
          const cached = await getCached(key);
          if (cached) {
            sendResponse({
              ok: true,
              pageSummary: cached.pageSummary,
              features: cached.features,
              degraded: cached.degraded,
            });
            return;
          }

          const resolved = await resolveAiConfigForRequest();
          if (!resolved.ok) {
            const fallback = rulesFallbackFeatures(candidates, locale);
            const why =
              locale === 'zh'
                ? resolved.reason === 'locked'
                  ? '保险库已锁定，请先在设置中解锁'
                  : '请先在设置中配置 API Key'
                : resolved.error;
            sendResponse({
              ok: true,
              pageSummary: why,
              features: fallback.features,
              degraded: true,
            });
            return;
          }

          const result = await interpretWithAi(
            resolved.settings.aiConfig,
            candidates,
            meta,
            locale,
          );
          if (!result.degraded) await setCached(key, result);
          sendResponse({
            ok: true,
            pageSummary: result.pageSummary,
            features: result.features,
            degraded: result.degraded,
          });
          return;
        }

        if (msg.type === 'chat.ask') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          const locale = normalizeLocale(msg.locale);
          const actionKind = classifyChatPageAction(msg.question);
          if (actionKind === 'forbidden') {
            sendResponse({
              ok: true,
              answer: forbiddenPageActionRefusal(locale),
            });
            return;
          }
          if (
            isAssistRequest(actionKind) ||
            actionKind === 'confirm_execute' ||
            actionKind === 'cancel_execute'
          ) {
            sendResponse({
              ok: true,
              answer:
                locale === 'zh'
                  ? '请使用对话中的「帮我操作 / 确认执行」按钮。'
                  : 'Use the chat “Do it for me / Confirm” buttons.',
            });
            return;
          }
          const prepared = await prepareChatPage({
            locale,
            pageSummary: msg.pageSummary,
            features: msg.features,
          });
          if (!prepared.ok) {
            sendResponse({ ok: false, error: prepared.error });
            return;
          }
          const result = await chatAboutPage(prepared.aiConfig, {
            question: msg.question,
            locale,
            history: msg.history || [],
            page: prepared.page,
          });
          sendResponse(result);
          return;
        }

        if (msg.type === 'page.plan') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          const uiLocale = normalizeLocale(
            msg.locale ||
              (typeof browser !== 'undefined' && browser.i18n?.getUILanguage
                ? browser.i18n.getUILanguage()
                : 'en'),
          );
          const planned = await planClicks({
            goal: msg.goal,
            locale: uiLocale,
            features: msg.features,
          });
          sendResponse(planned);
          return;
        }

        if (msg.type === 'page.execute') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          const settings = await getSettings();
          if (settings.permissions.allowAssistedClick !== true) {
            sendResponse({
              ok: false,
              error: 'Assisted click is disabled',
              needPermission: true,
            });
            return;
          }
          const token = typeof msg.token === 'string' ? msg.token : '';
          if (!token) {
            sendResponse({ ok: false, error: 'missing plan token' });
            return;
          }
          const tab = await activeAnalyzableTab();
          if (!tab) {
            sendResponse({ ok: false, error: 'No analyzable tab' });
            return;
          }
          const session = consumePlanSession(token, tab.id);
          if (!session) {
            sendResponse({
              ok: false,
              error:
                'Plan expired or invalid — request「帮我操作」again and confirm',
            });
            return;
          }
          // Steps come only from the SW session — never from the client payload.
          const res = await browser.tabs.sendMessage(tab.id, {
            type: 'page.execute',
            steps: session.steps,
          } as never);
          sendResponse(res ?? { ok: false, error: 'no response' });
          return;
        }

        if (msg.type === 'page.click') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          const settings = await getSettings();
          if (settings.permissions.allowAssistedClick !== true) {
            sendResponse({
              ok: false,
              error: 'Assisted click is disabled',
              needPermission: true,
            });
            return;
          }
          const tab = await activeAnalyzableTab();
          if (!tab) {
            sendResponse({ ok: false, error: 'No analyzable tab' });
            return;
          }
          const res = await browser.tabs.sendMessage(tab.id, {
            type: 'page.click',
            uid: msg.uid,
          } as never);
          sendResponse(res ?? { ok: false, error: 'no response' });
          return;
        }

        if (msg.type === 'options.open') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          await browser.runtime.openOptionsPage();
          sendResponse({ ok: true });
          return;
        }

        if (msg.type === 'guide.highlight' || msg.type === 'guide.tour') {
          if (!isExtensionPageSender(sender)) {
            sendResponse({ ok: false, error: 'denied' });
            return;
          }
          const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab?.id || isRestrictedUrl(tab.url)) {
            sendResponse({ ok: false, error: 'No analyzable tab' });
            return;
          }
          const res = await browser.tabs.sendMessage(tab.id, msg as never);
          sendResponse(res ?? { ok: true });
          return;
        }

        sendResponse({ ok: false, error: 'unknown message' });
      } catch (e) {
        sendResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
    return true;
  });
});
