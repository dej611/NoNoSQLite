/**
 * Minimal dependency-free timing harness — no benchmark library, matching
 * the rest of the project's zero-runtime-dependency posture.
 */

const WARMUP_FRACTION = 0.1;

/**
 * @param {(i: number) => void} fn - called once per iteration with the
 *   iteration index, so callers can vary keys/values without pre-generating
 *   an array of inputs.
 * @param {{iterations: number}} options
 * @returns {{iterations: number, opsPerSec: number, msTotal: number}}
 */
export function timeit(fn, { iterations }) {
	const warmup = Math.max(1, Math.floor(iterations * WARMUP_FRACTION));
	for (let i = 0; i < warmup; i++) fn(i);

	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) fn(i);
	const end = process.hrtime.bigint();

	const nsTotal = Number(end - start);
	return {
		iterations,
		msTotal: nsTotal / 1e6,
		opsPerSec: iterations / (nsTotal / 1e9),
	};
}

function formatOpsPerSec(n) {
	return Math.round(n).toLocaleString("en-US");
}

/**
 * @param {{scenario: string, kv: {opsPerSec: number}, raw: {opsPerSec: number}}[]} rows
 */
export function printReport(rows) {
	const header = ["scenario", "kv ops/sec", "raw ops/sec", "overhead (raw/kv)"];
	const lines = rows.map((r) => [
		r.scenario,
		formatOpsPerSec(r.kv.opsPerSec),
		formatOpsPerSec(r.raw.opsPerSec),
		`${(r.raw.opsPerSec / r.kv.opsPerSec).toFixed(2)}x`,
	]);
	const widths = header.map((h, i) =>
		Math.max(h.length, ...lines.map((l) => l[i].length)),
	);
	const pad = (cell, i) => cell.padEnd(widths[i]);
	const printRow = (cells) => console.log(`| ${cells.map(pad).join(" | ")} |`);
	printRow(header);
	printRow(widths.map((w) => "-".repeat(w)));
	for (const line of lines) printRow(line);
}
