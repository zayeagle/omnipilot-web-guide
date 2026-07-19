import { defineConfig } from 'wxt';
import pkg from './package.json';

export default defineConfig({
  modules: [],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: pkg.version,
    permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'sidePanel'],
    host_permissions: ['<all_urls>'],
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      96: 'icon-96.png',
      128: 'icon-128.png',
    },
    action: {
      default_title: '__MSG_actionTitle__',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
      },
    },
    // Float panel embeds sidepanel.html in a page iframe — must be web-accessible.
    web_accessible_resources: [
      {
        resources: [
          'sidepanel.html',
          'assets/*',
          'chunks/*',
          'icon-16.png',
          'icon-32.png',
          'icon-48.png',
          'icon-96.png',
          'icon-128.png',
        ],
        matches: ['<all_urls>'],
      },
    ],
    browser_specific_settings: {
      gecko: {
        id: 'web-guide@omnipilot.local',
        strict_min_version: '109.0',
      },
    },
  },
});
