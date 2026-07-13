# Security Policy

## Supported versions

This project is pre-1.0 and experimental. Security fixes, if any, land on
the latest released version only — there is no supported-version matrix yet.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Preferred: use GitHub's private vulnerability reporting for this repository
([lifeisfoo/NoNoSQLite](https://github.com/lifeisfoo/NoNoSQLite) →
**Security** tab → **Report a vulnerability**), which opens a private
advisory visible only to maintainers until a fix is ready.

<!-- TODO: add a dedicated security-contact email once one is designated. -->

Please include:

* A description of the issue and its potential impact
* Steps to reproduce (a minimal repro is very helpful)
* The version/commit you tested against

We'll acknowledge reports as soon as we can and keep you updated as we
investigate.

## Known trust-boundary considerations

These are documented, not vulnerabilities in themselves — see `kv.md` for
full detail:

* **Untrusted database files.** `openKv({ path })` reads stored values via
  `v8.deserialize()`. Only open a `path` that this module (or another
  trusted process) created — an untrusted `.sqlite` file is equivalent to
  deserializing untrusted input. See `kv.md`'s "Security: only open files
  you trust" note under `kvstore.openKv([options])`.
* **In-process-only `watch()`.** `watch()`/`publish()` only observe
  mutations made through the same `KVStore` instance, in the same process —
  there is no cross-process or cross-machine notification. This is a
  correctness/design boundary, not a vulnerability, but is worth knowing if
  you're building access-control logic on top of it. See `kv.md`'s "Scope"
  note under `kv.watch(selector[, options])`.

If you find a security-relevant issue beyond these documented boundaries,
please report it as above.
