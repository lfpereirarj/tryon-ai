import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        customElement: true,
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js',
        assetFileNames: 'widget.[ext]',
      }
    }
  }
})