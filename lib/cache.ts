const store = new Map<string, { t:number; v:any }>();
export function cacheGet<T>(k:string, maxAgeMs:number): T | null {
  const hit = store.get(k);
  if (!hit) return null;
  if (Date.now() - hit.t > maxAgeMs) { store.delete(k); return null; }
  return hit.v as T;
}
export function cacheSet<T>(k:string, v:T){ store.set(k, { t: Date.now(), v }); }
