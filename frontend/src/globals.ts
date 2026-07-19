// vite-plugin-node-polyfills injects Buffer + process as real globals at build
// time (see `globals` in vite.config.ts). this only backfills process.env.NODE_ENV
// for any midnight lib that reads it during early module evaluation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

if (g.process == null) g.process = { env: {} };
if (g.process.env == null) g.process.env = {};
if (g.process.env.NODE_ENV == null) g.process.env.NODE_ENV = import.meta.env.MODE;
