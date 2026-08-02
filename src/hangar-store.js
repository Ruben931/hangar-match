/**
 * Hangar perso — IDs vaisseaux en localStorage (pas de compte).
 */

const KEY = "hm-hangar";

export function getHangarIds() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(String).filter(Boolean))];
  } catch {
    return [];
  }
}

export function setHangarIds(ids) {
  const clean = [...new Set((ids || []).map(String).filter(Boolean))];
  localStorage.setItem(KEY, JSON.stringify(clean));
  return clean;
}

export function hasInHangar(id) {
  return getHangarIds().includes(String(id));
}

export function addToHangar(id) {
  const ids = getHangarIds();
  const sid = String(id);
  if (!ids.includes(sid)) ids.push(sid);
  return setHangarIds(ids);
}

export function removeFromHangar(id) {
  const sid = String(id);
  return setHangarIds(getHangarIds().filter((x) => x !== sid));
}

export function toggleHangar(id) {
  if (hasInHangar(id)) return removeFromHangar(id);
  return addToHangar(id);
}

export function hangarShips(allShips) {
  const set = new Set(getHangarIds());
  return (allShips || []).filter((s) => set.has(String(s.id)));
}

export function hangarCompareUrl() {
  const ids = getHangarIds();
  if (!ids.length) return "/#finder-form";
  return `/?ids=${encodeURIComponent(ids.join(","))}`;
}
