// Compile-time contract check for kv.d.ts — run via `npm run typecheck`.
// Not a runtime test: exercises the public API's *types* against the shapes
// the implementation actually produces, so a type that's wider than reality
// (e.g. a return type admitting a variant the implementation never returns)
// is caught by tsc instead of silently compiling.
import {
	type EntryValue,
	type KeyEvent,
	type KeySegment,
	type KeySelector,
	KVStore,
	openKv,
	type WatchSelector,
} from "./kv.js";

const kv: KVStore = openKv();
const kvWithPath = openKv({ path: "example.sqlite" });

kv.set("a", 1);
kv.set(["a", 1, 2n, true], { nested: true });

const entry: EntryValue<number> = kv.get("a");
// A returned key is always the normalized array form — never a bare string.
const _entryKey: KeySegment[] = entry.key;

const many: EntryValue<unknown>[] = kv.getMany([["a"], ["b"]]);
void many;

const rangeSelector: KeySelector = { start: ["a"], end: ["b"] };
const prefixSelector: KeySelector = { prefix: [] };
for (const { key } of kv.keys(rangeSelector)) {
	const _k: KeySegment[] = key;
}
for (const { key } of kv.keys(prefixSelector)) {
	const _k: KeySegment[] = key;
}

kv.delete("a");
kv.clear();

const watchSelector: WatchSelector = { key: "a", events: ["set", "delete"] };
const sub = kv.watch(watchSelector);
for await (const event of sub) {
	const e: KeyEvent = event;
	if (e.type === "set") {
		const _k: KeySegment[] = e.key;
	}
}

const topicSub = kv.watch({ topic: "example" });
for await (const payload of topicSub) {
	void payload;
	break;
}

kv.publish("topic", { any: "payload" });

kv.close();
kvWithPath.close();
