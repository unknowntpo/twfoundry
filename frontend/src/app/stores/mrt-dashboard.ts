import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchTdxLiveBoard } from "@/features/mrt/api/tdx-liveboard";
import {
  liveBoardRows,
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
  const networkLiveBoards = ref(findLiveBoardRowsByStation(""));
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
  const selectedLiveBoards = computed(() => {
    if (!selectedStationId.value) {
      return [];
    }
    return networkLiveBoards.value.filter((row) => row.stationId === selectedStationId.value);
  });

  async function selectStation(stationId: string): Promise<void> {
    const station = findStationById(stationId);
    selectedStationId.value = station?.id;
    liveBoardError.value = undefined;

    if (!station) {
      liveBoardUpdatedAt.value = undefined;
      selectedTrainId.value = undefined;
      return;
    }

    if (appConfig.mrtLiveBoardSource === "mock") {
      networkLiveBoards.value = liveBoardRows;
      liveBoardUpdatedAt.value = new Date().toISOString();
      syncSelectedTrain();
      return;
    }

    await refreshLiveBoards();
  }

  async function refreshLiveBoards(): Promise<void> {
    if (appConfig.mrtLiveBoardSource === "mock") {
      networkLiveBoards.value = liveBoardRows;
      liveBoardUpdatedAt.value = new Date().toISOString();
      syncSelectedTrain();
      return;
    }

    liveBoardLoading.value = true;
    liveBoardError.value = undefined;
    try {
      const payload = await fetchTdxLiveBoard(
        undefined,
        appConfig.tdxProxyUrl,
      );
      networkLiveBoards.value = payload.rows;
      liveBoardUpdatedAt.value = payload.updatedAt;
      syncSelectedTrain();
    } catch (error) {
      liveBoardError.value =
        error instanceof Error ? error.message : "Unable to load TDX LiveBoard rows.";
      networkLiveBoards.value = [];
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

    if (!networkLiveBoards.value.some((row) => row.id === selectedTrainId.value)) {
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
    networkLiveBoards,
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
