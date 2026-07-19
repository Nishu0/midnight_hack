// node shims some midnight packages expect in the browser. vite-plugin-node-polyfills
// provides the real implementations at runtime; this just makes sure the globals exist.
import { Buffer } from "buffer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

if (typeof g.Buffer === "undefined") {
  g.Buffer = Buffer;
}

if (typeof g.process === "undefined") {
  g.process = { env: { NODE_ENV: import.meta.env.MODE }, browser: true, version: "" };
}
