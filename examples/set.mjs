#!/usr/bin/env -S node --disable-warning=ExperimentalWarning
// https://unix.stackexchange.com/questions/399690/multiple-arguments-in-shebang
import { argv } from "node:process";
import KVLite from "../src/kv.mjs";

const kv = new KVLite();
const uv = kv.set(argv[2], argv[3]);
console.log(uv);
