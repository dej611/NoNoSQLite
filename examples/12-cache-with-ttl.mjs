#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 12-cache-with-ttl — TTL cache built on top of the primitive store.
// The KV store has no TTL primitive; we layer it by storing
// { value, expiresAt } envelopes and providing a `cleanup()` sweep that uses
// keys({prefix}) + getMany to evict expired entries in batch.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

const NS = "cache";
const now = () => Date.now();

function put(name, value, ttlMs) {
	kv.set([NS, name], { value, expiresAt: now() + ttlMs });
}

function fetch(name) {
	const { value: env } = kv.get([NS, name]);
	if (!env) return null;
	if (env.expiresAt <= now()) {
		kv.delete([NS, name]);
		return null;
	}
	return env.value;
}

function cleanup() {
	const expired = [];
	for (const { key } of kv.keys({ prefix: [NS] })) {
		const { value: env } = kv.get(key);
		if (env && env.expiresAt <= now()) expired.push(key);
	}
	for (const k of expired) kv.delete(k);
	return expired.length;
}

put("hot",   "fresh",  60_000);
put("stale", "old",    1);          // 1 ms TTL → essentially expired

await new Promise((r) => setTimeout(r, 5));

console.log(fetch("hot"));          // ⇒ fresh
console.log(fetch("stale"));        // ⇒ null   (expired, evicted on access)
put("stale-2", "old",  1);
await new Promise((r) => setTimeout(r, 5));

console.log(cleanup());             // ⇒ 1   (the sweep evicts stale-2)

kv.close();
