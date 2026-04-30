import { createRouter, createWebHistory } from "vue-router";
import DesignSystemPage from "@/features/design-system/components/DesignSystemPage.vue";
import MrtDashboard from "@/features/mrt/components/MrtDashboard.vue";
import VoxelCockpitPage from "@/features/voxel-cockpit/components/VoxelCockpitPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "voxel-cockpit",
      component: VoxelCockpitPage,
    },
    {
      path: "/mrt-dashboard",
      name: "mrt-dashboard",
      component: MrtDashboard,
    },
    {
      path: "/design-system",
      name: "design-system",
      component: DesignSystemPage,
    },
  ],
});
