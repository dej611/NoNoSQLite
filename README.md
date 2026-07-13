# NoNoSQLite

A thin JavaScript layer to use the [Node.js SQLite module](https://nodejs.org/docs/latest/api/sqlite.html) as a NoSQL store.
Written during the [RomaJS](https://romajs.org/) July Meetup [Hack night](https://www.meetup.com/romajs/events/309155430/).

Developed by @lifeisfoo @fabio-sp @arnymore @alfiuzzo89.

> [!CAUTION]
> This is a proof of concept, use at your own risk.

## Usage

```js
import { openKv } from "./src/kv.mjs";

const kv = openKv();
kv.set(argv[2], argv[3]);
const retrieved = kv.get(argv[2]);
```

## Examples

A runnable example suite covering every public method, each `watch` selector
form, the v8 value contract, and several end-to-end use cases (TTL cache,
session store, work queue, audit log, …) lives in [examples/](examples/).
See [EXAMPLES.md](EXAMPLES.md) for an index, or run them all with:

```sh
npm run examples
```

## Versioning

This is pre-1.0 and the version number means it: `0.x` reflects real,
accumulated progress (CI, coverage, docs, bug fixes — see
[CHANGELOG.md](CHANGELOG.md)), not API stability. `1.0.0` is intentionally
being held back until a couple of open design questions are resolved: whether
`get()`/`getMany()` need a `versionstamp` to distinguish an absent key from a
stored `null`, and whether atomic/compare-and-set operations belong in the
core API (see [SPEC-DECISIONS.md](SPEC-DECISIONS.md), items N4 and N6) —
either could still change the public API shape.

## License

MIT
