#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 10-publish-topic — fire-and-forget app events on a separate plane.
// Topics never touch the DB; they're a pure in-process pub/sub channel.
// Watchers receive the published payload directly (no envelope).
import { openKv } from "../src/kv.mjs";

const kv = openKv();
const logins = kv.watch({ topic: "login" });

const events = [];
logins.on("data", (payload) => events.push(payload));

kv.publish("login",  { user: "alice", at: Date.now() });
kv.publish("login",  { user: "bob",   at: Date.now() });
kv.publish("logout", { user: "alice" });    // different topic — ignored

await new Promise((r) => setImmediate(r));
logins.destroy();
kv.close();

console.log(events.length);                          // ⇒ 2
console.log(events.map((e) => e.user));              // ⇒ ['alice', 'bob']
