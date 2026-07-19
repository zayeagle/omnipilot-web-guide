import { applyProviderPreset, PROVIDERS, type ProviderId } from '../providers';
import {
  fetchSecurityStatus,
  lockSessionRemote,
  unlockSession,
} from '../security-client';
import { maskApiKey } from '../secrets';
import { getSettings, saveAiConfig } from '../settings-store';
import { detectUiLocale, type UiLocale } from '../i18n/locale';

export type MountSettingsOptions = {
  /** Embedded inside float/side panel — show back control. */
  mode: 'embed' | 'page';
  onBack?: () => void;
  /** Fired after a successful save (e.g. refresh click-button visibility). */
  onSaved?: () => void;
  locale?: UiLocale;
};

type SettingsCopy = {
  title: string;
  note: string;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  keyPlaceholder: string;
  hardening: string;
  hardeningOffHint: string;
  vaultPurpose: string;
  passphrase: string;
  passphraseHint: string;
  allowClick: string;
  allowClickHint: string;
  allowClickRisk: string;
  allowClickConfirm: string;
  save: string;
  unlock: string;
  lock: string;
  back: string;
  saved: string;
  unlockedOk: string;
  lockedOk: string;
  noKey: string;
  keyEncrypted: string;
  storedKey: (mask: string) => string;
  statusLine: (s: {
    hardeningEnabled: boolean;
    hasCredential: boolean;
    unlocked: boolean;
  }) => string;
};

function copy(locale: UiLocale): SettingsCopy {
  if (locale === 'zh') {
    return {
      title: '设置',
      note: 'API Key 仅保存在扩展内，不会下发到网页内容脚本。',
      provider: '服务商',
      baseUrl: 'Base URL (https)',
      model: '对话模型',
      apiKey: 'API Key',
      keyPlaceholder: '留空则保留已有密钥',
      hardening: '用口令加密保存 API Key（可选）',
      hardeningOffHint:
        '不勾选时，Key 明文保存在扩展存储里，保存后即可直接用 AI，无需解锁。',
      vaultPurpose:
        '用意：多一层本地保护——磁盘上只存密文。要用 AI 时填口令点「解开」；用完或不放心时点「收起」，内存里的明文 Key 立刻消失。与「代为点击」无关。',
      passphrase: '口令',
      passphraseHint: '填入口令后才会出现下方「解开 / 收起」按钮。',
      allowClick: '允许代为点击页面元素',
      allowClickHint:
        '默认关闭。勾选并保存后，「看一看 / 问一问」才会显示代点击相关按钮。',
      allowClickRisk:
        '风险提醒：开启后，扩展可在你确认的操作链路中代为点击当前网页控件（含播放、跳转进度等）。误确认可能导致非预期操作。请只在可信页面使用，并仔细核对每一步再点确认。仍不会代填表单或改写页面内容。',
      allowClickConfirm:
        '即将开启「代为点击」。\n\n扩展可在你确认后点击当前网页上的控件，误操作可能影响页面状态。\n\n仅建议在可信页面使用。确定开启并保存吗？',
      save: '保存',
      unlock: '解开（开始用 AI）',
      lock: '收起密钥（暂停 AI）',
      back: '返回',
      saved: '已保存',
      unlockedOk: '已解开，可以调用 AI',
      lockedOk: '已收起密钥，AI 暂不可用',
      noKey: '尚未保存密钥',
      keyEncrypted: '密钥已加密保存在本地',
      storedKey: (mask) => `已保存密钥：${mask}`,
      statusLine: (s) =>
        `口令加密：${s.hardeningEnabled ? '开' : '关'} · 已存 Key：${s.hasCredential ? '有' : '无'} · AI 可用：${s.unlocked ? '是' : '否'}`,
    };
  }
  return {
    title: 'Settings',
    note: 'API keys stay in this extension. Content scripts never receive secrets.',
    provider: 'Provider',
    baseUrl: 'Base URL (https)',
    model: 'Chat model',
    apiKey: 'API Key',
    keyPlaceholder: 'Leave blank to keep existing',
    hardening: 'Encrypt API key with a passphrase (optional)',
    hardeningOffHint:
      'If unchecked, the key is stored as-is in extension storage and AI works right after Save — no unlock step.',
    vaultPurpose:
      'Purpose: extra local protection — only ciphertext on disk. Enter the passphrase and Unlock to use AI; Lock clears the plaintext key from memory. Unrelated to assisted click.',
    passphrase: 'Passphrase',
    passphraseHint:
      'Unlock / Lock buttons appear only after you type a passphrase.',
    allowClick: 'Allow clicking page elements for me',
    allowClickHint:
      'Off by default. When enabled and saved, click-action buttons appear in Guide / Ask.',
    allowClickRisk:
      'Risk: when enabled, this extension may click controls on the current page (play, seek, etc.) after you confirm a step chain. A mistaken confirm can cause unintended actions. Use only on trusted pages and review every step before confirming. It still will not fill forms or rewrite page content.',
    allowClickConfirm:
      'You are about to enable assisted click.\n\nAfter you confirm a plan, the extension can click controls on the current page. Mistakes may change page state.\n\nOnly enable on trusted pages. Continue and save?',
    save: 'Save',
    unlock: 'Unlock (enable AI)',
    lock: 'Lock key (pause AI)',
    back: 'Back',
    saved: 'Saved',
    unlockedOk: 'Unlocked — AI can run',
    lockedOk: 'Key locked — AI paused',
    noKey: 'No key stored',
    keyEncrypted: 'Key encrypted locally',
    storedKey: (mask) => `Stored key: ${mask}`,
    statusLine: (s) =>
      `Passphrase encryption: ${s.hardeningEnabled ? 'on' : 'off'} · Stored key: ${s.hasCredential ? 'yes' : 'no'} · AI ready: ${s.unlocked ? 'yes' : 'no'}`,
  };
}

export function mountSettingsUi(
  mount: HTMLElement,
  opts: MountSettingsOptions,
): { destroy: () => void; reload: () => Promise<void> } {
  const locale = opts.locale ?? detectUiLocale();
  const t = copy(locale);

  const root = document.createElement('div');
  root.className =
    opts.mode === 'embed' ? 'opg-settings-inner' : 'opg-settings-page';
  root.innerHTML = `
    ${
      opts.mode === 'embed'
        ? `<div class="opg-settings-bar">
            <button type="button" class="opg-btn ghost" data-role="back">${t.back}</button>
            <div class="opg-settings-title">${t.title}</div>
          </div>`
        : `<div class="opg-settings-title-lg">${t.title}</div>`
    }
    <div class="opg-settings-note">${t.note}</div>
    <label class="opg-settings-label">${t.provider}
      <select class="opg-settings-field" data-role="provider"></select>
    </label>
    <label class="opg-settings-label">${t.baseUrl}
      <input class="opg-settings-field" data-role="baseUrl" type="url" autocomplete="off" />
    </label>
    <label class="opg-settings-label">${t.model}
      <input class="opg-settings-field" data-role="model" type="text" list="opg-models" autocomplete="off" />
      <datalist id="opg-models" data-role="models"></datalist>
    </label>
    <label class="opg-settings-label">${t.apiKey}
      <input class="opg-settings-field" data-role="key" type="password" autocomplete="off" placeholder="${t.keyPlaceholder}" />
    </label>
    <div class="opg-settings-note" data-role="keyHint"></div>
    <label class="opg-settings-row">
      <input data-role="allowClick" type="checkbox" />
      <span>${t.allowClick}</span>
    </label>
    <div class="opg-settings-note">${t.allowClickHint}</div>
    <div class="opg-settings-risk" data-role="allowClickRisk" hidden>${t.allowClickRisk}</div>
    <label class="opg-settings-row">
      <input data-role="hardening" type="checkbox" />
      <span>${t.hardening}</span>
    </label>
    <div class="opg-settings-note" data-role="hardeningOffHint">${t.hardeningOffHint}</div>
    <div class="opg-vault" data-role="vaultBox" hidden>
      <div class="opg-settings-note">${t.vaultPurpose}</div>
      <label class="opg-settings-label">${t.passphrase}
        <input class="opg-settings-field" data-role="pass" type="password" autocomplete="new-password" />
      </label>
      <div class="opg-settings-note">${t.passphraseHint}</div>
      <div class="opg-settings-actions opg-vault-actions" data-role="vaultActions" hidden>
        <button type="button" class="opg-btn" data-role="unlock">${t.unlock}</button>
        <button type="button" class="opg-btn ghost" data-role="lock">${t.lock}</button>
      </div>
    </div>
    <div class="opg-settings-actions">
      <button type="button" class="opg-btn" data-role="save">${t.save}</button>
    </div>
    <div class="opg-settings-note" data-role="status"></div>
  `;

  mount.appendChild(root);

  const providerEl = root.querySelector<HTMLSelectElement>(
    '[data-role="provider"]',
  )!;
  const baseUrlEl = root.querySelector<HTMLInputElement>(
    '[data-role="baseUrl"]',
  )!;
  const modelEl = root.querySelector<HTMLInputElement>('[data-role="model"]')!;
  const modelsDl = root.querySelector<HTMLDataListElement>(
    '[data-role="models"]',
  )!;
  const keyEl = root.querySelector<HTMLInputElement>('[data-role="key"]')!;
  const keyHint = root.querySelector<HTMLElement>('[data-role="keyHint"]')!;
  const allowClickEl = root.querySelector<HTMLInputElement>(
    '[data-role="allowClick"]',
  )!;
  const allowClickRiskEl = root.querySelector<HTMLElement>(
    '[data-role="allowClickRisk"]',
  )!;
  const hardeningEl = root.querySelector<HTMLInputElement>(
    '[data-role="hardening"]',
  )!;
  const hardeningOffHintEl = root.querySelector<HTMLElement>(
    '[data-role="hardeningOffHint"]',
  )!;
  const vaultBoxEl = root.querySelector<HTMLElement>('[data-role="vaultBox"]')!;
  const vaultActionsEl = root.querySelector<HTMLElement>(
    '[data-role="vaultActions"]',
  )!;
  const passEl = root.querySelector<HTMLInputElement>('[data-role="pass"]')!;
  const statusEl = root.querySelector<HTMLElement>('[data-role="status"]')!;

  /** Tracks last loaded value so we only confirm when turning the option on. */
  let savedAllowClick = false;
  /** Session unlocked — keep Lock visible after passphrase field is cleared. */
  let sessionUnlocked = false;

  function syncAllowClickRisk() {
    allowClickRiskEl.hidden = !allowClickEl.checked;
  }

  function syncVaultUi() {
    const hardeningOn = hardeningEl.checked;
    vaultBoxEl.hidden = !hardeningOn;
    hardeningOffHintEl.hidden = hardeningOn;
    const hasPass = passEl.value.trim().length > 0;
    // Unlock needs a typed passphrase; Lock stays if already unlocked (no re-type).
    vaultActionsEl.hidden = !(hardeningOn && (hasPass || sessionUnlocked));
    const unlockBtn = root.querySelector<HTMLButtonElement>(
      '[data-role="unlock"]',
    )!;
    const lockBtn = root.querySelector<HTMLButtonElement>('[data-role="lock"]')!;
    unlockBtn.hidden = !hasPass;
    lockBtn.hidden = !(hasPass || sessionUnlocked);
  }

  allowClickEl.addEventListener('change', () => {
    syncAllowClickRisk();
  });
  hardeningEl.addEventListener('change', () => {
    syncVaultUi();
  });
  passEl.addEventListener('input', () => {
    syncVaultUi();
  });

  for (const p of PROVIDERS) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.label} — ${p.blurb}`;
    providerEl.appendChild(opt);
  }

  function fillModels(providerId: string) {
    modelsDl.innerHTML = '';
    const p = PROVIDERS.find((x) => x.id === providerId);
    for (const m of p?.chatModels || []) {
      const o = document.createElement('option');
      o.value = m;
      modelsDl.appendChild(o);
    }
  }

  providerEl.addEventListener('change', () => {
    const id = providerEl.value as ProviderId;
    const next = applyProviderPreset(id, {
      baseUrl: baseUrlEl.value,
      chatModel: modelEl.value,
    });
    baseUrlEl.value = next.baseUrl;
    if (next.chatModel) modelEl.value = next.chatModel;
    fillModels(id);
  });

  async function refreshStatus() {
    try {
      const s = await fetchSecurityStatus();
      sessionUnlocked = !!s.unlocked;
      statusEl.textContent = t.statusLine({
        hardeningEnabled: !!s.hardeningEnabled,
        hasCredential: !!s.hasCredential,
        unlocked: sessionUnlocked,
      });
      syncVaultUi();
    } catch (e) {
      statusEl.textContent = e instanceof Error ? e.message : String(e);
    }
  }

  async function load() {
    const settings = await getSettings();
    providerEl.value = settings.aiConfig.providerId || 'openai';
    baseUrlEl.value = settings.aiConfig.baseUrl;
    modelEl.value = settings.aiConfig.chatModel;
    savedAllowClick = settings.permissions.allowAssistedClick === true;
    allowClickEl.checked = savedAllowClick;
    syncAllowClickRisk();
    hardeningEl.checked = settings.security.hardeningEnabled;
    fillModels(providerEl.value);
    keyHint.textContent = settings.aiConfig.apiKey
      ? t.storedKey(maskApiKey(settings.aiConfig.apiKey))
      : settings.security.hardeningEnabled
        ? t.keyEncrypted
        : t.noKey;
    await refreshStatus();
    syncVaultUi();
  }

  root.querySelector('[data-role="back"]')?.addEventListener('click', () => {
    opts.onBack?.();
  });

  root.querySelector('[data-role="save"]')!.addEventListener('click', () => {
    void (async () => {
      try {
        const enablingClick = allowClickEl.checked && !savedAllowClick;
        if (enablingClick && !window.confirm(t.allowClickConfirm)) {
          return;
        }
        const pass = passEl.value;
        const hardening = hardeningEl.checked;
        await saveAiConfig({
          aiConfig: {
            providerId: providerEl.value,
            baseUrl: baseUrlEl.value.trim(),
            chatModel: modelEl.value.trim(),
            apiKey: keyEl.value,
          },
          hardening,
          passphrase: pass,
          permissions: {
            allowAssistedClick: allowClickEl.checked,
          },
        });
        if (hardening && pass.trim()) {
          await unlockSession(pass);
        }
        keyEl.value = '';
        passEl.value = '';
        await load();
        statusEl.textContent = t.saved;
        syncVaultUi();
        opts.onSaved?.();
      } catch (e) {
        statusEl.textContent = e instanceof Error ? e.message : String(e);
      }
    })();
  });

  root.querySelector('[data-role="unlock"]')!.addEventListener('click', () => {
    void (async () => {
      try {
        await unlockSession(passEl.value);
        passEl.value = '';
        await refreshStatus();
        statusEl.textContent = t.unlockedOk;
      } catch (e) {
        statusEl.textContent = e instanceof Error ? e.message : String(e);
      }
    })();
  });

  root.querySelector('[data-role="lock"]')!.addEventListener('click', () => {
    void (async () => {
      try {
        await lockSessionRemote();
        await refreshStatus();
        statusEl.textContent = t.lockedOk;
      } catch (e) {
        statusEl.textContent = e instanceof Error ? e.message : String(e);
      }
    })();
  });

  void load();

  return {
    destroy() {
      root.remove();
    },
    reload: load,
  };
}
