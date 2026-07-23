import {
  createTour,
  currentStep,
  endTour,
  featuresToSteps,
  hideSpotlight,
  nextTour,
  resolveElementRect,
  showSpotlight,
  skipTour,
  type TourState,
} from '../lib/guide';
import { detectUiLocale, guideStrings } from '../lib/i18n/locale';
import { isBackgroundSender } from '../lib/messages';
import {
  setFloatCloseHandler,
  toggleFloatPanel,
} from '../lib/panel/float-panel';
import { clearLegacyOpgMarks, scanDocument } from '../lib/scanner';

// Isolated-world flag (not visible to page JS).
let contentMainBound = false;

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    // Prevent double listeners when background re-injects after extension reload.
    if (contentMainBound) return;
    contentMainBound = true;

    // Undo marks left by older builds that wrote onto the host DOM.
    clearLegacyOpgMarks(document);

    let lastByUid = new Map<string, Element>();
    let tour: TourState = createTour([]);
    let highlightTimer: number | undefined;

    function stopTourUi() {
      if (highlightTimer) {
        window.clearTimeout(highlightTimer);
        highlightTimer = undefined;
      }
      tour = endTour(tour);
      hideSpotlight();
    }

    setFloatCloseHandler(() => stopTourUi());

    const t = guideStrings(detectUiLocale());
    const spotLabels = {
      close: t.close,
      next: t.next,
      end: t.end,
    };

    function resolveEl(uid: string): HTMLElement | null {
      let el = lastByUid.get(uid);
      // Element may have been detached after navigation/DOM update — rescan.
      if (!el || !el.isConnected) {
        const rescan = scanDocument(document);
        lastByUid = new Map(
          rescan.elements.map((e, i) => [rescan.candidates[i]!.uid, e] as const),
        );
        rescan.elements.length = 0;
        rescan.candidates.length = 0;
        el = lastByUid.get(uid);
      }
      return el instanceof HTMLElement ? el : null;
    }

    function paintTourStep(): { ok: boolean; error?: string; done?: boolean } {
      const step = currentStep(tour);
      if (!step) {
        hideSpotlight();
        return { ok: true, done: true };
      }
      const el = resolveEl(step.uid);
      if (!el) {
        hideSpotlight();
        return { ok: false, error: 'Element not found; try Analyze again' };
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = resolveElementRect(el);
      const hasNext = tour.index < tour.steps.length - 1;
      showSpotlight(
        {
          rect,
          title: step.title,
          body: step.body,
          stepLabel: `${tour.index + 1} / ${tour.steps.length}`,
          showNext: hasNext,
          labels: spotLabels,
        },
        {
          onNext: () => {
            tour = nextTour(tour);
            if (!tour.active) {
              hideSpotlight();
              return;
            }
            paintTourStep();
          },
          onEnd: () => {
            stopTourUi();
          },
          onClose: () => {
            stopTourUi();
          },
        },
      );
      return { ok: true, done: false };
    }

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      void (async () => {
        const msg = message as {
          type?: string;
          uid?: string;
          action?: string;
          featureUid?: string;
          features?: Array<{ uid: string; name: string; howTo: string[] }>;
          steps?: Array<{
            kind?: 'click' | 'seek';
            uid?: string;
            label?: string;
            seconds?: number;
          }>;
        };

        // Privileged host mutations / scan: service worker only (never UI fan-out).
        const privileged = new Set([
          'panel.toggle',
          'content.scan',
          'page.click',
          'page.execute',
          'guide.highlight',
          'guide.tour',
        ]);
        if (msg.type && privileged.has(msg.type) && !isBackgroundSender(sender)) {
          sendResponse({ ok: false, error: 'denied' });
          return;
        }

        if (msg.type === 'panel.toggle') {
          const open = toggleFloatPanel();
          if (!open) stopTourUi();
          sendResponse({ ok: true, open });
          return;
        }

        if (msg.type === 'content.scan') {
          const { candidates, elements } = scanDocument(document);
          lastByUid = new Map(
            elements.map((el, i) => [candidates[i]!.uid, el] as const),
          );
          // Snapshot for the message; drop working arrays after respond.
          const payload = candidates.slice();
          sendResponse({
            ok: true,
            candidates: payload,
            meta: {
              title: document.title,
              url: location.href,
            },
          });
          // Do not mutate `payload` after sendResponse (may still be cloning).
          // Drop scan working arrays; uid→element map is kept for guide/click.
          elements.length = 0;
          candidates.length = 0;
          return;
        }

        async function clickUid(uid: string): Promise<{ ok: boolean; error?: string; label?: string }> {
          const el = resolveEl(uid);
          if (!el) {
            return { ok: false, error: 'Element not found; try Analyze again' };
          }
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await new Promise((r) => window.setTimeout(r, 180));
          el.click();
          const label =
            el.getAttribute('aria-label') ||
            el.textContent?.trim().slice(0, 80) ||
            uid;
          showSpotlight(
            {
              rect: resolveElementRect(el),
              title: label,
              body:
                detectUiLocale() === 'zh'
                  ? '已代为点击该控件'
                  : 'Clicked this control for you',
              stepLabel: detectUiLocale() === 'zh' ? '代为点击' : 'Assisted click',
              showNext: false,
              labels: spotLabels,
            },
            {
              onClose: () => hideSpotlight(),
              onEnd: () => hideSpotlight(),
            },
          );
          if (highlightTimer) window.clearTimeout(highlightTimer);
          highlightTimer = window.setTimeout(() => hideSpotlight(), 2500);
          return { ok: true, label };
        }

        if (msg.type === 'page.click' && msg.uid) {
          sendResponse(await clickUid(msg.uid));
          return;
        }

        function seekMedia(seconds: number): {
          ok: boolean;
          error?: string;
          label?: string;
        } {
          const media =
            document.querySelector('video') ||
            document.querySelector('audio');
          if (!(media instanceof HTMLMediaElement)) {
            return {
              ok: false,
              error:
                detectUiLocale() === 'zh'
                  ? '页面上未找到可跳转的视频/音频'
                  : 'No seekable video/audio found on the page',
            };
          }
          const duration = Number.isFinite(media.duration) ? media.duration : seconds;
          const target = Math.min(Math.max(0, seconds), Math.max(0, duration || seconds));
          media.currentTime = target;
          const label =
            detectUiLocale() === 'zh'
              ? `进度已跳到约 ${Math.floor(target / 60)}:${String(Math.floor(target % 60)).padStart(2, '0')}`
              : `Seeked to ~${Math.floor(target / 60)}:${String(Math.floor(target % 60)).padStart(2, '0')}`;
          const rect = resolveElementRect(media);
          showSpotlight(
            {
              rect,
              title: label,
              body:
                detectUiLocale() === 'zh'
                  ? '已调整媒体播放进度'
                  : 'Adjusted media playback position',
              stepLabel: detectUiLocale() === 'zh' ? '跳转进度' : 'Seek',
              showNext: false,
              labels: spotLabels,
            },
            {
              onClose: () => hideSpotlight(),
              onEnd: () => hideSpotlight(),
            },
          );
          if (highlightTimer) window.clearTimeout(highlightTimer);
          highlightTimer = window.setTimeout(() => hideSpotlight(), 2500);
          return { ok: true, label };
        }

        if (msg.type === 'page.execute' && Array.isArray(msg.steps)) {
          const steps = msg.steps as Array<{
            kind?: 'click' | 'seek';
            uid?: string;
            label?: string;
            seconds?: number;
          }>;
          const done: string[] = [];
          for (const step of steps) {
            const kind =
              step.kind ||
              (typeof step.seconds === 'number' ? 'seek' : 'click');
            if (kind === 'seek') {
              if (typeof step.seconds !== 'number') {
                sendResponse({
                  ok: false,
                  error: 'Invalid seek step',
                  done,
                });
                return;
              }
              const res = seekMedia(step.seconds);
              if (!res.ok) {
                sendResponse({ ok: false, error: res.error, done });
                return;
              }
              done.push(res.label || step.label || 'seek');
            } else {
              if (!step?.uid) continue;
              const res = await clickUid(step.uid);
              if (!res.ok) {
                sendResponse({
                  ok: false,
                  error: res.error,
                  done,
                });
                return;
              }
              done.push(res.label || step.label || step.uid);
            }
            await new Promise((r) => window.setTimeout(r, 450));
          }
          sendResponse({ ok: true, done });
          return;
        }

        if (msg.type === 'guide.highlight' && msg.uid) {
          const el = resolveEl(msg.uid);
          if (!el) {
            sendResponse({
              ok: false,
              error: 'Element not found; try Analyze again',
            });
            return;
          }
          if (highlightTimer) window.clearTimeout(highlightTimer);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showSpotlight(
            {
              rect: resolveElementRect(el),
              title:
                el.getAttribute('aria-label') ||
                el.textContent?.trim().slice(0, 80) ||
                msg.uid,
              body: detectUiLocale() === 'zh' ? '已高亮该控件' : 'Highlighted control',
              stepLabel: detectUiLocale() === 'zh' ? '高亮' : 'Highlight',
              showNext: false,
              labels: spotLabels,
            },
            {
              onClose: () => hideSpotlight(),
              onEnd: () => hideSpotlight(),
            },
          );
          highlightTimer = window.setTimeout(() => hideSpotlight(), 8000);
          sendResponse({ ok: true });
          return;
        }

        if (msg.type === 'guide.tour') {
          const action = msg.action || 'start';
          if (action === 'start') {
            const steps = featuresToSteps(msg.features || [], msg.featureUid);
            tour = createTour(steps);
            if (!tour.active) {
              sendResponse({ ok: false, error: 'No steps to tour' });
              return;
            }
            sendResponse(paintTourStep());
            return;
          }
          if (action === 'next') {
            tour = nextTour(tour);
            if (!tour.active) {
              hideSpotlight();
              sendResponse({ ok: true, done: true });
              return;
            }
            sendResponse(paintTourStep());
            return;
          }
          if (action === 'skip') {
            tour = skipTour(tour);
            hideSpotlight();
            sendResponse({ ok: true, done: true });
            return;
          }
          if (action === 'end') {
            stopTourUi();
            sendResponse({ ok: true, done: true });
            return;
          }
          sendResponse({ ok: false, error: 'unknown tour action' });
          return;
        }

        sendResponse({ ok: false, error: 'unknown' });
      })();
      return true;
    });
  },
});
