#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 11-watch-lag — backpressure contract for slow watchers.
// If a watcher's buffer fills past `highWaterMark`, intervening events are
// DROPPED and a single `{type:'lag', dropped}` event is delivered when the
// buffer drains. Slow watchers do not block publishers.
import { openKv } from "../src/kv.mjs";

const kv = openKv();
const stream = kv.watch({ prefix: ["x"] }, { highWaterMark: 4 });

// Pause so the burst overflows the buffer instead of streaming through.
stream.pause();
for (let i = 0; i < 50; i++) kv.set(["x", i], i);

// Resume and drain the 4 buffered events.
const received = [];
stream.on("data", (e) => received.push(e));
stream.resume();
await new Promise((r) => setImmediate(r));
console.log(received.length);                         // ⇒ 4

// Buffer is empty now. The next emit is preceded by a single lag event.
kv.set(["x", 999], 999);
await new Promise((r) => setImmediate(r));

console.log(received.slice(4));
// ⇒ [
//     { type: 'lag', dropped: 46 },
//     { type: 'set', key: ['x', 999], value: 999 },
//   ]

stream.destroy();
kv.close();
