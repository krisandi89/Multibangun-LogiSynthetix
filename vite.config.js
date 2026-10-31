import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    noDiscovery: true,
    include: [
      "react",
      "react-dom/client",
      "react/jsx-runtime",
      "lucide-react",
      "leaflet",
    ],
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT) || 4173,
    strictPort: true,
  },
});
