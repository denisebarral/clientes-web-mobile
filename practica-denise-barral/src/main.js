/*
    main.js — Punto de entrada de la aplicación (lo carga index.html con <script type="module">).

    Para crear una app de Vue necesitamos 3 cosas:
    1. La función createApp del core de Vue.
    2. Un componente raíz (App.vue).
    3. Un elemento del HTML donde montar la app (el <div id="app"> de index.html).
*/

// "vue" no empieza con "./": se busca como paquete instalado en node_modules.
import { createApp } from 'vue'
// Importar un CSS desde JS es algo que habilita Vite: lo procesa (incluido Tailwind) y lo inyecta en la página.
import './style.css'
// "./App.vue" empieza con "./": es un archivo nuestro, en la misma carpeta que main.js.
import App from './App.vue'
// El router que creamos en router/router.js (lo exporta con "export default", por eso va sin llaves).
import router from './router/router.js'

// Creamos la aplicación con App como componente raíz.
const app = createApp(App);

// app.use() instala un "plugin" en la app. Al instalar el router se registran globalmente los componentes
// <RouterLink> y <RouterView>, y el router empieza a escuchar la URL.
// Si falta esta línea, la consola muestra "Failed to resolve component: RouterLink" y los links no andan.
// Tiene que ir ANTES del mount().
app.use(router);

// Montamos la app: Vue dibuja App.vue dentro del <div id="app">.
app.mount('#app');
