import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchTdxLiveBoard } from "@/features/mrt/api/tdx-liveboard";
import {
  findLiveBoardRowsByStation,
  findStationById,
  mrtLines,
} from "@/features/mrt/data/mrt-fixtures";
import { defaultVisibleOverlayIds } from "@/features/mrt/map/overlay-registry";
import type { MrtLineId } from "@/features/mrt/types";
import { appConfig } from "@/shared/config/env";

export const supportedLiveRefreshIntervalsMs = [5000, 20000, 30000, 60000] as const;
export type TimelineMode = "live" | "paused";

export const useMrtDashboardStore = defineStore("mrt-dashboard", () => {
  const selectedStationId = ref<string | undefined>();
  const selectedTrainId = ref<string | undefined>();
  const selectedLiveBoards = ref(findLiveBoardRowsByStation(""));
  const liveBoardError = ref<string | undefined>();
  const liveBoardLoading = ref(false);
  const liveBoardUpdatedAt = ref<string | undefined>();
  const visibleLineIds = ref<MrtLineId[]>(mrtLines.map((line) => line.id));
  const visibleOverlayIds = ref(defaultVisibleOverlayIds());
  const timelineMode = ref<TimelineMode>("live");
  const liveRefreshIntervalMs = ref<(typeof supportedLiveRefreshIntervalsMs)[number]>(30000);

  const selectedStation = computed(() => {
    return selectedStationId.value ? findStationById(selectedStationId.value) : undefined;
  });

  async function selectStation(stationId: string): Promise<void> {
    const station = findStationById(stationId);
    selectedStationId.value = station?.id;
    liveBoardError.value = undefined;

    if (!station) {
      selectedLiveBoards.value = [];
      liveBoardUpdatedAt.value = undefined;
      selectedTrainId.value = undefined;
      return;
    }

    if (appConfig.mrtLiveBoardSource === "mock") {
      selectedLiveBoards.value = findLiveBoardRowsByStation(station.id);
      liveBoardUpdatedAt.value = new Date().toISOString();
      syncSelectedTrain();
      return;
    }

    await refreshLiveBoards();
  }

  async function refreshLiveBoards(): Promise<void> {
    if (!selectedStationId.value) {
      selectedLiveBoards.value = [];
      liveBoardUpdatedAt.value = undefined;
      selectedTrainId.value = undefined;
      return;
    }

    if (appConfig.mrtLiveBoardSource === "mock") {
      selectedLiveBoards.value = findLiveBoardRowsByStation(selectedStationId.value);
      liveBoardUpdatedAt.value = new Date().toISOString();
      syncSelectedTrain();
      return;
    }

    liveBoardLoading.value = true;
    liveBoardError.value = undefined;
    try {
      const payload = await fetchTdxLiveBoard(
        selectedStationId.value,
        appConfig.tdxProxyUrl,
      );
      selectedLiveBoards.value = payload.rows;
      liveBoardUpdatedAt.value = payload.updatedAt;
      syncSelectedTrain();
    } catch (error) {
      liveBoardError.value =
        error instanceof Error ? error.message : "Unable to load TDX LiveBoard rows.";
      selectedLiveBoards.value = [];
      liveBoardUpdatedAt.value = undefined;
      selectedTrainId.value = undefined;
    } finally {
      liveBoardLoading.value = false;
    }
  }

  function selectTrain(trainId: string | undefined): void {
    selectedTrainId.value = trainId;
  }

  function syncSelectedTrain(): void {
    if (!selectedTrainId.value) {
      return;
    }

    if (!selectedLiveBoards.value.some((row) => row.id === selectedTrainId.value)) {
      selectedTrainId.value = undefined;
    }
  }

  function toggleLine(lineId: MrtLineId): void {
    if (visibleLineIds.value.includes(lineId)) {
      visibleLineIds.value = visibleLineIds.value.filter((id) => id !== lineId);
      return;
    }

    visibleLineIds.value = [...visibleLineIds.value, lineId];
  }

  function toggleOverlay(overlayId: (typeof visibleOverlayIds.value)[number]): void {
    if (visibleOverlayIds.value.includes(overlayId)) {
      visibleOverlayIds.value = visibleOverlayIds.value.filter((id) => id !== overlayId);
      return;
    }

    visibleOverlayIds.value = [...visibleOverlayIds.value, overlayId];
  }

  function setTimelineMode(mode: TimelineMode): void {
    timelineMode.value = mode;
  }

  function setLiveRefreshIntervalMs(intervalMs: number): void {
    if (
      supportedLiveRefreshIntervalsMs.includes(
        intervalMs as (typeof supportedLiveRefreshIntervalsMs)[number],
      )
    ) {
      liveRefreshIntervalMs.value = intervalMs as (typeof supportedLiveRefreshIntervalsMs)[number];
    }
  }

  return {
    selectedStationId,
    selectedTrainId,
    selectedStation,
    selectedLiveBoards,
    liveBoardError,
    liveBoardLoading,
    liveBoardUpdatedAt,
    visibleLineIds,
    visibleOverlayIds,
    timelineMode,
    liveRefreshIntervalMs,
    refreshLiveBoards,
    selectStation,
    toggleLine,
    toggleOverlay,
    setTimelineMode,
    setLiveRefreshIntervalMs,
    selectTrain,
  };
});
