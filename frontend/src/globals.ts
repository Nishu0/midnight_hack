// node shims some midnight packages expect in the browser
import { Buffer } from "buffer";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

if (typeof globalThis.process === "undefined") {
  // @ts-expect-error minimal process shim
  globalThis.process = { env: { NODE_ENV: import.meta.env.MODE }, browser: true, version: "" };
}
