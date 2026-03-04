import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(), // Injetamos o motor do Tailwind v4 aqui
    svelte({
      compilerOptions: {
        customElement: true,
      }
    })
  ],
})