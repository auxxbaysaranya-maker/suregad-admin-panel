import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  // "/" locally; "/suregad-admin-panel/" when published to GitHub Pages.
  const base = env.VITE_BASE_PATH || "/";
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    server: {
      port: 5174,
      proxy: {
        "/api": "http://localhost:4000",
        "/media": "http://localhost:4000",
        "/socket.io": { target: "http://localhost:4000", ws: true },
      },
    },
  };
});
