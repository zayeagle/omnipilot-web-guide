import './style.css';
import { mountSettingsUi } from '../../lib/panel/mount-settings-ui';

const app = document.querySelector<HTMLDivElement>('#app')!;
mountSettingsUi(app, { mode: 'page' });
