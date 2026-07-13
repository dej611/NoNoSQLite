#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 14-work-queue — multi-producer / single-consumer queue.
// Producers `set(['queue', monotonicId], task)` and `publish('queue.new')`.
// A worker subscribed to the topic claims the next task by scanning the
// queue prefix and deleting the row. Pub/sub is the wake-up; the DB is
// the durable backlog.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

let nextId = 0;
function enqueue(task) {
	const id = ++nextId;
	kv.set(["queue", id], task);
	kv.publish("queue.new", id);
	return id;
}

function claimNext() {
	for (const { key } of kv.keys({ prefix: ["queue"] })) {
		const { value } = kv.get(key);
		if (kv.delete(key)) return { id: key[1], task: value };
	}
	return null;
}

const wakeups = kv.watch({ topic: "queue.new" });
const processed = [];

wakeups.on("data", () => {
	let item;
	while ((item = claimNext())) processed.push(item);
});

enqueue({ kind: "email",   to: "alice" });
enqueue({ kind: "webhook", url: "https://example.com" });
enqueue({ kind: "email",   to: "bob" });

await new Promise((r) => setImmediate(r));
wakeups.destroy();
kv.close();

console.log(processed.length);       // ⇒ 3
console.log(processed.map((p) => `${p.id}:${p.task.kind}`));
// ⇒ ['1:email', '2:webhook', '3:email']
