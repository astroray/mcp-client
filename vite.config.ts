import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    electron([{
      entry: 'electron/main.ts',
    },
    {
      entry: 'electron/preload.ts',
      onstart(options) {
        options.reload()
      }
    }
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist'
  }
})