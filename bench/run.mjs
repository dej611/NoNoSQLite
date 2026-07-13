#!/usr/bin/env node
/**
 * Benchmark: NoNoSQLite's KVStore vs. a hand-rolled `node:sqlite` KV table
 * (TEXT key = JSON.stringify(keyArray), TEXT value = JSON.stringify(value)) —
 * i.e. what a developer gets by reaching for `node:sqlite` directly instead
 * of this module. The ratio in the "overhead" column is the cost of
 * KVStore's correctness/feature layer: order-preserving binary key encoding,
 * the v8 rich-value codec, argument validation, and the watch/publish event
 * plane — not a claim that raw `node:sqlite` is "wrong", it just can't do
 * numeric/bigint range ordering or round-trip rich values the way KVStore
 * does (see kv.md).
 *
 * Runs entirely in-memory (`:memory:`) on both sides to isolate JS-layer
 * cost from disk I/O. Not part of `test:all` — informational only, run via
 * `npm run bench`.
 */
import { DatabaseSync } from "node:sqlite";
import { openKv } from "../src/kv.mjs";
import { printReport, timeit } from "./common.mjs";

const DATASET_SIZE = 5_000;
const SET_ITERATIONS = 20_000;
const GET_ITERATIONS = 20_000;
const GET_MANY_BATCH = 100;
const GET_MANY_ITERATIONS = 2_000;
const RANGE_SCAN_PASSES = 200;

function makeValue(i) {
	return {
		id: i,
		name: `item-${i}`,
		tags: ["a", "b", "c"],
		active: i % 2 === 0,
	};
}

function makeRawStore() {
	const db = new DatabaseSync(":memory:");
	db.exec("CREATE TABLE raw_kv (key TEXT PRIMARY KEY, value TEXT)");
	const upsert = db.prepare(
		"INSERT INTO raw_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
	);
	const select = db.prepare("SELECT value FROM raw_kv WHERE key = ?");
	// Naive JSON-text keys don't sort numerically (e.g. "10" < "9"
	// lexicographically) — the exact ordering bug this module's binary key
	// encoding exists to fix (see SPEC-DECISIONS.md, N1). A bounded `WHERE key
	// >= ? AND key <= ?` would therefore miss rows, so the raw baseline does a
	// full-table scan instead (each bench run uses a dedicated table, so this
	// is still an apples-to-apples "scan this dataset" comparison).
	const scanAll = db.prepare("SELECT key, value FROM raw_kv");
	const inClauseCache = new Map();
	function inClauseStatement(count) {
		let stmt = inClauseCache.get(count);
		if (!stmt) {
			const placeholders = Array(count).fill("?").join(", ");
			stmt = db.prepare(
				`SELECT key, value FROM raw_kv WHERE key IN (${placeholders})`,
			);
			inClauseCache.set(count, stmt);
		}
		return stmt;
	}
	const rawKey = (prefix, i) => JSON.stringify([prefix, i]);
	return {
		close: () => db.close(),
		set: (prefix, i, value) =>
			upsert.run(rawKey(prefix, i), JSON.stringify(value)),
		get: (prefix, i) => {
			const row = select.get(rawKey(prefix, i));
			return row ? JSON.parse(row.value) : null;
		},
		getMany: (prefix, indices) => {
			const stmt = inClauseStatement(indices.length);
			const rows = stmt.all(...indices.map((i) => rawKey(prefix, i)));
			return rows.map((r) => JSON.parse(r.value));
		},
		rangeScan: () => {
			let count = 0;
			for (const _ of scanAll.iterate()) count++;
			return count;
		},
	};
}

function benchSet() {
	const kv = openKv();
	const raw = makeRawStore();
	const kvResult = timeit((i) => kv.set(["bench-set", i], makeValue(i)), {
		iterations: SET_ITERATIONS,
	});
	const rawResult = timeit((i) => raw.set("bench-set", i, makeValue(i)), {
		iterations: SET_ITERATIONS,
	});
	kv.close();
	raw.close();
	return { scenario: "set", kv: kvResult, raw: rawResult };
}

function benchGet() {
	const kv = openKv();
	const raw = makeRawStore();
	for (let i = 0; i < DATASET_SIZE; i++) {
		kv.set(["bench-get", i], makeValue(i));
		raw.set("bench-get", i, makeValue(i));
	}
	const kvResult = timeit((i) => kv.get(["bench-get", i % DATASET_SIZE]), {
		iterations: GET_ITERATIONS,
	});
	const rawResult = timeit((i) => raw.get("bench-get", i % DATASET_SIZE), {
		iterations: GET_ITERATIONS,
	});
	kv.close();
	raw.close();
	return { scenario: "get", kv: kvResult, raw: rawResult };
}

function benchGetMany() {
	const kv = openKv();
	const raw = makeRawStore();
	for (let i = 0; i < DATASET_SIZE; i++) {
		kv.set(["bench-getmany", i], makeValue(i));
		raw.set("bench-getmany", i, makeValue(i));
	}
	const batchAt = (offset) =>
		Array.from(
			{ length: GET_MANY_BATCH },
			(_, j) => (offset + j) % DATASET_SIZE,
		);
	const kvResult = timeit(
		(i) => {
			const indices = batchAt(i * GET_MANY_BATCH);
			kv.getMany(indices.map((idx) => ["bench-getmany", idx]));
		},
		{ iterations: GET_MANY_ITERATIONS },
	);
	const rawResult = timeit(
		(i) => raw.getMany("bench-getmany", batchAt(i * GET_MANY_BATCH)),
		{ iterations: GET_MANY_ITERATIONS },
	);
	kv.close();
	raw.close();
	return {
		scenario: `getMany (batch=${GET_MANY_BATCH})`,
		kv: kvResult,
		raw: rawResult,
	};
}

function benchRangeScan() {
	const kv = openKv();
	const raw = makeRawStore();
	for (let i = 0; i < DATASET_SIZE; i++) {
		kv.set(["bench-range", i], makeValue(i));
		raw.set("bench-range", i, makeValue(i));
	}
	const kvResult = timeit(
		() => {
			let count = 0;
			for (const _ of kv.keys({ prefix: ["bench-range"] })) count++;
			if (count !== DATASET_SIZE) throw new Error("range scan count mismatch");
		},
		{ iterations: RANGE_SCAN_PASSES },
	);
	const rawResult = timeit(
		() => {
			const count = raw.rangeScan();
			if (count !== DATASET_SIZE) throw new Error("range scan count mismatch");
		},
		{ iterations: RANGE_SCAN_PASSES },
	);
	kv.close();
	raw.close();
	return {
		scenario: `keys range scan (${DATASET_SIZE} rows)`,
		kv: kvResult,
		raw: rawResult,
	};
}

const rows = [benchSet(), benchGet(), benchGetMany(), benchRangeScan()];
console.log(`node ${process.version}\n`);
printReport(rows);
