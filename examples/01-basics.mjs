#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 01-basics — set / get / delete / clear / close.
// The "first 30 seconds" tour of the KV API. Run with:
//   node examples/01-basics.mjs
import { openKv } from "../src/kv.mjs";

const kv = openKv();

kv.set("greeting", "hello");
kv.set(["user", 42], { name: "Alice" });

console.log(kv.get("greeting"));         // ⇒ { key: ['greeting'], value: 'hello' }
console.log(kv.get(["user", 42]));       // ⇒ { key: ['user', 42], value: { name: 'Alice' } }
console.log(kv.get(["missing"]));        // ⇒ { key: ['missing'], value: null }

console.log(kv.delete(["user", 42]));    // ⇒ true
console.log(kv.delete(["user", 42]));    // ⇒ false (already gone)

kv.clear();                              // empties the store
console.log(kv.get("greeting"));         // ⇒ { key: ['greeting'], value: null }

kv.close();
