import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // 生产环境构建时注入环境变量
  define: {
    "import.meta.env.VITE_WS_URL": JSON.stringify(
      process.env.VITE_WS_URL || "ws://localhost:8080"
    ),
  },
});
