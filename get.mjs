#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// https://unix.stackexchange.com/questions/399690/multiple-arguments-in-shebang
import { argv } from "node:process";
import KVLite from "./kv.mjs";

const kv = new KVLite();
const retrieved = kv.get(argv[2]);
console.log(retrieved);
