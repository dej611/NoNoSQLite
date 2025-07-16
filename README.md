# NoNoSQLite

A thin JavaScript layer to use the [Node.js SQLite module](https://nodejs.org/docs/latest/api/sqlite.html) as a NoSQL store.
Written during the [RomaJS](https://romajs.org/) July Meetup [Hack night](https://www.meetup.com/romajs/events/309155430/).

Developed by @lifeisfoo @fabio-sp @arnymore @alfiuzzo89.

> [!CAUTION]
> This is a proof of concept, use at your own risk.

## Usage

```js
import KVLite from "./kv.mjs";

const kv = new KVLite();
const result = kv.set(argv[2], argv[3]);
const retrieved = kv.get(argv[2]);
```

## License

MIT
