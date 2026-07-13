#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 15-audit-log — reactive audit trail. A watcher on `['data']` writes an
// append-only entry under `['audit', monotonicTs]` for every set/delete.
// Note: the auditor mutates the store INSIDE its own subscription, but it
// writes under a different prefix, so it cannot trigger itself recursively.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

let auditSeq = 0;
const watcher = kv.watch({ prefix: ["data"] });
watcher.on("data", (e) => {
	if (e.type === "lag" || e.type === "clear") return;
	const seq = ++auditSeq;
	kv.set(["audit", seq], {
		at: Date.now(),
		op: e.type,
		key: e.key,
		value: e.type === "set" ? e.value : undefined,
	});
});

kv.set(["data", "user", 1], { name: "alice" });
kv.set(["data", "user", 2], { name: "bob" });
kv.set(["data", "user", 1], { name: "alice", role: "admin" });
kv.delete(["data", "user", 2]);

await new Promise((r) => setImmediate(r));
watcher.destroy();

const trail = [];
for (const { key } of kv.keys({ prefix: ["audit"] })) {
	const { value } = kv.get(key);
	trail.push({ seq: key[1], op: value.op, key: value.key });
}
kv.close();

console.log(trail);
// ⇒ [
//     { seq: 1, op: 'set',    key: ['data', 'user', 1] },
//     { seq: 2, op: 'set',    key: ['data', 'user', 2] },
//     { seq: 3, op: 'set',    key: ['data', 'user', 1] },
//     { seq: 4, op: 'delete', key: ['data', 'user', 2] },
//   ]
