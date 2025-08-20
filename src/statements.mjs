import { serializeValue, deserializeValue } from './utils.mjs';

/**
 * @typedef {Object} DbInstance
 */


/**
 * Prepare a custom DB interface 
 * @param {DatabaseSync} database 
 * @param {string} namespace 
 * @returns {DbInstance}
 */
export function prepareDb(database, namespace){

  const upsertStm = database.prepare(
      `INSERT INTO ${namespace} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    );

    const selectStm = database.prepare(
      `SELECT value FROM ${namespace} WHERE key = :key`
    );

    const deleteStm = database.prepare(
      `DELETE FROM ${namespace} WHERE key = :key`
    );

    const prefixStm = database.prepare(
          `SELECT key FROM ${namespace} WHERE key LIKE :prefix`
        );

    const rangeStm = database.prepare(
          `SELECT key FROM ${namespace} WHERE key > :start AND key < :end`
        );

  return {
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
    range: (serializedStart, serializedEnd) => {
        return rangeStm.iterate({ start: serializedStart, end: serializedEnd });
    },
    prefix: (serializedPrefix) => {
        return prefixStm.iterate({prefix: serializedPrefix})
    }
  };
}