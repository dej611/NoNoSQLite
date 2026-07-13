import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { encodeKey } from "./keys.mjs";
import { prepareDb } from "./statements.mjs";

// Direct tests of the statement layer prepareDb() returns, independent of
// KVStore. Most of this layer is already exercised indirectly through
// kv.test.mjs, but KVStore.getMany() rejects an empty key list itself
// (ERR_KVSTORE_INVALID_KEYS) before ever calling into this layer, so its own
// early-return guard has no path to it through the public API — only a
// direct test can reach it (regression: coverage gap).
describe("prepareDb (statement layer)", () => {
	function open() {
		return prepareDb(new DatabaseSync(":memory:"), { isMemory: true });
	}

	it("getMany([]) returns an empty Map without querying the database", () => {
		const db = open();
		const result = db.getMany([]);
		assert.ok(result instanceof Map);
		assert.equal(result.size, 0);
	});

	it("upsert/get/delete/clear round-trip", () => {
		const db = open();
		const { encoded } = encodeKey(["a"]);

		assert.deepEqual(db.get(encoded), { value: null });

		db.upsert(encoded, "hello");
		assert.deepEqual(db.get(encoded), { value: "hello" });

		assert.equal(db.delete(encoded).changes, 1);
		assert.deepEqual(db.get(encoded), { value: null });

		db.upsert(encoded, "again");
		db.clear();
		assert.deepEqual(db.get(encoded), { value: null });
	});
});
