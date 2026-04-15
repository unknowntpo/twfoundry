import { createRouter, createWebHistory } from "vue-router";
import MrtDashboard from "@/features/mrt/components/MrtDashboard.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "mrt-dashboard",
      component: MrtDashboard
    }
  ]
});
