import { serializeValue, deserializeValue } from './utils.mjs';
import { deserializeKeys } from './keys.mjs';

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

  database.exec(`
  CREATE TABLE IF NOT EXISTS ${namespace} (
    key TEXT PRIMARY KEY,
    value TEXT
  )`)

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
          `SELECT key FROM ${namespace} WHERE key >= :start AND key <= :end`
        );

    const flushStm = database.prepare(
      `DELETE FROM ${namespace}`
    );

    function wrapIterator(iterator){
      return {
        *[Symbol.iterator]() {
          for( const entry of iterator){
            console.log({entry})
            yield { key: deserializeKeys(entry.key) };
          }
        }
      }
    }

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
      database.exec(
        `DELETE FROM ${namespace}`
      );
    },
    range: (serializedStart, serializedEnd) => {
        const iterator = rangeStm.iterate({ start: serializedStart, end: serializedEnd });
        return wrapIterator(iterator);
    },
    prefix: (serializedPrefix) => {
        const iterator = prefixStm.iterate({prefix: serializedPrefix});
        return wrapIterator(iterator);
    }
  };
}