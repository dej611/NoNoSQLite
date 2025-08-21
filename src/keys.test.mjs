import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSortedKeys } from "./keys.mjs";

describe("getSortedKeys", () => {
	it("should not throw for valid keys", () => {
		const validKeys = [
			// string based keys
			"key",
			["key"],
			["key", "key2"],
			// number based keys
			[8],
			[8, 8],
			[NaN, -NaN, Infinity, -Infinity],
			// bigInt based keys
			[8n],
			[8n, 8n],
			// boolean based keys
			[true],
			[false],
			[true, false],
			[true, true],
			[false, false],
		];
		for (const validKey of validKeys) {
			assert.doesNotThrow(() => getSortedKeys(validKey));
		}
	});

	it("should not throw for stringified edge case keys", () => {
		const validKeys = [
			// string based keys
			"null",
			["null", "undefined", "Infinity", "NaN", "true", "false", "🤷", "康"],
		];
		for (const validKey of validKeys) {
			assert.doesNotThrow(() => getSortedKeys(validKey));
		}
	});

	it("should throw for invalid keys", () => {
		const invalidKeys = [
			// string based keys
			[undefined],
			[null],
			[Symbol()],
			[{}],
			[() => {}],
			// over max bytes size (> 1024 b)
			Array(210).fill("hello"),
		];
		for (const invalidKey of invalidKeys) {
			assert.throws(() => getSortedKeys(invalidKey));
		}
	});
});
