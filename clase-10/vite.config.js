/*
Como todos los archivos [.config.js] necesitamos exportar por default el objeto de configuración.

Para agregar el plugin de Vue primero lo importamos, y luego se lo pasamos al array de plugins.
*/
import vue from '@vitejs/plugin-vue';
import tailwind from '@tailwindcss/vite';

export default {
    // Noten los paréntesis. Los plugins generalmente son funciones.
    plugins: [vue(), tailwind()],
}