import { DatabaseSync } from "node:sqlite";
import { inspect } from "node:util";
//const database = new DatabaseSync(":memory:");
const database = new DatabaseSync("mydb.sqlite");

class KVLite {
  constructor(namespace = "kvlite") {
    this.namespace = namespace;
    database.exec(`
  CREATE TABLE IF NOT EXISTS ${namespace} (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
    this.setUpsertStm = database.prepare(
      `INSERT INTO ${namespace} (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`
    );
    this.getSelectStm = database.prepare(
      `SELECT value FROM ${namespace} WHERE key = :key`
    );
  }

  set(k, v) {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#using_instanceof_with_string
    const kIsStirng = typeof k === "string" || k instanceof String;
    const vIsString = typeof v === "string" || v instanceof String;
    if (!kIsStirng) {
      throw new Error("k must be a string");
    }
    if (!vIsString) {
      throw new Error("v must be a string");
    }
    const ret = this.setUpsertStm.run(k, v);
    return ret.changes === 1 ? "OK" : "KO";
  }

  get(k) {
    const kIsStirng = typeof k === "string" || k instanceof String;
    if (!kIsStirng) {
      throw new Error("k must be a string");
    }
    const val = this.getSelectStm.get({ key: k });
    return val ? val.value : null; // TODO - why null ?
  }
}

export default KVLite;
