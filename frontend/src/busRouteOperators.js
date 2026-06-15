export function routeOperatorsFromContext(routeContext, { direction = null, routeUid = null } = {}) {
  const rows = Array.isArray(routeContext?.stopOfRoutes) ? routeContext.stopOfRoutes : [];
  const matchingRows = rows.filter((row) => {
    const matchesDirection = direction === null || Number(row.Direction) === Number(direction);
    const matchesRouteUid = !routeUid || row.RouteUID === routeUid;
    return matchesDirection && matchesRouteUid;
  });
  const sourceRows = matchingRows.length > 0 ? matchingRows : rows;
  return uniqueOperators(sourceRows.flatMap((row) => row.Operators ?? []));
}

export function formatRouteOperatorNames(operators, { fallback = '營運業者待補', max = 3 } = {}) {
  const names = uniqueOperators(operators).map((operator) => operator.name).filter(Boolean);
  if (names.length === 0) return fallback;
  if (names.length <= max) return names.join('、');
  return `${names.slice(0, max).join('、')} 等 ${names.length} 家`;
}

function uniqueOperators(operators) {
  const seen = new Set();
  const rows = [];

  for (const operator of operators) {
    const id = text(operator?.id) || text(operator?.OperatorID) || text(operator?.OperatorNo) || text(operator?.OperatorCode);
    const name = text(operator?.name) || localizedName(operator?.OperatorName) || text(operator?.OperatorCode) || id;
    const key = id || name;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id,
      name,
      code: text(operator?.OperatorCode),
      no: text(operator?.OperatorNo),
    });
  }

  return rows;
}

function localizedName(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return text(value.Zh_tw) || text(value.ZhTw) || text(value.En) || text(value.en);
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}
