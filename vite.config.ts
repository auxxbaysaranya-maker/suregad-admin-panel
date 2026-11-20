import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  // "/" locally and on dashboard.suregad.in.
  const base = env.VITE_BASE_PATH || "/";
  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // "prompt": a new deploy shows "Update available" instead of swapping code under an open form.
        registerType: "prompt",
        injectRegister: false,
        includeAssets: ["brand/favicon-64.png", "brand/apple-touch-icon.png", "brand/logo.png", "brand/mark.png"],
        manifest: {
          id: base,
          name: "SureGad Hub",
          short_name: "SureGad Hub",
          description: "Seller, inspection partner and admin panels for SureGad.",
          theme_color: "#0e0f2c",
          background_color: "#f7f6fc",
          display: "standalone",
          orientation: "portrait",
          start_url: base,
          scope: base,
          icons: [
            { src: "brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        devOptions: { enabled: false },
        workbox: {
          navigateFallback: `${base}index.html`,
          navigateFallbackDenylist: [/\/api\//],
          cleanupOutdatedCaches: true,
          // Take control on first install so later updates can reload the page; updates still wait for "Update now".
          clientsClaim: true,
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io"), handler: "NetworkOnly" }],
        },
      }),
    ],
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
