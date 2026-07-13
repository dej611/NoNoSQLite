#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// 13-session-store — full session lifecycle on top of the KV store.
//   login   → set(['session', id])      + publish('login',  user)
//   touch   → set(['session', id])      (refresh lastSeen)
//   logout  → delete(['session', id])   + publish('logout', user)
//   audit   → watch({prefix: ['session']}) records every change
import { openKv } from "../src/kv.mjs";

const kv = openKv();

const auditTrail = [];
const audit = kv.watch({ prefix: ["session"] });
audit.on("data", (e) => auditTrail.push(e.type + " " + JSON.stringify(e.key)));

const loginFeed = kv.watch({ topic: "login" });
const loggedIn = [];
loginFeed.on("data", (u) => loggedIn.push(u));

function login(id, user) {
	kv.set(["session", id], { user, lastSeen: Date.now() });
	kv.publish("login", user);
}

function touch(id) {
	const { value } = kv.get(["session", id]);
	if (!value) return false;
	kv.set(["session", id], { ...value, lastSeen: Date.now() });
	return true;
}

function logout(id) {
	const { value } = kv.get(["session", id]);
	if (!value) return false;
	kv.delete(["session", id]);
	kv.publish("logout", value.user);
	return true;
}

login("s-1", "alice");
login("s-2", "bob");
touch("s-1");
logout("s-2");

await new Promise((r) => setImmediate(r));
audit.destroy();
loginFeed.destroy();
kv.close();

console.log(loggedIn);          // ⇒ ['alice', 'bob']
console.log(auditTrail);
// ⇒ [
//     'set ["session","s-1"]',
//     'set ["session","s-2"]',
//     'set ["session","s-1"]',     ← touch refresh
//     'delete ["session","s-2"]',
//   ]
