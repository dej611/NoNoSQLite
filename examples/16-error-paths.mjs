#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 16-error-paths — what throws, why, and what doesn't.
// A reference for the runtime errors this module produces. Every error is a
// plain Error/TypeError/RangeError instance (never a bespoke class) with a
// stable `.code` — branch on that, not on `.message` or `instanceof` against
// a module-specific class.
import { openKv } from "../src/kv.mjs";

function expectThrow(label, fn) {
	try {
		fn();
		console.log(`${label} → DID NOT THROW (bug!)`);
	} catch (err) {
		console.log(`${label} → ${err.name} (${err.code}): ${err.message}`);
	}
}

// 1. Operations after close().
const closed = openKv();
closed.close();
expectThrow("get() after close()", () => closed.get(["x"]));
expectThrow("set() after close()", () => closed.set(["x"], 1));
expectThrow("watch() after close()", () => closed.watch({ key: ["x"] }));
expectThrow("publish() after close()", () => closed.publish("t", 1));
// ⇒ Error (ERR_KVSTORE_CLOSED): Database is closed

// 2. Malformed watch selector.
const kv = openKv();
expectThrow("watch({})", () => kv.watch({}));
expectThrow("watch({ key, topic })", () =>
	kv.watch({ key: ["a"], topic: "b" }),
);
expectThrow("watch({ keys: [] })", () => kv.watch({ keys: [] }));
expectThrow("watch({ topic: '' })", () => kv.watch({ topic: "" }));
expectThrow("watch({ key, events: ['boom'] })", () =>
	kv.watch({ key: ["a"], events: ["boom"] }),
);
expectThrow("watch(sel, { highWaterMark: 0 })", () =>
	kv.watch({ key: ["a"] }, { highWaterMark: 0 }),
);
// ⇒ all TypeError (ERR_KVSTORE_INVALID_SELECTOR)

// 3. publish() with a bad topic.
expectThrow("publish(42, ...)", () => kv.publish(42, {}));
expectThrow("publish('', ...)", () => kv.publish("", {}));
// ⇒ TypeError (ERR_KVSTORE_INVALID_TOPIC)

// 4. Key segment rules.
expectThrow("set([''], ...) — empty string segment", () => kv.set([""], 1));
expectThrow("set([NaN], ...) — NaN can't equal itself", () => kv.set([NaN], 1));
expectThrow("set(<huge key>, ...) — exceeds 1024-byte encoded limit", () =>
	kv.set(Array(210).fill("hello"), 1),
);
expectThrow("set([2n**2100n], ...) — bigint exceeds 255-byte magnitude", () =>
	kv.set([2n ** 2100n], 1),
);
// ⇒ the first three are TypeError (ERR_KVSTORE_INVALID_KEY); the last is
//   RangeError (ERR_KVSTORE_BIGINT_TOO_LARGE) specifically

// 5. What's actually fine, despite looking suspicious:
kv.set([" "], "whitespace-only segment is a valid key");
console.log(kv.get([" "]).value); // ⇒ whitespace-only segment is a valid key

// 6. getMany contract.
expectThrow("getMany('not-array')", () => kv.getMany("not-array"));
expectThrow("getMany([])", () => kv.getMany([]));
// ⇒ both TypeError (ERR_KVSTORE_INVALID_KEYS) — distinct from
//    ERR_KVSTORE_INVALID_KEY above, since these are about the *list*
//    argument, not a single key's shape.

// 7. Things that USED to throw but no longer do (under the v8 codec):
//    BigInt and undefined values are now stored losslessly.
kv.set(["nums"], { count: 9007199254740993n });
console.log(kv.get(["nums"]).value.count); // ⇒ 9007199254740993n
kv.set(["maybe"], undefined);
const { value } = kv.get(["maybe"]);
console.log(value === undefined); // ⇒ true

kv.close();
