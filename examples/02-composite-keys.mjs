#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 02-composite-keys — keys are tuples of mixed primitive segments
// (string | number | bigint | boolean). Each segment preserves its type
// on the round-trip: `5` and `'5'` are different keys, `42n` survives as
// a BigInt, etc.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

kv.set(["user", 42, true], "active");
kv.set(["user", "42", true], "string-id");           // distinct key
kv.set(["order", 2024n, "pending"], { total: 99 });

console.log(kv.get(["user", 42, true]));             // ⇒ { key: ['user', 42, true], value: 'active' }
console.log(kv.get(["user", "42", true]));           // ⇒ { key: ['user', '42', true], value: 'string-id' }
console.log(kv.get(["order", 2024n, "pending"]));    // ⇒ { key: ['order', 2024n, 'pending'], value: { total: 99 } }

// String shorthand: `kv.get('foo')` is equivalent to `kv.get(['foo'])`.
kv.set("counter", 1);
console.log(kv.get(["counter"]));                    // ⇒ { key: ['counter'], value: 1 }

kv.close();
