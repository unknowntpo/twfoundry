import { createApp } from 'vue';
import App from './App.vue';
import DesignSystemPage from './DesignSystemPage.vue';
import OperationsExplorer from './OperationsExplorer.vue';
import './styles.css';

const routes = {
  '/': OperationsExplorer,
  '/operations-explorer': OperationsExplorer,
  '/legacy-voxel': App,
  '/design-system': DesignSystemPage,
};

const Root = routes[window.location.pathname] ?? OperationsExplorer;

createApp(Root).mount('#app');
