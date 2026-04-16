import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchTdxLiveBoardRows } from "@/features/mrt/api/tdx-liveboard";
import {
  findLiveBoardRowsByStation,
  findStationById,
  mrtLines,
} from "@/features/mrt/data/mrt-fixtures";
import type { MrtLineId } from "@/features/mrt/types";
import { appConfig } from "@/shared/config/env";

export const useMrtDashboardStore = defineStore("mrt-dashboard", () => {
  const selectedStationId = ref<string | undefined>();
  const selectedLiveBoards = ref(findLiveBoardRowsByStation(""));
  const liveBoardError = ref<string | undefined>();
  const liveBoardLoading = ref(false);
  const visibleLineIds = ref<MrtLineId[]>(mrtLines.map((line) => line.id));

  const selectedStation = computed(() => {
    return selectedStationId.value ? findStationById(selectedStationId.value) : undefined;
  });

  async function selectStation(stationId: string): Promise<void> {
    const station = findStationById(stationId);
    selectedStationId.value = station?.id;
    liveBoardError.value = undefined;

    if (!station) {
      selectedLiveBoards.value = [];
      return;
    }

    if (appConfig.mrtLiveBoardSource === "mock") {
      selectedLiveBoards.value = findLiveBoardRowsByStation(station.id);
      return;
    }

    await refreshLiveBoards();
  }

  async function refreshLiveBoards(): Promise<void> {
    if (!selectedStationId.value) {
      selectedLiveBoards.value = [];
      return;
    }

    if (appConfig.mrtLiveBoardSource === "mock") {
      selectedLiveBoards.value = findLiveBoardRowsByStation(selectedStationId.value);
      return;
    }

    liveBoardLoading.value = true;
    liveBoardError.value = undefined;
    try {
      selectedLiveBoards.value = await fetchTdxLiveBoardRows(
        selectedStationId.value,
        appConfig.tdxProxyUrl,
      );
    } catch (error) {
      liveBoardError.value =
        error instanceof Error ? error.message : "Unable to load TDX LiveBoard rows.";
      selectedLiveBoards.value = [];
    } finally {
      liveBoardLoading.value = false;
    }
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
    liveBoardError,
    liveBoardLoading,
    visibleLineIds,
    refreshLiveBoards,
    selectStation,
    toggleLine,
  };
});
