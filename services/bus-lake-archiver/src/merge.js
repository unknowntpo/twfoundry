/**
 * Merge/upsert logic for bus vehicle observations.
 * 
 * Merge key: (slot_key, vehicle_id, route_uid, direction)
 * On collision: keep row with latest update_time; if equal, latest ingested_at
 */

export function getMergeKey(row) {
  const { slot_key, vehicle_id, route_uid, direction } = row;
  if (!slot_key || !vehicle_id || !route_uid || direction === undefined) {
    throw new Error(`Invalid row for merge key: missing required fields. Row: ${JSON.stringify(row)}`);
  }
  return `${slot_key}|${vehicle_id}|${route_uid}|${direction}`;
}

export function compareRows(existing, incoming) {
  /**
   * Returns:
   *  -1: keep existing
   *   0: equal (keep either)
   *   1: keep incoming
   */
  
  // Compare update_time (primary)
  const existingUpdateTime = new Date(existing.update_time).getTime();
  const incomingUpdateTime = new Date(incoming.update_time).getTime();
  
  if (existingUpdateTime !== incomingUpdateTime) {
    return incomingUpdateTime > existingUpdateTime ? 1 : -1;
  }
  
  // If update_time equal, compare ingested_at (secondary)
  const existingIngestedAt = new Date(existing.ingested_at).getTime();
  const incomingIngestedAt = new Date(incoming.ingested_at).getTime();
  
  return incomingIngestedAt > existingIngestedAt ? 1 : (incomingIngestedAt === existingIngestedAt ? 0 : -1);
}

export class MergeTable {
  constructor() {
    this.table = new Map(); // key -> row
    this.mergeStats = {
      inserts: 0,
      updates: 0,
      dedups: 0,
    };
  }
  
  upsert(row) {
    /**
     * Insert or update row. Returns true if row was updated/inserted,
     * false if it was deduped (existing was kept).
     */
    const key = getMergeKey(row);
    const existing = this.table.get(key);
    
    if (!existing) {
      this.table.set(key, row);
      this.mergeStats.inserts++;
      return true;
    }
    
    const cmp = compareRows(existing, row);
    if (cmp === 1) {
      // Incoming is newer
      this.table.set(key, row);
      this.mergeStats.updates++;
      return true;
    } else {
      // Keep existing
      this.mergeStats.dedups++;
      return false;
    }
  }
  
  getAllRows() {
    return Array.from(this.table.values());
  }
  
  getRowsByDate(serviceDate) {
    /**
     * Filter rows by service_date (YYYY-MM-DD format)
     */
    return this.getAllRows().filter(row => row.service_date === serviceDate);
  }
  
  getStats() {
    return {
      ...this.mergeStats,
      totalRows: this.table.size,
    };
  }
  
  clear() {
    this.table.clear();
    this.mergeStats = { inserts: 0, updates: 0, dedups: 0 };
  }
}
