import { describe, expect, it } from 'vitest';
import { scanDocument, toAiSummary } from './scan';

function mount(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('scanDocument', () => {
  it('TC-F2-U01: finds interactive controls', () => {
    const doc = mount(`
      <h1>Form</h1>
      <button>Save</button>
      <a href="/x">Go</a>
      <input aria-label="Email" type="text" />
    `);
    const { candidates } = scanDocument(doc);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates.some((c) => c.text.includes('Save'))).toBe(true);
  });

  it('TC-F2-U02: empty body → []', () => {
    const doc = mount('');
    const { candidates } = scanDocument(doc);
    expect(candidates).toEqual([]);
  });

  it('TC-F2-U03: filters hidden controls', () => {
    const doc = mount(`
      <button style="display:none">Ghost</button>
      <button>Visible</button>
    `);
    const { candidates } = scanDocument(doc);
    expect(candidates.every((c) => !c.text.includes('Ghost'))).toBe(true);
    expect(candidates.some((c) => c.text.includes('Visible'))).toBe(true);
  });

  it('TC-F2-U04: caps at maxCandidates', () => {
    const buttons = Array.from({ length: 200 }, (_, i) => `<button>B${i}</button>`).join(
      '',
    );
    const doc = mount(buttons);
    const { candidates } = scanDocument(doc, { maxCandidates: 60 });
    expect(candidates.length).toBeLessThanOrEqual(60);
  });

  it('TC-F2-I01: payload serializable for AI summary', () => {
    const doc = mount(`<button>Ok</button><input type="password" aria-label="Secret" />`);
    const { candidates } = scanDocument(doc);
    const summary = toAiSummary(candidates, {
      title: 'T',
      url: 'https://example.com/app?x=1',
    });
    const json = JSON.stringify(summary);
    expect(json).toContain('"uid"');
    expect(summary.path).toBe('https://example.com/app');
    expect(json).not.toMatch(/value":"[^"]+"/);
  });

  it('TC-F2-I02: huge text truncated', () => {
    const huge = 'x'.repeat(500);
    const doc = mount(`<button>${huge}</button>`);
    const { candidates } = scanDocument(doc);
    expect(candidates[0]?.text.length).toBeLessThanOrEqual(120);
  });

  it('does not mutate host elements (no data-opg-uid)', () => {
    const doc = mount(`<button id="save">Save</button>`);
    const { candidates, elements } = scanDocument(doc);
    expect(candidates.length).toBeGreaterThan(0);
    expect(elements[0]?.hasAttribute('data-opg-uid')).toBe(false);
    expect(doc.querySelectorAll('[data-opg-uid]').length).toBe(0);
  });

  it('finds library tabs/buttons without ARIA roles', () => {
    const doc = mount(`
      <aside class="ant-layout-sider"><a href="#nav">侧栏</a></aside>
      <main class="ant-layout-content">
        <div class="ant-tabs-tab">MySQL</div>
        <div class="ant-tabs-tab">Redis</div>
        <button class="ant-btn">新增</button>
      </main>
    `);
    const { candidates } = scanDocument(doc);
    expect(candidates.some((c) => c.text.includes('MySQL'))).toBe(true);
    expect(candidates.some((c) => c.text.includes('Redis'))).toBe(true);
    expect(candidates.some((c) => c.text.includes('新增'))).toBe(true);
  });

  it('prefers main-content controls over chrome nav when capped', () => {
    const nav = Array.from(
      { length: 40 },
      (_, i) => `<a href="#n${i}">Nav${i}</a>`,
    ).join('');
    const doc = mount(`
      <nav>${nav}</nav>
      <main class="ant-layout-content">
        <div class="ant-tabs-tab">基础配置</div>
        <button class="ant-btn">生效配置</button>
      </main>
    `);
    const { candidates } = scanDocument(doc, { maxCandidates: 20 });
    expect(candidates.some((c) => c.text.includes('基础配置'))).toBe(true);
    expect(candidates.some((c) => c.text.includes('生效配置'))).toBe(true);
  });

  it('scans open shadow roots', () => {
    document.body.innerHTML = `<div id="host"></div>`;
    const host = document.querySelector('#host')!;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<button>ShadowSave</button>`;
    const { candidates } = scanDocument(document);
    expect(candidates.some((c) => c.text.includes('ShadowSave'))).toBe(true);
  });
});
