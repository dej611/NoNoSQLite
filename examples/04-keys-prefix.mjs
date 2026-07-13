#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 04-keys-prefix — iterate keys under a hierarchical prefix.
// `kv.keys({ prefix })` matches strict descendants of the prefix
// (the prefix key itself is not included). Use optional `start`/`end`
// to narrow to a sub-range within the prefix.
import { openKv } from "../src/kv.mjs";

const kv = openKv();

// Hierarchical layout:
//   ['user', N, 'profile']
//   ['user', N, 'sessions', M]
kv.set(["user", 1, "profile"], { name: "alice" });
kv.set(["user", 1, "sessions", "s1"], { ip: "1.2.3.4" });
kv.set(["user", 1, "sessions", "s2"], { ip: "5.6.7.8" });
kv.set(["user", 2, "profile"], { name: "bob" });
kv.set(["admins", 1], "carol");

// All descendants of ['user'].
const userKeys = [];
for (const { key } of kv.keys({ prefix: ["user"] })) userKeys.push(key);
console.log(userKeys.length);          // ⇒ 4
console.log(userKeys);
// ⇒ four entries: profile/sessions for users 1 and 2

// Just the sessions of user 1.
const sessions = [];
for (const { key } of kv.keys({ prefix: ["user", 1, "sessions"] })) {
	sessions.push(key);
}
console.log(sessions);
// ⇒ [['user', 1, 'sessions', 's1'], ['user', 1, 'sessions', 's2']]

// Prefix + start/end narrows the matched range.
const range = [];
for (const { key } of kv.keys({
	prefix: ["user"],
	start: ["user", 1, "sessions", "s2"],
	end: ["user", 2, "profile"],
})) {
	range.push(key);
}
console.log(range);
// ⇒ [['user', 1, 'sessions', 's2'], ['user', 2, 'profile']]

kv.close();
