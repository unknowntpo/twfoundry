import { createApp } from 'vue';
import App from './App.vue';
import BusOversightDashboard from './BusOversightDashboard.vue';
import DesignSystemPage from './DesignSystemPage.vue';
import MinimumDesignSystemContract from './MinimumDesignSystemContract.vue';
import OperationsExplorer from './OperationsExplorer.vue';
import RouteGeometryConcept from './RouteGeometryConcept.vue';
import './styles.css';

const routes = {
  '/': OperationsExplorer,
  '/operations-explorer': OperationsExplorer,
  '/bus-oversight': BusOversightDashboard,
  '/legacy-voxel': App,
  '/design-system': DesignSystemPage,
  '/design-system-contract': MinimumDesignSystemContract,
  '/minimum-design-system-contract': MinimumDesignSystemContract,
  '/route-geometry': RouteGeometryConcept,
};

const Root = routes[window.location.pathname] ?? OperationsExplorer;
const scrollPages = new Set(['/bus-oversight', '/route-geometry']);
document.body.classList.toggle('document-scroll-page', scrollPages.has(window.location.pathname));
// Dark page background for the oversight dashboard so the side margins (the centered max-width
// shell) blend with the dark UI instead of showing the light body colour.
document.body.classList.toggle('oversight-page', window.location.pathname === '/bus-oversight');

createApp(Root).mount('#app');
