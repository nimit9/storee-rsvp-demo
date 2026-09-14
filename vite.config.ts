import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The chat frontend lives in static/ and is copied verbatim (no build).
// Vite's only HTML entry is dashboard.html -> the React app.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "static",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: { dashboard: "dashboard.html" },
    },
  },
});
