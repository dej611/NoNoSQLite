# SPEC-DECISIONS (archived)

> This file is now a historical record, not a live decision log. Every row
> below reached **Decided** and has been implemented; [kv.md](kv.md) is the
> current source of truth for the API, and [kv.d.ts](kv.d.ts) for types.
> Kept here as changelog context for the 1.0 release and for anyone tracing
> *why* a given API shape was chosen.

This reconciles the original spec/impl drift table (rows 1–13, from the first
review pass) with a second `/review-claudio` pass that found two additional
correctness bugs (N1, N2) and four further hardening items (N3–N6), all
resolved via a `/grill-me` session before implementation.

---

## Rows 1–13 (original drift table)

| Row | Topic | Decision | Status |
|---|---|---|---|
| 1 | Module identity | Named factory `openKv()` + exported `KVStore` class; no default export | **Decided & implemented** |
| 2 | `--experimental-kvstore` flag | Deferred to Phase B (Node core integration); dropped from kv.md, replaced with a Stability note | **Decided & implemented** |
| 3 | `namespace` option | Cut entirely; fixed internal table name (`kvstore_v1`); composite-key tenancy is the documented recipe (see `examples/07-tenancy.mjs`) | **Decided & implemented** |
| 4 | `path` / `memory` defaults | `memory` dropped; `openKv()` defaults to in-memory, `openKv({ path })` opts into persistence | **Decided & implemented** |
| 5 | `kv.keys()` no-arg | Selector stays required; `{ prefix: [] }` is the documented full-scan recipe (fixed for real — see N2 below) | **Decided & implemented** |
| 6 | `get`/`getMany`/`keys` phantom `options` | Removed from kv.md; signatures are `get(key)`, `getMany(keys)`, `keys(selector)` | **Decided & implemented** |
| 7 | `set()` return shape | Returns `undefined`, throws on error | **Decided & implemented** |
| 8 | `flush()` rename | Renamed to `clear()` (method + emitted event type) | **Decided & implemented** |
| 9 | Topic plane spec coverage | Fully specified in kv.md: scope, isolation, ordering, delivery, lifecycle | **Decided & implemented** |
| 10 | Backpressure / `lag` contract | Fully specified in kv.md; `highWaterMark < 1` now throws `KVSelectorError` | **Decided & implemented** |
| 11 | Value codec contract | v8 codec confirmed; stale `VALUE_NOT_SERIALIZABLE` string removed | **Decided & implemented** |
| 12 | Error model | `KVError` base + 5 subclasses (`KVClosedError`, `KVKeyError`, `KVKeysError`, `KVSelectorError`, `KVTopicError`), each with a stable `.code` | **Decided & implemented** |
| 13 | Watch overload typing | `watch()` overloads narrow to `Readable & AsyncIterable<KeyEvent<T>>` (key/keys/prefix) vs `Readable & AsyncIterable<unknown>` (topic) | **Decided & implemented** |

---

## N1–N6 (second review pass)

### N1 — Numeric/bigint/negative key ordering was broken · fixed

**Found:** segments were encoded as decimal strings (`n:2`, `n:10`), so
`kv.keys({ start:[1], end:[100] })` returned `[1, 10, 100]` instead of
`[1,2,3,9,10,11,20,100]` — confirmed empirically before any fix landed.
Range/prefix iteration over numeric, bigint, negative, and float segments
silently returned wrong results.

**Fixed:** an order-preserving binary tuple encoding, resolved point-by-point
via `/grill-me`:

* Key column is `BLOB` (memcmp comparison), not `TEXT`.
* Cross-type order: `string < number < bigint < boolean` (a deliberate
  choice, not aligned with Deno KV's ordering — see kv.md's "The `KeyValue`
  type").
* `number` and `bigint` are always distinct buckets — `[1]` and `[1n]` never
  collide, matching JS's own `1 !== 1n`.
* Numbers use a sign-flipped float64 encoding (standard trick: invert all
  bits if negative, set the sign bit if positive/zero). `NaN` is rejected as
  an invalid key segment; `±Infinity` are valid and land at the extremes;
  `-0` normalizes to `0`.
* Bigints use `[sign byte][order-corrected length byte][big-endian
  magnitude]`, capped at a 255-byte magnitude (`KV_BIGINT_TOO_LARGE` beyond
  that).

See `src/keys.mjs` (encode/decode) and `src/keys.test.mjs` /
`src/kv.test.mjs` (ordering regression tests, including the exact
`[1,2,3,9,10,11,20,100]` case).

### N2 — `{ prefix: [] }` couldn't scan the whole store · fixed

**Found:** Row 5 above already recommended `{ prefix: [] }` as the "scan
everything" recipe and claimed it worked — it didn't; it threw
`"keys array is empty"`.

**Fixed:** selector-prefix validation was split from key validation
(`encodePrefix`/`validatePrefixSegments` in `src/keys.mjs`), so an empty
array is valid in a `prefix` selector (meaning "match everything") while
`get`/`set`/`delete` still reject an empty key array. No new method was
added — this was a bug fix to make an already-settled recipe true.

### N3 — Shared prepared-statement iterators corrupted concurrent scans · fixed

**Found:** `range`/`prefix` shared one prepared statement's `.iterate()`
cursor; two interleaved `keys()` calls (or a partially-consumed iterator
held across calls) would corrupt each other.

**Fixed:** `range`/`prefix` now prepare a fresh statement per call
(`src/statements.mjs`), so every call owns an independent cursor. Rejected
alternative: documenting a "one active iterator at a time" restriction —
unenforceable and inconsistent with this pass's bar of no silently-wrong
behavior.

### N4 — `get()`/`getMany()` can't distinguish absent from stored `null` · documented, deferred

Both return `value: null` for either case. Consistent with the already-
settled Row 7 (`set()` returns `void` precisely to leave room for a future
`{ versionstamp }` return), this is left as a documented 1.0 limitation
(kv.md's `kv.get` section) rather than an expanded return shape now.

### N5 — Sync disk I/O blocks the event loop · acknowledged, mitigated

The API stays synchronous, matching `node:sqlite`'s `DatabaseSync` (an
explicit decision for this pass — no async rewrite). Mitigation: file-backed
stores always run with `PRAGMA journal_mode=WAL` and
`PRAGMA synchronous=NORMAL` (no opt-out), documented in kv.md's "Storage"
note including the `-wal`/`-shm` sidecar-file/backup caveat.

### N6 — Quality / perf / tests · fixed

* Whitespace-only string key segments (e.g. `" "`) are now valid — only the
  literal `""` is rejected (the old check, `key.trim() === ""`, was
  paternalism beyond what the encoding or SQL layer required).
* `getMany`'s `json_each`-based batch query was replaced with a
  parameterized `key IN (?, ?, ..., ?)` query — the `json_each` approach
  silently returned nothing under BLOB keys, since SQLite's type-affinity
  rules never treat a BLOB value as equal to a TEXT one (JSON has no binary
  type).
* Selector-prefix validation now computes the encoded prefix once and reuses
  it, instead of re-encoding per check.
* Test coverage added for all of the above, plus the exact numeric-ordering
  and `{ prefix: [] }` regressions that motivated N1/N2.
* Atomic/transactional ops (`setMany`/`atomic()`/CAS) remain a noted 1.x
  feature gap, not a 1.0 blocker.

---

## Post-1.0 addendum — Row 12 reversed for Node core alignment

Row 12 above ("Decided & implemented") settled on a `KVError` base class plus
five subclasses (`KVClosedError`, `KVKeyError`, `KVKeysError`,
`KVSelectorError`, `KVTopicError`), each with a stable `.code`. That shape is
good npm-package design, but not idiomatic Node core: `fs`/`http`/`net`/
`crypto` all throw plain `Error`/`TypeError`/`RangeError` with a `.code` from
the shared `ERR_*` convention, not a bespoke per-module exported class
hierarchy — `assert.AssertionError` is the exception, and only because it
carries extra structured fields (`actual`/`expected`/`operator`) `.code`
alone can't express, which this module's errors don't need.

Once this module was headed toward an actual `node:kvstore` core PR (not
just an npm package), the class hierarchy was dropped: every error is now a
plain `Error`/`TypeError`/`RangeError` carrying `.code` in the
`ERR_KVSTORE_*` namespace (mirroring per-subsystem prefixes like `ERR_TLS_*`/
`ERR_STREAM_*`). None of the `ERR_KVSTORE_*` classes are exported — `.code`
is the only public, stable discriminator now, matching kv.d.ts's
`KVStoreErrorCode` union. See `src/errors.mjs` and kv.md's "Errors" section
for the current shape.
