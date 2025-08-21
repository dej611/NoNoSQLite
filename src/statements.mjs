import { KEY_PARTS_SEPARATOR } from "./constants.mjs";
import { deserializeKeys } from "./keys.mjs";
import { deserializeValue, serializeValue } from "./utils.mjs";

/**
 * @typedef {Object} DbInstance
 */

/**
 * Prepare a custom DB interface
 * @param {DatabaseSync} database
 * @param {string} namespace
 * @returns {DbInstance}
 */
export function prepareDb(database, namespace) {
	database.exec(`
  CREATE TABLE IF NOT EXISTS ${namespace} (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

	const upsertStm = database.prepare(
		`INSERT INTO ${namespace} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
	);

	const selectStm = database.prepare(
		`SELECT value FROM ${namespace} WHERE key = :key`,
	);

	const deleteStm = database.prepare(
		`DELETE FROM ${namespace} WHERE key = :key`,
	);

	const prefixStm = database.prepare(
		`SELECT key FROM ${namespace} WHERE key LIKE :prefix`,
	);

	const rangeStm = database.prepare(
		`SELECT key FROM ${namespace} WHERE key >= :start AND key <= :end`,
	);

	const flushStm = database.prepare(`DELETE FROM ${namespace}`);

	return {
		tables: () => {
			return database.exec(`SELECT * FROM sqlite_master;`);
		},
		upsert: (serializedKey, value) => {
			const serializedValue = serializeValue(value);
			return upsertStm.run(serializedKey, serializedValue);
		},
		get: (serializedKey) => {
			const entry = selectStm.get({ key: serializedKey });
			if (entry) {
				return { key: serializedKey, value: deserializeValue(entry.value) };
			}
			return { key: serializedKey, value: null };
		},
		delete: (serializedKey) => {
			return deleteStm.run({ key: serializedKey });
		},
		flush: () => {
			flushStm.run();
		},
		range: (serializedStart, serializedEnd) => {
			const iterator = rangeStm.iterate({
				start: serializedStart,
				end: serializedEnd,
			});
			return {
				*[Symbol.iterator]() {
					for (const entry of iterator) {
						yield { key: deserializeKeys(entry.key) };
					}
				},
			};
		},
		prefix: (serializedPrefix, options) => {
      // Mind to add a key separator to avoid partial matching for prefix
			const iterator = prefixStm.iterate({ prefix: `${serializedPrefix}${KEY_PARTS_SEPARATOR}%` });
			return {
				*[Symbol.iterator]() {
					for (const entry of iterator) {
						const isPurePrefix = options.start == null && options.end == null;
						const isWithinStart =
							options.start != null && entry.key >= options.start;
						const isWithinEnd = options.end != null && entry.key <= options.end;
						if (isPurePrefix || isWithinStart || isWithinEnd) {
							yield { key: deserializeKeys(entry.key) };
						}
					}
				},
			};
		},
	};
}
