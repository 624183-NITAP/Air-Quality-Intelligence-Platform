import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-expect-error Node.js server proxy module
import { handleGeminiProxyRequest } from './server/geminiProxy.js'

function geminiProxyPlugin(): Plugin {
  return {
    name: 'gemini-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/gemini', (req, res) => {
        handleGeminiProxyRequest(req, res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/gemini', (req, res) => {
        handleGeminiProxyRequest(req, res);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    geminiProxyPlugin(),
  ],
})
