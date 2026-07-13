#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 08-watch-key — watch a single exact key and react to its lifecycle.
// Events are a discriminated union: { type:'set' | 'delete' | 'clear', ... }.
// `clear` always fires, even on a key-watcher, because it wipes everything.
import { openKv } from "../src/kv.mjs";

const kv = openKv();
const stream = kv.watch({ key: ["settings"] });

const received = [];
stream.on("data", (event) => received.push(event));

kv.set(["settings"], { theme: "dark" });
kv.set(["other"], "ignored");
kv.set(["settings"], { theme: "light" });
kv.delete(["settings"]);
kv.clear();

await new Promise((r) => setImmediate(r));
stream.destroy();
kv.close();

for (const e of received) console.log(e);
// ⇒ { type: 'set',    key: ['settings'], value: { theme: 'dark'  } }
// ⇒ { type: 'set',    key: ['settings'], value: { theme: 'light' } }
// ⇒ { type: 'delete', key: ['settings'] }
// ⇒ { type: 'clear' }
