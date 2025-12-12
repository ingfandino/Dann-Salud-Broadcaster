// frontend/vite.config.js

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            motion: ["framer-motion"],
            toast: ["react-toastify"],
            xlsx: ["xlsx"],
            emoji: ["@emoji-mart/react", "@emoji-mart/data"],
            socket: ["socket.io-client"],
            vendor: ["axios", "file-saver", "lucide-react"],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: env.VITE_API_URL || "http://localhost:5000",
          ws: true,
        },
      },
    },
  };
});