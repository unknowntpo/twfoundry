export const OPERATIONS_LAYER_IDS = {
  BUS_VEHICLES: 'bus_vehicles',
  MRT_LIVEBOARD: 'mrt_liveboard',
  TRANSIT_SIGNALS: 'transit_signals',
};

export const operationsLayerRegistry = [
  {
    id: OPERATIONS_LAYER_IDS.BUS_VEHICLES,
    labelKey: 'layers.busVehicles.label',
    shortLabelKey: 'layers.busVehicles.short',
    descriptionKey: 'layers.busVehicles.description',
    status: 'active',
    projectionType: 'vehicle_position_projection',
    primaryFilter: {
      id: 'route',
      labelKey: 'filters.busRoute',
      allLabelKey: 'filters.allRoutes',
    },
    timelineAware: true,
    sourceIds: ['tdx.bus.vehicle_positions'],
  },
  {
    id: OPERATIONS_LAYER_IDS.MRT_LIVEBOARD,
    labelKey: 'layers.mrtLiveboard.label',
    shortLabelKey: 'layers.mrtLiveboard.short',
    descriptionKey: 'layers.mrtLiveboard.description',
    status: 'planned',
    projectionType: 'mrt_liveboard_projection',
    primaryFilter: {
      id: 'line',
      labelKey: 'filters.mrtLine',
      allLabelKey: 'filters.allMrtLines',
    },
    timelineAware: true,
    sourceIds: ['tdx.mrt.liveboard'],
  },
  {
    id: OPERATIONS_LAYER_IDS.TRANSIT_SIGNALS,
    labelKey: 'layers.transitSignals.label',
    shortLabelKey: 'layers.transitSignals.short',
    descriptionKey: 'layers.transitSignals.description',
    status: 'planned',
    projectionType: 'transit_signal_projection',
    primaryFilter: {
      id: 'signalType',
      labelKey: 'filters.signalType',
      allLabelKey: 'filters.allSignalTypes',
    },
    timelineAware: true,
    sourceIds: ['twfoundry.transit.signals'],
  },
];

export function getOperationsLayer(layerId) {
  return operationsLayerRegistry.find((layer) => layer.id === layerId) ?? operationsLayerRegistry[0];
}
