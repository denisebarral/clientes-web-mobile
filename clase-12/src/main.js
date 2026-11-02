/*
# Creando la aplicación de Vue
Para crear la aplicación necesitamos 3 cosas:
- Importar la función "createApp" del core de Vue.
- Tener un componente raíz.
- Tener un elemento de HTML con un id donde poder montar la aplicación.
*/
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/router.js";
import './style.css';

// Creamos la aplicación.
const app = createApp(App);

// Agregamos el router a Vue.
app.use(router);

// Montamos la aplicación en el div#app
app.mount('#app');