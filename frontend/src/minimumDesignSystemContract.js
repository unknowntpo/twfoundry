export const contractTokens = [
  {
    key: 'canvas',
    varName: '--bg',
    value: 'oklch(12% 0.02 250)',
    messageKey: 'ds.token.canvas',
  },
  {
    key: 'surface',
    varName: '--surface',
    value: 'oklch(20% 0.026 250)',
    messageKey: 'ds.token.surface',
  },
  {
    key: 'text',
    varName: '--fg',
    value: 'oklch(92% 0.018 230)',
    messageKey: 'ds.token.text',
  },
  {
    key: 'muted',
    varName: '--muted',
    value: 'oklch(68% 0.03 245)',
    messageKey: 'ds.token.muted',
  },
  {
    key: 'border',
    varName: '--border',
    value: 'oklch(34% 0.03 250)',
    messageKey: 'ds.token.border',
  },
  {
    key: 'vehicle',
    varName: '--vehicle',
    value: 'oklch(78% 0.145 205)',
    messageKey: 'ds.token.vehicle',
  },
  {
    key: 'selected',
    varName: '--selected',
    value: 'oklch(85% 0.145 85)',
    messageKey: 'ds.token.selected',
  },
  {
    key: 'poi',
    varName: '--poi',
    value: 'oklch(82% 0.04 245)',
    messageKey: 'ds.token.poi',
  },
  {
    key: 'warning',
    varName: '--warn',
    value: 'oklch(78% 0.12 75)',
    messageKey: 'ds.token.warning',
  },
];

export const colorFamilies = [
  {
    key: 'primary',
    titleKey: 'ds.color.primary.title',
    copyKey: 'ds.color.primary.copy',
    swatches: [
      { weight: '100', value: 'oklch(24% 0.045 215)', useKey: 'ds.weight.subtle' },
      { weight: '300', value: 'oklch(52% 0.095 210)', useKey: 'ds.weight.border' },
      { weight: '500', value: 'oklch(73% 0.14 205)', useKey: 'ds.weight.active' },
      { weight: '700', value: 'oklch(82% 0.16 200)', useKey: 'ds.weight.emphasis' },
    ],
  },
  {
    key: 'secondary',
    titleKey: 'ds.color.secondary.title',
    copyKey: 'ds.color.secondary.copy',
    swatches: [
      { weight: '100', value: 'oklch(24% 0.035 80)', useKey: 'ds.weight.subtle' },
      { weight: '300', value: 'oklch(58% 0.09 80)', useKey: 'ds.weight.border' },
      { weight: '500', value: 'oklch(85% 0.145 85)', useKey: 'ds.weight.active' },
      { weight: '700', value: 'oklch(89% 0.16 92)', useKey: 'ds.weight.emphasis' },
    ],
  },
  {
    key: 'neutral',
    titleKey: 'ds.color.neutral.title',
    copyKey: 'ds.color.neutral.copy',
    swatches: [
      { weight: '50', value: 'oklch(12% 0.02 250)', useKey: 'ds.weight.canvas' },
      { weight: '100', value: 'oklch(20% 0.026 250)', useKey: 'ds.weight.surface' },
      { weight: '300', value: 'oklch(34% 0.03 250)', useKey: 'ds.weight.border' },
      { weight: '900', value: 'oklch(92% 0.018 230)', useKey: 'ds.weight.text' },
    ],
  },
  {
    key: 'support',
    titleKey: 'ds.color.support.title',
    copyKey: 'ds.color.support.copy',
    swatches: [
      { weight: 'poi', value: 'oklch(82% 0.04 245)', useKey: 'ds.weight.poi' },
      { weight: 'warn', value: 'oklch(78% 0.12 75)', useKey: 'ds.weight.warn' },
      { weight: 'ok', value: 'oklch(72% 0.13 150)', useKey: 'ds.weight.ok' },
      { weight: 'danger', value: 'oklch(68% 0.16 30)', useKey: 'ds.weight.danger' },
    ],
  },
];

export const mapGrammar = [
  {
    key: 'vehicle',
    className: 'vehicle-dot',
    titleKey: 'ds.grammar.vehicle.title',
    copyKey: 'ds.grammar.vehicle.copy',
  },
  {
    key: 'selected',
    className: 'selected-dot',
    titleKey: 'ds.grammar.selected.title',
    copyKey: 'ds.grammar.selected.copy',
  },
  {
    key: 'transitPoi',
    className: 'poi-diamond transit',
    titleKey: 'ds.grammar.transit.title',
    copyKey: 'ds.grammar.transit.copy',
  },
  {
    key: 'generalPoi',
    className: 'poi-diamond general',
    titleKey: 'ds.grammar.general.title',
    copyKey: 'ds.grammar.general.copy',
  },
];

export const freshnessRules = [
  'ds.freshness.rule.trust',
  'ds.freshness.rule.aggregate',
  'ds.freshness.rule.selected',
  'ds.freshness.rule.replay',
];

export const contractSections = [
  {
    key: 'productJob',
    titleKey: 'ds.section.productJob.title',
    copyKey: 'ds.section.productJob.copy',
  },
  {
    key: 'firstScreen',
    titleKey: 'ds.section.firstScreen.title',
    copyKey: 'ds.section.firstScreen.copy',
  },
  {
    key: 'antiClone',
    titleKey: 'ds.section.antiClone.title',
    copyKey: 'ds.section.antiClone.copy',
  },
];

export const sourceRows = [
  {
    key: 'tdxBus',
    status: 'active',
    cadence: '5 min',
    titleKey: 'ds.source.bus.title',
    detailKey: 'ds.source.bus.detail',
  },
  {
    key: 'mapContext',
    status: 'provider',
    cadence: 'tiles',
    titleKey: 'ds.source.map.title',
    detailKey: 'ds.source.map.detail',
  },
  {
    key: 'youbike',
    status: 'planned',
    cadence: 'TBD',
    titleKey: 'ds.source.youbike.title',
    detailKey: 'ds.source.youbike.detail',
  },
];

export const breakpointRules = [
  {
    key: 'phone',
    range: '0-639px',
    titleKey: 'ds.breakpoint.phone.title',
    rules: [
      'ds.breakpoint.phone.nav',
      'ds.breakpoint.phone.content',
      'ds.breakpoint.phone.controls',
      'ds.breakpoint.phone.panels',
    ],
  },
  {
    key: 'tablet',
    range: '640-1023px',
    titleKey: 'ds.breakpoint.tablet.title',
    rules: [
      'ds.breakpoint.tablet.nav',
      'ds.breakpoint.tablet.content',
      'ds.breakpoint.tablet.controls',
      'ds.breakpoint.tablet.panels',
    ],
  },
  {
    key: 'desktop',
    range: '1024-1439px',
    titleKey: 'ds.breakpoint.desktop.title',
    rules: [
      'ds.breakpoint.desktop.nav',
      'ds.breakpoint.desktop.content',
      'ds.breakpoint.desktop.controls',
      'ds.breakpoint.desktop.panels',
    ],
  },
  {
    key: 'wide',
    range: '1440px+',
    titleKey: 'ds.breakpoint.wide.title',
    rules: [
      'ds.breakpoint.wide.nav',
      'ds.breakpoint.wide.content',
      'ds.breakpoint.wide.controls',
      'ds.breakpoint.wide.panels',
    ],
  },
];

export const implementationRules = [
  'ds.rule.mapFirst',
  'ds.rule.timeline',
  'ds.rule.inspector',
  'ds.rule.sources',
  'ds.rule.truth',
];
