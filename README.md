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

## License

MIT
