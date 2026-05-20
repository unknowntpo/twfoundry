import { createApp } from 'vue';
import App from './App.vue';
import DesignSystemPage from './DesignSystemPage.vue';
import './styles.css';

const Root = window.location.pathname === '/design-system' ? DesignSystemPage : App;

createApp(Root).mount('#app');
