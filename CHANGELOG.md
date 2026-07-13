# Changelog

All notable changes to this project are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). No version
has been tagged/published yet — everything below is accumulated history
under `0.1.0`, tracked here rather than left implicit in `git log`.

See [SPEC-DECISIONS.md](SPEC-DECISIONS.md) for the *why* behind API
decisions, and [NODE-CORE-READINESS.md](NODE-CORE-READINESS.md) for current
readiness status and the remediation roadmap.

## [Unreleased]

### Added

- `openKv()` / `KVStore`: `get`, `getMany`, `set`, `delete`, `clear`, `keys`
  (range & prefix selectors), `watch`, `publish`, `close`.
- Order-preserving composite key encoding (`string < number < bigint <
  boolean`, numerically — not lexicographically — correct within a type).
- Rich value codec via `v8.serialize`/`deserialize` (Date, Map, Set, BigInt,
  circular references, etc.).
- `watch()`/`publish()` pub-sub plane with per-watcher backpressure
  (`highWaterMark`, `lag` events).
- Full API reference (`kv.md`, written in Node core's `doc/api` format),
  hand-authored types (`kv.d.ts`) with a compile-time contract test
  (`kv.type-test.ts`), and a 16-file runnable example suite (`examples/`,
  indexed in `EXAMPLES.md`).
- CI (`.github/workflows/ci.yml`): Linux/macOS/Windows × Node
  22.13.0/22.x/24.x, running the full test/lint/typecheck/bundle gate plus an
  informational benchmark job.
- Coverage measurement and enforcement (`npm run test:coverage`;
  100% line/branch/function on `src/`).
- Benchmark suite (`bench/`) comparing `KVStore` against a hand-rolled
  `node:sqlite` KV table baseline.
- Governance docs: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- A cross-instance `watch()` scope regression test, plus documentation of the
  in-process-only `watch`/`publish` contract and the blocking-I/O and
  untrusted-database-file trust-boundary considerations (all in `kv.md`).

### Changed

- Error model: moved from an exported `KVError` base class + subclass
  hierarchy to plain `Error`/`TypeError`/`RangeError` instances carrying a
  stable `ERR_KVSTORE_*` `.code`, matching Node core's own convention
  (`fs`/`http`/`net`/`crypto` style) — no error classes are exported.
- `engines.node` corrected from `>=22.5` to `>=22.13.0`: `node:sqlite`
  actually requires the `--experimental-sqlite` flag before Node 22.13.0
  (confirmed against [nodejs/node#55890](https://github.com/nodejs/node/pull/55890)),
  so the previous floor was inaccurate for a consumer not passing that flag.
- `set()`'s watch-event value clone now uses `structuredClone()` instead of
  round-tripping through `v8.serialize`/`deserialize` (~2.5x faster for that
  path; only exercised when a watcher is attached).

### Fixed

- Numeric/bigint/negative key ordering, previously broken by decimal-string
  segment encoding (e.g. `[1,10,100]` instead of `[1,2,3,9,10,11,20,100]`).
- `{ prefix: [] }` (the documented full-scan recipe) previously threw instead
  of matching every key.
- Concurrent/interleaved `keys()` range or prefix iterators previously
  shared one prepared-statement cursor and could corrupt each other's
  results; each call now gets its own.
- `getMany`'s batch lookup previously used a `json_each`-based query that
  silently matched nothing against BLOB keys; replaced with a parameterized
  `IN (...)` query, chunked to stay under SQLite's variable limit.

## 0.1.0 — hack-night proof of concept

Initial implementation from the [RomaJS](https://romajs.org/) July Meetup
Hack Night, by @lifeisfoo @fabio-sp @arnymore @alfiuzzo89.
