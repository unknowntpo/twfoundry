import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchTdxLiveBoard, fetchTdxLiveBoardTimeline } from "@/features/mrt/api/tdx-liveboard";
import {
  findStationById,
  liveBoardRows,
  liveBoardSnapshots,
  mrtLines,
} from "@/features/mrt/data/mrt-fixtures";
import { defaultVisibleOverlayIds } from "@/features/mrt/map/overlay-registry";
import type { LiveBoardEntry, LiveBoardSnapshot, MrtLineId } from "@/features/mrt/types";
import { appConfig } from "@/shared/config/env";

export const supportedLiveRefreshIntervalsMs = [5000, 20000, 30000, 60000] as const;
export type TimelineMode = "live" | "paused";

const MAX_TIMELINE_SNAPSHOTS = 240;

export const useMrtDashboardStore = defineStore("mrt-dashboard", () => {
  const selectedStationId = ref<string | undefined>();
  const selectedTrainId = ref<string | undefined>();
  const networkLiveBoards = ref<LiveBoardEntry[]>([]);
  const liveBoardError = ref<string | undefined>();
  const liveBoardLoading = ref(false);
  const liveBoardUpdatedAt = ref<string | undefined>();
  const visibleLineIds = ref<MrtLineId[]>(mrtLines.map((line) => line.id));
  const visibleOverlayIds = ref(defaultVisibleOverlayIds());
  const timelineMode = ref<TimelineMode>("live");
  const liveRefreshIntervalMs = ref<(typeof supportedLiveRefreshIntervalsMs)[number]>(30000);
  const timelineSnapshots = ref<LiveBoardSnapshot[]>([]);
  const timelineCursorIndex = ref(0);

  const selectedStation = computed(() => {
    return selectedStationId.value ? findStationById(selectedStationId.value) : undefined;
  });
  const displayedSnapshot = computed<LiveBoardSnapshot | undefined>(() => {
    if (timelineSnapshots.value.length > 0) {
      const boundedIndex = Math.min(
        Math.max(timelineCursorIndex.value, 0),
        timelineSnapshots.value.length - 1,
      );
      return timelineSnapshots.value[boundedIndex];
    }

    if (liveBoardUpdatedAt.value) {
      return {
        updatedAt: liveBoardUpdatedAt.value,
        rows: networkLiveBoards.value,
      };
    }

    return undefined;
  });
  const displayedLiveBoards = computed(() => displayedSnapshot.value?.rows ?? []);
  const displayedUpdatedAt = computed(() => displayedSnapshot.value?.updatedAt);
  const selectedLiveBoards = computed(() => {
    if (!selectedStationId.value) {
      return [];
    }
    return displayedLiveBoards.value.filter((row) => row.stationId === selectedStationId.value);
  });

  function replaceTimelineSnapshots(snapshots: LiveBoardSnapshot[]): void {
    timelineSnapshots.value = [...snapshots]
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .slice(-MAX_TIMELINE_SNAPSHOTS);
    timelineCursorIndex.value =
      timelineSnapshots.value.length === 0 ? 0 : timelineSnapshots.value.length - 1;
  }

  function appendTimelineSnapshot(snapshot: LiveBoardSnapshot): void {
    const next = timelineSnapshots.value.filter((item) => item.updatedAt !== snapshot.updatedAt);
    next.push(snapshot);
    replaceTimelineSnapshots(next);
    if (timelineMode.value === "live") {
      goToLatestTimeline();
    }
  }

  function goToLatestTimeline(): void {
    if (timelineSnapshots.value.length === 0) {
      timelineCursorIndex.value = 0;
    } else {
      timelineCursorIndex.value = timelineSnapshots.value.length - 1;
    }
    syncSelectedTrain();
  }

  function syncSelectedStationFromLiveRows(rows: LiveBoardEntry[]): void {
    if (selectedStationId.value) {
      return;
    }

    const firstKnownStationId = rows.find((row) => findStationById(row.stationId))?.stationId;
    if (firstKnownStationId) {
      selectedStationId.value = firstKnownStationId;
    }
  }

  function seedMockTimeline(): void {
    replaceTimelineSnapshots(liveBoardSnapshots);
    const latest = liveBoardSnapshots[liveBoardSnapshots.length - 1];
    networkLiveBoards.value = latest?.rows ?? liveBoardRows;
    liveBoardUpdatedAt.value = latest?.updatedAt ?? new Date().toISOString();
    goToLatestTimeline();
  }

  async function selectStation(stationId: string): Promise<void> {
    const station = findStationById(stationId);
    selectedStationId.value = station?.id;
    liveBoardError.value = undefined;

    if (!station) {
      selectedTrainId.value = undefined;
      return;
    }

    if (appConfig.mrtLiveBoardSource === "mock") {
      seedMockTimeline();
      syncSelectedTrain();
      return;
    }

    await loadTimelineSnapshots();
    await refreshLiveBoards();
  }

  async function refreshLiveBoards(): Promise<void> {
    if (appConfig.mrtLiveBoardSource === "mock") {
      seedMockTimeline();
      syncSelectedTrain();
      return;
    }

    liveBoardLoading.value = true;
    liveBoardError.value = undefined;
    try {
      const payload = await fetchTdxLiveBoard(undefined, appConfig.tdxProxyUrl);
      networkLiveBoards.value = payload.rows;
      liveBoardUpdatedAt.value = payload.updatedAt;
      syncSelectedStationFromLiveRows(payload.rows);
      appendTimelineSnapshot({
        updatedAt: payload.updatedAt,
        rows: payload.rows,
      });
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

  async function loadTimelineSnapshots(): Promise<void> {
    if (appConfig.mrtLiveBoardSource === "mock") {
      seedMockTimeline();
      return;
    }

    try {
      const payload = await fetchTdxLiveBoardTimeline(appConfig.tdxProxyUrl);
      replaceTimelineSnapshots(payload.snapshots);
      if (liveBoardUpdatedAt.value && networkLiveBoards.value.length > 0) {
        appendTimelineSnapshot({
          updatedAt: liveBoardUpdatedAt.value,
          rows: networkLiveBoards.value,
        });
      } else {
        syncSelectedTrain();
      }
    } catch (error) {
      liveBoardError.value =
        error instanceof Error ? error.message : "Unable to load TDX timeline snapshots.";
    }
  }

  function selectTrain(trainId: string | undefined): void {
    selectedTrainId.value = trainId;
  }

  function syncSelectedTrain(): void {
    if (!selectedTrainId.value) {
      return;
    }

    if (!displayedLiveBoards.value.some((row) => row.id === selectedTrainId.value)) {
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
    if (mode === "live") {
      goToLatestTimeline();
    }
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

  function scrubTimeline(index: number): void {
    if (timelineSnapshots.value.length === 0) {
      return;
    }

    timelineMode.value = "paused";
    timelineCursorIndex.value = Math.min(Math.max(Math.round(index), 0), timelineSnapshots.value.length - 1);
    syncSelectedTrain();
  }

  function stepTimeline(delta: number): void {
    scrubTimeline(timelineCursorIndex.value + delta);
  }

  if (appConfig.mrtLiveBoardSource === "mock") {
    seedMockTimeline();
  }

  return {
    selectedStationId,
    selectedTrainId,
    selectedStation,
    networkLiveBoards,
    displayedLiveBoards,
    selectedLiveBoards,
    displayedUpdatedAt,
    displayedSnapshot,
    timelineSnapshots,
    timelineCursorIndex,
    liveBoardError,
    liveBoardLoading,
    liveBoardUpdatedAt,
    visibleLineIds,
    visibleOverlayIds,
    timelineMode,
    liveRefreshIntervalMs,
    refreshLiveBoards,
    loadTimelineSnapshots,
    selectStation,
    toggleLine,
    toggleOverlay,
    setTimelineMode,
    setLiveRefreshIntervalMs,
    selectTrain,
    scrubTimeline,
    stepTimeline,
    goToLatestTimeline,
  };
});
