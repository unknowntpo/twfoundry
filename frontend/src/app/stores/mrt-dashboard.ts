import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  findLiveBoardRowsByStation,
  findStationById,
  mrtLines,
} from "@/features/mrt/data/mrt-fixtures";
import type { MrtLineId } from "@/features/mrt/types";

export const useMrtDashboardStore = defineStore("mrt-dashboard", () => {
  const selectedStationId = ref<string | undefined>();
  const visibleLineIds = ref<MrtLineId[]>(mrtLines.map((line) => line.id));

  const selectedStation = computed(() => {
    return selectedStationId.value ? findStationById(selectedStationId.value) : undefined;
  });

  const selectedLiveBoards = computed(() => {
    return selectedStationId.value ? findLiveBoardRowsByStation(selectedStationId.value) : [];
  });

  function selectStation(stationId: string): void {
    selectedStationId.value = findStationById(stationId)?.id;
  }

  function toggleLine(lineId: MrtLineId): void {
    if (visibleLineIds.value.includes(lineId)) {
      visibleLineIds.value = visibleLineIds.value.filter((id) => id !== lineId);
      return;
    }

    visibleLineIds.value = [...visibleLineIds.value, lineId];
  }

  return {
    selectedStationId,
    selectedStation,
    selectedLiveBoards,
    visibleLineIds,
    selectStation,
    toggleLine,
  };
});
