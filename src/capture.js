'use strict';

/**
 * Decide what a re-run means for the creatures pending on a command.
 *
 * prevIds    - creature ids pending from the previous failing run (may be empty)
 * currentIds - creature ids seen in this run (empty when the run succeeded)
 *
 * outcome:
 *   wild     - nothing was pending; current bugs become the new targets
 *   captured - run is clean; every pending creature is caught
 *   partial  - some pending bugs are gone and nothing new appeared; those are caught
 *   still    - exactly the same bugs; nothing changes
 *   failed   - a bug that was not pending appeared; pending creatures escape
 */
function resolve(prevIds, currentIds) {
  const prev = new Set(prevIds);
  const cur = new Set(currentIds);
  if (prev.size === 0) {
    return { outcome: 'wild', captured: [], escaped: [], pending: [...cur] };
  }
  if (cur.size === 0) {
    return { outcome: 'captured', captured: [...prev], escaped: [], pending: [] };
  }
  const added = [...cur].filter((id) => !prev.has(id));
  if (added.length > 0) {
    return { outcome: 'failed', captured: [], escaped: [...prev], pending: [...cur] };
  }
  const gone = [...prev].filter((id) => !cur.has(id));
  if (gone.length > 0) {
    return { outcome: 'partial', captured: gone, escaped: [], pending: [...cur] };
  }
  return { outcome: 'still', captured: [], escaped: [], pending: [...cur] };
}

module.exports = { resolve };
