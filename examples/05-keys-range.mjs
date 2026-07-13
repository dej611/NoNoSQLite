#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 05-keys-range — pure inclusive range query: `{ start, end }`.
// Useful when the data isn't naturally hierarchical and you want
// "everything between A and Z, lexically." Order is the encoded
// lex order — segment types are tagged so [5] and ['5'] never collide.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

for (const c of ["a", "b", "c", "d", "e"]) {
	kv.set([c], `value-${c}`);
}

// Inclusive on both ends.
const inRange = [];
for (const { key } of kv.keys({ start: ["b"], end: ["d"] })) {
	inRange.push(key[0]);
}
console.log(inRange);                     // ⇒ ['b', 'c', 'd']

// String numbers vs numeric numbers don't collide because of type tags.
kv.set([5], "numeric-5");
kv.set(["5"], "string-5");
const fives = [];
for (const { key } of kv.keys({ start: [5], end: [5] })) fives.push(key);
console.log(fives);                        // ⇒ [[5]]   — only the numeric one

kv.close();
