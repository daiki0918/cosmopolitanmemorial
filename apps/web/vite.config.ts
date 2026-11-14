import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, fileURLToPath(new URL("../..", import.meta.url)), "VITE_");
  return {
    define: {
      "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(rootEnv.VITE_TURNSTILE_SITE_KEY ?? ""),
      "import.meta.env.VITE_MAP_STYLE_URL": JSON.stringify(rootEnv.VITE_MAP_STYLE_URL ?? ""),
      "import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN": JSON.stringify(rootEnv.VITE_MAPILLARY_ACCESS_TOKEN ?? ""),
    },
    plugins: [react(), tailwind()],
    server: {
      port: 5173,
      strictPort: true, // fail instead of silently moving to 5174 (would break WEB_ORIGIN)
      proxy: {
        // Keep local API calls same-origin and match the API's configured development origin.
        "/admin/login": { target: "http://localhost:4000", changeOrigin: false },
        "/api/v1": { target: "http://localhost:4000", changeOrigin: false, headers: { origin: "http://localhost:5173" } },
      },
    },
  };
});
