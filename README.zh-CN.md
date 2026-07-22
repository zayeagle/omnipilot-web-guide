# OmniPilot 页面引导

[English](./README.md) | **中文**

<p align="center">
  <img src="./public/icon-128.png" width="96" height="96" alt="OmniPilot Web Guide"/>
</p>

**OmniPilot Web Guide** 是一款 Chrome / Firefox 浏览器扩展：自动识别任意网页可操作功能，并以图文分步方式指导操作。

| | |
|---|---|
| **平台** | Chrome、Edge、Firefox |
| **能力** | 规则扫描 · AI 解读 · 浮层面板 · 高亮导览 |
| **模型** | OpenAI / DeepSeek / Anthropic(经 OpenRouter) / OpenRouter / 自定义 |
| **安全** | 可选口令保险库 · 仅 SW 解锁 · 密钥不进 content script |
| **版本** | **v0.1.26** |

---

## 截图

<p align="center">
  <img src="./docs/screenshots/01-float-panel.png" width="280" alt="浮层面板 · 看一看"/>
  &nbsp;
  <img src="./docs/screenshots/02-ask-tab.png" width="280" alt="问一问对话"/>
</p>

<p align="center">
  <em>浮层面板 ·「看一看」（分析 / 导览）·「问一问」（对话指引）</em>
</p>

<p align="center">
  <img src="./docs/screenshots/03-settings.png" width="280" alt="面板内设置"/>
  &nbsp;
  <img src="./docs/screenshots/04-demo-page.png" width="420" alt="演示页"/>
</p>

<p align="center">
  <em>设置（服务商 / API Key / 代为点击 / 口令加密）· 用于分析的演示页</em>
</p>

---

## 功能

1. **分析页面**：启发式扫描可交互控件  
2. **AI 指引**：多供应商 Chat 生成功能说明与操作步骤  
3. **规则降级**：无 Key 或保险库锁定时仍可用  
4. **分步导览**：Shadow DOM 高亮 + 步骤卡片  
5. **代为点击（可选）**：默认关闭；开启并确认后，可执行 1…N 步点击 / 进度跳转  

---

## 后续规划 — 全程语音交互

下一步计划：让「看一看 / 问一问 / 代操作」**每个环节都可语音完成**（语音输入 + 语音播报），安全闸门与现有确认流程一致，禁止静默执行。

| 环节 | 语音输入 | 语音播报 |
|------|----------|----------|
| 提需求 | 说出本页想做什么 | — |
| 分析 / 问一问 | — | 播报页面分析结果或问一问回答 |
| 发起操作 | 语音说明要操作什么（触发生成操作链） | 执行前播报完整点击 / 跳转链路 |
| 确认 | 语音说「确认」才执行（也可取消） | — |
| 执行完成 | — | 播报执行结果 / 完成说明 |

原则：**全程可语音闭环**；操作链必须先播报，用户语音确认后才执行，结束后再语音说明。文字界面仍保留作为备用。

---

## 开发安装

```bash
npm install
npm run dev          # Chrome
npm run dev:firefox  # Firefox
```

在浏览器中加载 `.output/chrome-mv3`（或 Firefox 产物）未打包扩展。

点击扩展图标打开**可拖拽浮层面板**（分析 + 问一问）。界面与 AI 回复随浏览器语言（中 / 英）。

**工具栏固定**：是否把图标钉在地址栏旁由 Chrome / Edge 与用户决定，扩展**无法**设置「安装后默认不固定」。安装后请打开右上角「扩展程序」（拼图）菜单，需要时常显时再手动点图钉固定。

**设置**：面板内齿轮（或扩展选项页）→ 服务商 → API Key → 可选口令加密 → 可选代为点击。

重新生成 README 截图（可选）：

```bash
npm run build
node scripts/capture-readme-shots.mjs
```

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | WXT 开发（Chrome） |
| `npm run build` | Chrome 生产构建 |
| `npm run build:firefox` | Firefox 构建 |
| `npm test` | Vitest 单测 |
| `npm run test:e2e` | Playwright 冒烟 |
| `npm run ci` | 测试 + 构建 + 断言 + Firefox |
| `npm run bump` | patch 版本 +1（`package.json` / lock / README） |
| `npm run pack` | **默认先 bump 再打包** Chrome / Firefox zip |
| `npm run pack:all` | icons + 测试 + bump + zip（仅明确要求时用 `--no-bump`） |
| `npm run deploy` | CI + 打包 zip（见 `deploy/README.md`） |

---

## 安全要点

- Key 仅存本地；加固模式下使用 PBKDF2 + AES-GCM  
- 解锁会话只在 Service Worker 内存；不持久化口令自动解锁  
- 页面操作经后台中继 + 一次性 plan token；代为点击默认关闭并需风险确认  
- `security.*` 校验 `sender.id`  
- Base URL 仅允许 `https://`  

同系列：[omnipilot-lingua-bridge](https://github.com/zayeagle/omnipilot-lingua-bridge)

---

## 许可证

见 [LICENSE](./LICENSE)。
