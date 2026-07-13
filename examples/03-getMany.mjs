#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 03-getMany — fetch many keys in one DB round-trip. The output array
// preserves the input order, missing keys come back as `value: null`,
// and duplicates in the input produce duplicates in the output.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

kv.set(["user", 1], "alice");
kv.set(["user", 2], "bob");
kv.set(["user", 3], "carol");

// Order is preserved.
console.log(kv.getMany([["user", 3], ["user", 1], ["user", 2]]));
// ⇒ [
//     { key: ['user', 3], value: 'carol' },
//     { key: ['user', 1], value: 'alice' },
//     { key: ['user', 2], value: 'bob' },
//   ]

// Missing keys return null in place.
console.log(kv.getMany([["user", 1], ["user", 99]]));
// ⇒ [
//     { key: ['user', 1], value: 'alice' },
//     { key: ['user', 99], value: null },
//   ]

// Duplicates pass through unchanged.
console.log(kv.getMany([["user", 1], ["user", 1]]));
// ⇒ [{ key: ['user', 1], value: 'alice' }, { key: ['user', 1], value: 'alice' }]

kv.close();
