/*
[router/router.js]
Acá vamos a definir nuestro router.
Vue Router es un router basado en configuración, por lo que vamos a necesitar definir las rutas desde
código. Esto contrasta con otros sistemas de routeo, como los routeos basados en archivos.
*/
import { createRouter, createWebHistory } from "vue-router";
import { subscribeToAuthStateChange } from "../services/auth.js";
import Home from "../pages/Home.vue";
import PublicChat from "../pages/PublicChat.vue";
import Login from "../pages/Login.vue";
import Register from "../pages/Register.vue";
import MyProfile from "../pages/MyProfile.vue";
import EditProfile from "../pages/EditProfile.vue";
import UserProfile from "../pages/UserProfile.vue";

// Definimos la lista de rutas.
// Esto es un array de objetos, donde cada objeto representa una ruta y sus características.
// Por lo menos, una ruta va a tener una URL (que se toma a partir de la raíz del sitio) y un
// componente a renderizar cuando se acceda a esa URL.
// Las rutas tienen una propiedad "meta" es un objeto que nos permite agregar cualquier meta-data
// arbitraria que queramos asociar a la ruta.
// No tiene propiedades predefinidas. Las creamos arbitrariamente.
const routes = [
    { path: '/',                    component: Home, },
    { path: '/ingresar',            component: Login, },
    { path: '/crear-cuenta',        component: Register, },
    { path: '/chat',                component: PublicChat,      meta: { requiresAuth: true, }, },
    { path: '/mi-perfil',           component: MyProfile,       meta: { requiresAuth: true, }, },
    { path: '/mi-perfil/editar',    component: EditProfile,     meta: { requiresAuth: true, }, },
    // :param nos permite definir un parámetro de ruta. Es decir, un segmento dinámico que puede ser X
    // valor y que luego podamos capturar y usar.
    { path: '/usuario/:id',         component: UserProfile,     meta: { requiresAuth: true, }, },
];

// El siguiente paso va a ser crear el router con createRouter().
// Esta función recibe un parámetro que es un objeto de configuración.
// Ese objeto va a recibir al menos 2 datos:
// routes => La lista de rutas.
// history => Indica cómo Vue Router debe manejar el historial de la aplicación.
//  Este valor siempre va a ser uno de createWebHistory() o createWebHashHistory().
const router = createRouter({
    routes,
    history: createWebHistory(),
});

/*
    # Restringiendo el acceso a rutas con Vue Router
    Primero, necesitamos identificar de alguna manera las rutas que requieren que el usuario esté
    autenticado para permitirle ingresar.
    La forma más simple y directa de hacer esto es aprovechar la propiedad "meta" de las rutas.

    Luego, necesitamos que antes de navegar a una ruta que el usuario pide ver, se consulte si
    la ruta requiere que el usuario esté autenticado, y en caso de ser así, se verifique que lo esté.
    Si no está autenticado y la ruta requiere eso, entonces lo redireccionamos al login.

    La forma de Vue Router de resolver este tipo de cosas es a través de sus "navigation guards".
    Estas son funciones que se ejecutan al comienzo de cada navegación, y que pueden controlar si
    la navegación se completa o no.

    Para un caso como este, lo más conveniente es usar el guard global "beforeEach".


    Nota: Como sucede con prácticamente todo lo que vive en el frontend, esta restricción de acceso
    no aporta realmente seguridad a nuestra web. Lo agregamos por razones de "usabilidad".
    Todo lo que tenga que ver con seguridad tiene que involucrar de alguna manera al backend.
    Para proteger la información con Supabase vamos a, más adelante, usar las RLS.
*/
let user = {
    id: null,
    email: null,
}
subscribeToAuthStateChange(userData => user = userData);

router.beforeEach((to, from) => {
    // console.group('Navegación iniciada');
    // console.log("Ruta destino: ", to);
    // console.log("Ruta origen: ", from);
    // console.groupEnd();

    if(to.meta.requiresAuth && user.id === null) {
        // El usuario no está autenticado, y no puede entonces ver esta ruta. Así que lo redireccionamos
        // al login.
        return '/ingresar';
    }
});

export default router;