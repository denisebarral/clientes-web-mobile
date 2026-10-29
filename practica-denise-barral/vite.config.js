/*
    vite.config.js — Configuración de Vite (exporta por default el objeto de configuración).

    defineConfig() no cambia nada del funcionamiento: solo "envuelve" el objeto para que VS Code
    autocomplete y muestre ayuda de las opciones de Vite. Exportar el objeto solo (como hace el profe)
    funciona exactamente igual.
*/
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Los plugins son funciones, por eso van con paréntesis.
  plugins: [
    vue(),          // Le enseña a Vite a compilar los archivos .vue
    tailwindcss()   // Integra Tailwind v4 (no hace falta tailwind.config.js)
  ]
})
