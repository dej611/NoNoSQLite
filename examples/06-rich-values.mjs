#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 06-rich-values — values are stored via Node's v8 structured-clone codec.
// What round-trips losslessly: primitives, undefined, BigInt, Date, RegExp,
// Map, Set, typed arrays, ArrayBuffer, sparse arrays, and CIRCULAR refs.
// What does NOT survive: functions (omitted), class identity (becomes a
// plain object), DOM-only types (irrelevant in Node).
import { openKv } from "../src/kv.mjs";

const kv = openKv();

// Rich types.
const value = {
	when: new Date("2026-01-15T10:30:00Z"),
	count: 9007199254740993n,             // beyond MAX_SAFE_INTEGER
	tags: new Set(["urgent", "review"]),
	lookup: new Map([["x", 1], ["y", 2]]),
	pattern: /foo/gi,
	missing: undefined,
	bytes: new Uint8Array([1, 2, 3]),
};
kv.set(["doc"], value);

const round = kv.get(["doc"]).value;
console.log(round.when instanceof Date);          // ⇒ true
console.log(typeof round.count);                  // ⇒ bigint
console.log(round.tags instanceof Set);           // ⇒ true
console.log(round.lookup instanceof Map);         // ⇒ true
console.log(round.pattern.flags);                 // ⇒ gi
console.log("missing" in round && round.missing); // ⇒ undefined (preserved!)
console.log(round.bytes);                         // ⇒ Uint8Array(3) [1,2,3]

// Circular references survive too.
const a = { name: "self-ref" };
a.self = a;
kv.set(["cyc"], a);
const cycled = kv.get(["cyc"]).value;
console.log(cycled.self === cycled);              // ⇒ true

// Class identity does NOT survive — instances come back as plain objects.
class User {
	constructor(name) { this.name = name; }
	greet() { return `hi, ${this.name}`; }
}
kv.set(["u"], new User("alice"));
const u = kv.get(["u"]).value;
console.log(u.name);                              // ⇒ alice
console.log(u instanceof User);                   // ⇒ false
console.log(typeof u.greet);                      // ⇒ undefined

kv.close();
