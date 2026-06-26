import { createApp } from 'vue';
import BusOversightDashboard from './BusOversightDashboard.vue';
import DesignSystemPage from './DesignSystemPage.vue';
import MinimumDesignSystemContract from './MinimumDesignSystemContract.vue';
import OperationsExplorer from './OperationsExplorer.vue';
import './styles.css';

const routes = {
  '/': OperationsExplorer,
  '/bus-oversight': BusOversightDashboard,
  '/design-system': DesignSystemPage,
  '/design-system-contract': MinimumDesignSystemContract,
  '/minimum-design-system-contract': MinimumDesignSystemContract,
};

const Root = routes[window.location.pathname] ?? OperationsExplorer;
const scrollPages = new Set(['/bus-oversight']);
document.body.classList.toggle('document-scroll-page', scrollPages.has(window.location.pathname));
// Dark page background for the oversight dashboard so the side margins (the centered max-width
// shell) blend with the dark UI instead of showing the light body colour.
document.body.classList.toggle('oversight-page', window.location.pathname === '/bus-oversight');

createApp(Root).mount('#app');
