import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => ({
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
    "process.env": {},
    global: "globalThis",
  },
  plugins: [
    nodePolyfills({ include: ["buffer", "process"], globals: { Buffer: true, process: true } }),
    wasm(),
    react(),
    viteCommonjs(),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  optimizeDeps: { esbuildOptions: { define: { global: "globalThis" } } },
  build: { target: "esnext", commonjsOptions: { transformMixedEsModules: true } },
  server: { port: 5174, fs: { allow: [".."] } },
}));
