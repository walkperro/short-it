type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<any>>();
const DEFAULT_TTL = Number(process.env.CACHE_TTL_SECONDS || 300); // 5m

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) { store.delete(key); return undefined; }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL) {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function cacheKey(parts: Record<string, string>) {
  return Object.entries(parts).sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`).join("&");
}
