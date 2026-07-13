# Examples

Each example is a self-contained, runnable `.mjs` file under [examples/](examples/).
They use `openKv()` with no arguments (in-memory, no disk side effect) so running
them leaves no on-disk state. To run them all in one shot:

```sh
npm run examples
```

Or individually: `node examples/01-basics.mjs`.

The reference API documentation lives in [kv.md](kv.md). This file is a
teach-by-example index — pick the scenario closest to what you want to do.

---

## Getting started

### 1. Basics — set / get / delete / clear / close

The first 30 seconds of the API: write a value, read it back, remove it,
clear the store, close the connection.

→ [examples/01-basics.mjs](examples/01-basics.mjs)

```js
const kv = openKv();
kv.set("greeting", "hello");
console.log(kv.get("greeting")); // { key: ['greeting'], value: 'hello' }
kv.delete("greeting");
kv.close();
```

### 2. Composite keys

Keys are tuples of mixed primitive segments (`string | number | bigint | boolean`).
Each segment preserves its type on the round-trip — `[5]` and `['5']` are
different keys, `[42n]` survives as a `BigInt`. Composite keys sort in a fixed
order (`string < number < bigint < boolean`), so range and prefix queries behave
predictably even across mixed segment types.

→ [examples/02-composite-keys.mjs](examples/02-composite-keys.mjs)

```js
kv.set(["order", 2024n, "pending"], { total: 99 });
kv.get(["user", 42, true]); // strongly-typed lookup
```

---

## Querying

### 3. getMany — order-preserving multi-fetch

One DB round-trip for N keys. Output preserves input order; missing keys
return `null`; duplicates pass through.

→ [examples/03-getMany.mjs](examples/03-getMany.mjs)

```js
kv.getMany([["user", 1], ["user", 99]]);
// [{ key: ['user', 1], value: 'alice' }, { key: ['user', 99], value: null }]
```

### 4. keys() — hierarchical prefix scan

Iterate strict descendants of a prefix. Optional `start`/`end` narrow to a
sub-range within the prefix. An empty prefix (`{ prefix: [] }`) scans every
key in the store — see example 7 for why that's the only "list everything"
recipe.

→ [examples/04-keys-prefix.mjs](examples/04-keys-prefix.mjs)

```js
for (const { key } of kv.keys({ prefix: ["user", 1, "sessions"] })) {
  // ['user', 1, 'sessions', 's1'], ...
}
```

### 5. keys() — pure range query

Inclusive `{ start, end }` for non-hierarchical layouts. Numbers sort
numerically (not lexicographically), and type-tagged encoding means numeric
and string segments never collide.

→ [examples/05-keys-range.mjs](examples/05-keys-range.mjs)

```js
for (const { key } of kv.keys({ start: ["b"], end: ["d"] })) {
  // ['b'], ['c'], ['d']
}
```

---

## Values & isolation

### 6. Rich values — what round-trips

Values use Node's v8 structured-clone codec. Lossless: `Date`, `BigInt`,
`Map`, `Set`, `RegExp`, typed arrays, `undefined`, circular references.
Not preserved: functions, class identity.

→ [examples/06-rich-values.mjs](examples/06-rich-values.mjs)

```js
const a = { name: "self-ref" };
a.self = a;
kv.set(["cyc"], a);
kv.get(["cyc"]).value.self === kv.get(["cyc"]).value; // true
```

### 7. Tenancy via composite keys — multiple logical stores in one file

There's no `namespace` option (a bare SQL-identifier option was judged too
much surface for what it buys). Instead, prefix every key with a tenant
segment — `{ prefix: [tenant, ...] }` scopes every operation naturally, using
key space the library already supports well.

→ [examples/07-tenancy.mjs](examples/07-tenancy.mjs)

```js
const users = tenantStore("users"); // wraps kv.*(["users", ...key])
const cache = tenantStore("cache"); // wraps kv.*(["cache", ...key])
// users.get(42) and cache.get(42) are independent
```

---

## Pub/sub & watching

### 8. Watch a single key

`kv.watch({ key })` reacts to one specific key. Events are a discriminated
union — `{type:'set'|'delete'|'clear', ...}`.

→ [examples/08-watch-key.mjs](examples/08-watch-key.mjs)

```js
const stream = kv.watch({ key: ["settings"] });
stream.on("data", (e) => console.log(e));
// { type: 'set', key: ['settings'], value: {...} }
```

### 9. Watch a prefix with an event filter

Watch any key under a hierarchy; optionally filter to just `set` (or any
subset of `'set' | 'delete' | 'clear'`).

→ [examples/09-watch-prefix.mjs](examples/09-watch-prefix.mjs)

```js
kv.watch({ prefix: ["inbox"], events: ["set"] });
```

### 10. Topic pub/sub

Topics are an in-process pub/sub plane that never touches the DB.
Watchers receive the published payload directly.

→ [examples/10-publish-topic.mjs](examples/10-publish-topic.mjs)

```js
kv.watch({ topic: "login" }).on("data", (p) => console.log(p));
kv.publish("login", { user: "alice" });
```

### 11. Backpressure (lag)

When a watcher's buffer fills past `highWaterMark`, intervening events are
dropped and a single `{type:'lag', dropped}` event is delivered when space
frees. Slow watchers don't block publishers.

→ [examples/11-watch-lag.mjs](examples/11-watch-lag.mjs)

```js
const sub = kv.watch({ prefix: ["x"] }, { highWaterMark: 4 });
// fast publisher + slow consumer → eventually a {type:'lag', dropped: N}
```

---

## Use cases

### 12. TTL cache on top of KV

The KV store has no TTL primitive; layer it by storing `{ value, expiresAt }`
envelopes and providing a sweep that uses `keys({prefix})` to evict.

→ [examples/12-cache-with-ttl.mjs](examples/12-cache-with-ttl.mjs)

### 13. Session store

Full lifecycle: create on login, refresh on activity, delete on logout,
audit via `watch({prefix: ['session']})`. Combines `set`, `get`, `delete`,
`watch`, and `publish`.

→ [examples/13-session-store.mjs](examples/13-session-store.mjs)

### 14. Work queue

Multi-producer / single-consumer. Producers `set` tasks under a queue
prefix and `publish` a wakeup. Workers `watch` the topic and claim tasks
by reading + deleting them.

→ [examples/14-work-queue.mjs](examples/14-work-queue.mjs)

### 15. Reactive audit log

A `watch({prefix: ['data']})` writes append-only audit entries under a
different prefix. Demonstrates that watchers can mutate the store without
recursing infinitely (different prefix → no self-trigger).

→ [examples/15-audit-log.mjs](examples/15-audit-log.mjs)

---

## Errors & limits

### 16. Error paths

A reference for the runtime errors this module produces: closed DB,
malformed selectors, invalid key segments (empty string, `NaN`, oversized
bigint), key byte-limit, `publish` topic validation. Every error is a plain
`Error`/`TypeError`/`RangeError` with a stable `.code` — branch on that, not
on `.message` or a module-specific class. Also documents what the v8 codec
made permissive (`BigInt`, `undefined` values now round-trip cleanly).

→ [examples/16-error-paths.mjs](examples/16-error-paths.mjs)
