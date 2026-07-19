import { mountGuideUi } from '../../lib/panel/mount-guide-ui';
import './style.css';

const MSG_SOURCE = 'omnipilot-web-guide';
const params = new URLSearchParams(location.search);
const isFloat = params.get('float') === '1';

const app = document.querySelector<HTMLDivElement>('#app')!;

function postToParent(payload: Record<string, unknown>) {
  if (!isFloat || window.parent === window) return;
  window.parent.postMessage({ source: MSG_SOURCE, ...payload }, '*');
}

mountGuideUi(app, {
  mode: isFloat ? 'float' : 'side',
  onClose: () => {
    postToParent({ type: 'close' });
  },
  enableDrag: isFloat
    ? (header) => {
        header.style.cursor = 'grab';
        let dragging = false;

        const onMove = (ev: PointerEvent) => {
          if (!dragging) return;
          postToParent({
            type: 'drag-move',
            screenX: ev.screenX,
            screenY: ev.screenY,
          });
        };

        const endDrag = (ev: PointerEvent) => {
          if (!dragging) return;
          dragging = false;
          header.style.cursor = 'grab';
          try {
            header.releasePointerCapture(ev.pointerId);
          } catch {
            /* ignore */
          }
          header.removeEventListener('pointermove', onMove);
          header.removeEventListener('pointerup', endDrag);
          header.removeEventListener('pointercancel', endDrag);
          postToParent({ type: 'drag-end' });
        };

        header.addEventListener('pointerdown', (ev) => {
          const target = ev.target as HTMLElement;
          if (ev.button !== 0) return;
          if (target.closest('button')) return;
          dragging = true;
          header.style.cursor = 'grabbing';
          postToParent({
            type: 'drag-start',
            screenX: ev.screenX,
            screenY: ev.screenY,
          });
          try {
            header.setPointerCapture(ev.pointerId);
          } catch {
            /* ignore */
          }
          header.addEventListener('pointermove', onMove);
          header.addEventListener('pointerup', endDrag);
          header.addEventListener('pointercancel', endDrag);
          ev.preventDefault();
        });
      }
    : undefined,
});
