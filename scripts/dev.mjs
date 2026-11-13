#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || "3210";
const registryScript = path.join(ROOT, "scripts", "build-registry.mjs");
const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const first = spawnSync(process.execPath, [registryScript], { cwd: ROOT, stdio: "inherit" });
if (first.error) {
  console.error(first.error);
  process.exit(1);
}

const children = [
  spawn(process.execPath, [registryScript, "--watch", "--no-initial"], { cwd: ROOT, stdio: "inherit" }),
  spawn(process.execPath, [nextBin, "dev", "-p", PORT, ...process.argv.slice(2)], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  }),
];

let exiting = false;
function shutdown(code, signal = "SIGTERM") {
  if (exiting) return;
  exiting = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal);
  }
  setTimeout(() => process.exit(code), 1500).unref();
  Promise.all(
    children.map((c) => (c.exitCode !== null || c.signalCode !== null ? null : new Promise((r) => c.once("exit", r)))),
  ).then(() => process.exit(code));
}

for (const child of children) {
  child.on("exit", (code, signal) => shutdown(code ?? (signal ? 1 : 0)));
  child.on("error", (error) => {
    console.error(error);
    shutdown(1);
  });
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => shutdown(0, signal));
}
