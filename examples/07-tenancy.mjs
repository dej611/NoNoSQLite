#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 07-tenancy — isolating multiple "tenants" in a single store via composite
// keys, instead of a SQL-identifier `namespace` option (which this library
// deliberately doesn't expose — see SPEC-DECISIONS.md Row 3). Prefix every
// key with a tenant segment and every operation — get/set/delete/keys/watch
// — naturally scopes to that tenant via `{ prefix: [tenant, ...] }`.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

function tenantStore(tenant) {
	return {
		get: (key) => kv.get([tenant, ...normalize(key)]),
		set: (key, value) => kv.set([tenant, ...normalize(key)], value),
		delete: (key) => kv.delete([tenant, ...normalize(key)]),
		keys: () => {
			const out = [];
			for (const { key } of kv.keys({ prefix: [tenant] })) {
				out.push(key.slice(1)); // drop the tenant segment for the caller
			}
			return out;
		},
	};
}

function normalize(key) {
	return Array.isArray(key) ? key : [key];
}

const users = tenantStore("users");
const cache = tenantStore("cache");

users.set(42, { name: "alice" });
cache.set(42, { etag: "abc-123" });

console.log(users.get(42)); // ⇒ { key: ['users', 42], value: { name: 'alice' } }
console.log(cache.get(42)); // ⇒ { key: ['cache', 42], value: { etag: 'abc-123' } }

// Same logical key (42), different tenant prefix → no collision.
users.delete(42);
console.log(users.get(42)); // ⇒ { key: ['users', 42], value: null }
console.log(cache.get(42)); // ⇒ { key: ['cache', 42], value: { etag: 'abc-123' } }   (untouched)

console.log(users.keys()); // ⇒ [] — users tenant is now empty
console.log(cache.keys()); // ⇒ [[42]]

kv.close();
