# Contributing to NoNoSQLite

Thanks for your interest in contributing! This project is a thin key-value
layer over Node's built-in `node:sqlite` module, currently being prepared as
a potential `node:kvstore` core module proposal — see
[NODE-CORE-READINESS.md](NODE-CORE-READINESS.md) for the current state and
roadmap, and [SPEC-DECISIONS.md](SPEC-DECISIONS.md) for the rationale behind
existing API decisions.

## Getting started

Requires Node `>=22.13.0` (an `.nvmrc` is provided — `nvm use`).

```sh
git clone https://github.com/lifeisfoo/NoNoSQLite.git
cd NoNoSQLite
npm install
npm run test:all
```

`npm run test:all` runs the full gate: unit tests with coverage thresholds,
the bundled-build test, and the type check — the same thing CI runs on every
push (`.github/workflows/ci.yml`).

## Useful scripts

| Script | What it does |
|---|---|
| `npm test` | Run the unit test suite (`node --test`). |
| `npm run test:coverage` | Same, with coverage measured and enforced at 100%. |
| `npm run lint` / `npm run format` | Biome check / auto-format `src/`. |
| `npm run typecheck` | `tsc --noEmit` against `kv.d.ts` and `kv.type-test.ts`. |
| `npm run examples` | Run every file in `examples/` end to end. |
| `npm run bench` | Compare `KVStore` against a hand-rolled `node:sqlite` baseline. |
| `npm run bundle` / `npm run test:bundle` | Build and test the single-file `dist/kv.bundle.mjs`. |

## Before opening a PR

- Add or update tests for any behavior change — this project aims for 100%
  line/branch/function coverage on `src/`, enforced in CI.
- Run `npm run test:all` locally; it must pass on Node `>=22.13.0`.
- If you're changing the public API, update `kv.md` (the API reference,
  written in Node core's own `doc/api` format) and `kv.d.ts` together, and
  add a rationale entry to `SPEC-DECISIONS.md` if the change reverses or
  extends a previously "Decided" row.
- Keep error handling consistent with the existing convention: plain
  `Error`/`TypeError`/`RangeError` with a stable `ERR_KVSTORE_*` `.code`
  (see `src/errors.mjs`) — no new exported error classes.

## Commit style

Commit messages in this repo use [gitmoji](https://gitmoji.dev/) prefixes
(e.g. `:sparkles:` for a new feature, `:bug:` for a fix, `:white_check_mark:`
for tests, `:wrench:` for config). Match the existing `git log` style.

## Questions or design discussions

Open an issue on the upstream repo
([lifeisfoo/NoNoSQLite](https://github.com/lifeisfoo/NoNoSQLite)) — especially
for anything that would change the public API, since this project is trying
to keep its design decisions traceable (see `SPEC-DECISIONS.md`).
