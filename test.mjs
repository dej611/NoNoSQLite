import test from "node:test";
import assert from "node:assert/strict";
import KVLite from "./kv.mjs";

const kv = new KVLite("test");

test("set return OK", (t) => {
  const res = kv.set("key", "value");
  assert.strictEqual(res, "OK");
});

test("get return the value", (t) => {
  const res = kv.get("key");
  assert.strictEqual(res, "value");
});
