#!/usr/bin/env node
/**
 * Dependency-free stand-in for Node core's doc tooling (`tools/doc/`), which
 * this repo can't run directly (it lives inside a real nodejs/node checkout
 * and expects that layout). Checks kv.md for:
 *
 *   1. Broken reference-style links: every `[text][]`/`[text][label]` usage
 *      must have a matching `[label]: target` definition, and every
 *      same-file `#anchor` target must match a real heading (computed with
 *      GitHub's own heading-slug algorithm, verified by hand against this
 *      doc's existing anchors before being trusted here).
 *   2. Unused reference definitions (a definition nothing links to).
 *   3. That every standalone-runnable `mjs`/`cjs` code block in the doc
 *      actually executes against the real module. Blocks that are
 *      intentionally partial (continuing prose context — e.g. assuming a
 *      `kv`/`sub` variable already exists) are detected and skipped with a
 *      stated reason, not silently ignored.
 *
 * Exits non-zero on any broken link/anchor or any failing runnable block.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DOC_PATH = join(ROOT, "kv.md");
const SRC_MODULE = join(ROOT, "src", "kv.mjs");

const doc = readFileSync(DOC_PATH, "utf8");
const lines = doc.split("\n");

// --- 1. Heading anchors (GitHub's slug algorithm) ---------------------------

function slugify(heading, seen) {
	const slug = heading
		.toLowerCase()
		.replace(/[^\w\- ]+/g, "")
		.trim()
		.replace(/\s+/g, "-");
	const count = seen.get(slug) ?? 0;
	seen.set(slug, count + 1);
	return count === 0 ? slug : `${slug}-${count}`;
}

const seenSlugs = new Map();
const anchors = new Set();
for (const line of lines) {
	const m = /^#{1,6}\s+(.*)$/.exec(line);
	if (m) anchors.add(slugify(m[1], seenSlugs));
}

// --- 2. Reference-style link definitions & usages ---------------------------

const definitions = new Map(); // normalized label -> { raw, target }
for (const line of lines) {
	const m = /^\[([^\]]+)\]:\s*(\S+)\s*$/.exec(line);
	if (m) {
		const [, raw, target] = m;
		definitions.set(raw.toLowerCase(), { raw, target });
	}
}

const used = new Set();
// Strip code fences before scanning for link usages — fenced code isn't
// prose, and backtick-heavy code can otherwise look like `[text][]`.
let inFence = false;
for (const line of lines) {
	if (/^```/.test(line)) {
		inFence = !inFence;
		continue;
	}
	if (inFence) continue;
	// [label]: target  (the definitions themselves) - already handled above,
	// skip so a definition line isn't also counted as a usage of itself.
	if (/^\[[^\]]+\]:\s*\S+\s*$/.test(line)) continue;
	for (const m of line.matchAll(/\[([^\]]+)\]\[([^\]]*)\]/g)) {
		const [, text, label] = m;
		used.add((label || text).toLowerCase());
	}
}

const linkErrors = [];
for (const label of used) {
	const def = definitions.get(label);
	if (!def) {
		linkErrors.push(`undefined reference: [${label}]`);
		continue;
	}
	if (def.target.startsWith("#") && !anchors.has(def.target.slice(1))) {
		linkErrors.push(
			`broken anchor: [${def.raw}]: ${def.target} (no heading slugs to "${def.target.slice(1)}")`,
		);
	}
	// Targets like "v8.md#..." point at a sibling doc file this repo doesn't
	// have locally (it's written for eventual placement in nodejs/node's
	// doc/api/) — can't validate those without that checkout, so they're
	// intentionally left unchecked rather than guessed at.
}

const unusedDefinitions = [...definitions.keys()].filter((l) => !used.has(l));

// --- 3. Executable mjs/cjs code blocks ---------------------------------------

function extractCodeBlocks(source) {
	const re = /^```(mjs|cjs)\n([\s\S]*?)\n```$/gm;
	return [...source.matchAll(re)].map((m) => ({
		lang: m[1],
		code: m[2],
		startLine: source.slice(0, m.index).split("\n").length,
	}));
}

function isFragment(code) {
	// A block is a standalone example (not a prose continuation) only if it
	// establishes its own `kv`/`sub` binding before using one. Anything that
	// references `kv.`/`sub.`/`sub)` without ever binding it is assumed to
	// continue context from the surrounding prose.
	const definesKv = /\b(?:const|let|var)\s+kv\s*=/.test(code);
	const definesSub = /\b(?:const|let|var)\s+sub\s*=/.test(code);
	const usesKv = /\bkv\s*\./.test(code);
	const usesSub = /\bsub\b/.test(code);
	if (usesKv && !definesKv)
		return "references `kv` without defining it (continues surrounding prose)";
	if (usesSub && !definesSub)
		return "references `sub` without defining it (continues surrounding prose)";
	return null;
}

const blocks = extractCodeBlocks(doc);
const results = { executed: 0, skipped: [], failed: [] };

for (const block of blocks) {
	const reason = isFragment(block.code);
	if (reason) {
		results.skipped.push({ ...block, reason });
		continue;
	}

	const workdir = mkdtempSync(join(tmpdir(), "kvmd-doc-check-"));
	try {
		const ext = block.lang === "mjs" ? "mjs" : "cjs";
		const filePath = join(workdir, `snippet.${ext}`);
		// An absolute filesystem path is a valid import/require specifier for
		// both ESM and CJS, and sidesteps relative-path fragility from tmpdir
		// symlinks (e.g. macOS's /var -> /private/var).
		const rewritten = block.code.replace(
			/(['"])node:kvstore\1/g,
			(_, quote) => `${quote}${SRC_MODULE}${quote}`,
		);
		writeFileSync(filePath, rewritten);
		execFileSync(process.execPath, [filePath], {
			cwd: workdir,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, NODE_NO_WARNINGS: "1" },
		});
		results.executed++;
	} catch (err) {
		results.failed.push({
			...block,
			error: err.stderr?.toString() || err.message,
		});
	} finally {
		rmSync(workdir, { recursive: true, force: true });
	}
}

// --- Report -------------------------------------------------------------

console.log(
	`kv.md: ${anchors.size} headings, ${definitions.size} link definitions, ${used.size} usages`,
);
console.log(
	`kv.md: ${blocks.length} mjs/cjs code blocks — ${results.executed} executed, ${results.skipped.length} skipped, ${results.failed.length} failed`,
);

if (results.skipped.length > 0) {
	console.log("\nSkipped (not standalone-runnable):");
	for (const s of results.skipped) {
		console.log(`  kv.md:${s.startLine} (${s.lang}) — ${s.reason}`);
	}
}

if (unusedDefinitions.length > 0) {
	console.log("\nUnused link definitions:");
	for (const label of unusedDefinitions) {
		console.log(`  [${definitions.get(label).raw}]`);
	}
}

let failed = false;

if (linkErrors.length > 0) {
	failed = true;
	console.error("\nLink/anchor errors:");
	for (const e of linkErrors) console.error(`  ${e}`);
}

if (results.failed.length > 0) {
	failed = true;
	console.error("\nFailing code blocks:");
	for (const f of results.failed) {
		console.error(`  kv.md:${f.startLine} (${f.lang}):\n${f.error}`);
	}
}

if (failed) {
	process.exitCode = 1;
} else {
	console.log("\nOK");
}
