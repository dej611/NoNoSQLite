#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 09-watch-prefix — watch any key under a hierarchical prefix.
// The optional `events` filter narrows to just `set` (or any subset of
// 'set' | 'delete' | 'clear'). Useful for projecting "new arrivals" only.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

// Only react to writes under ['inbox', userId, ...]; ignore deletes & flush.
const stream = kv.watch({ prefix: ["inbox"], events: ["set"] });

const arrivals = [];
stream.on("data", (event) => arrivals.push(event));

kv.set(["inbox", 1, "msg-1"], { from: "alice" });
kv.set(["inbox", 2, "msg-1"], { from: "bob"   });
kv.set(["other", "place"], "ignored — not under prefix");
kv.delete(["inbox", 1, "msg-1"]); // ignored — events: ['set'] excludes deletes

await new Promise((r) => setImmediate(r));
stream.destroy();
kv.close();

console.log(arrivals.length);                       // ⇒ 2
console.log(arrivals.map((e) => e.key));
// ⇒ [['inbox', 1, 'msg-1'], ['inbox', 2, 'msg-1']]
