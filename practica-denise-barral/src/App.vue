<!--
App.vue — Componente raíz y "layout" general de la app.
Arma la estructura que se repite en todas las páginas (dentro de un div con grid): nav arriba, <main> con el <RouterView /> en el
medio (donde el router dibuja la página de la URL actual) y footer abajo.
Además tiene lógica: se suscribe al observer de autenticación de services/auth.js para saber si hay un
usuario logueado, y según eso la nav muestra unos links u otros. También maneja el logout.
No habla con Supabase directamente: todo lo de autenticación lo hacen las funciones de services/auth.js.
-->
<!-- 
Los SFC (Single File Components) se diseñaron para poder contener todo lo que hace a un componente:
- Lógica
- Semántica
- Estilización

Para esto, define 3 posibles bloques para usar de base:
- <script>
- <template>
- <style>

Solo ese necesario tener o <script> o <template>. El resto es opcional dependiendo de lo que necesitemos.
-->
<script>
// Sin extensión ".js": Vite la completa solo. (En otros archivos se escribe con ".js"; las dos formas andan.)
import { logout, subscribeToAuthStateChange } from './services/auth';

export default {
    name: 'App',
    data() {
        return {
            // Datos del usuario autenticado, si lo hay.
            // Arranca con null en los dos campos = "no hay nadie logueado". El template usa user.id !== null
            // para decidir qué links mostrar, así que con solo cambiar este objeto la nav se actualiza sola
            // (reactividad).
            user: {
                id: null,
                email: null,
            }
        }
    },
    methods: {
        // Se ejecuta con el submit del form del botón "Cerrar sesión" (@submit.prevent="handleLogout").
        // No hace falta limpiar this.user acá: al cerrar sesión, el servicio de auth se entera (por
        // onAuthStateChange), vacía sus datos y notifica a sus observers; el de mounted() pone el usuario en
        // null y la nav cambia sola.
        // OJO: falta el "async" en el método y el "await" delante de logout(). Sin await:
        //   - si signOut falla, el throw de logout() no cae en este catch ("Uncaught (in promise)");
        //   - el push('/ingresar') se ejecuta ANTES de que se termine de cerrar la sesión.
        // Versión correcta: async handleLogout() { try { await logout(); this.$router.push('/ingresar'); } ... }
        handleLogout() {
            try {
                logout();

                // Después de cerrar sesión, mandamos al usuario al login (redirección desde código).
                this.$router.push('/ingresar');
            } catch (error) {
                // TODO...
            }
        }
    },
    mounted() {
        /*
            Nos suscribimos como "observer" del estado de autenticación (patrón Observer de services/auth.js).
            El callback se ejecuta:
                - apenas nos suscribimos, con los datos actuales del usuario;
                - y cada vez que esos datos cambian (login, logout, o cuando termina de cargar el perfil).
            Arrow function: así "this" sigue siendo el componente. El callback recibe una COPIA de los datos
            del usuario ({ id, email, bio, display_name, career }) y la guardamos en el state.
        */
        subscribeToAuthStateChange(userData => this.user = userData);
    }
}
</script>

<template>
    <!--
        # Esqueleto de la app (nivel 1 de la guía de estilos, ver estilizacion.md)
        Este div envuelve todo para armar el layout con grid:
            min-h-dvh
                => como mínimo ocupa todo el alto visible de la pantalla
                   (dvh descuenta la barra del navegador en celulares).
            grid grid-rows-[auto_1fr_auto]
                => 3 filas: la nav mide lo que mide su contenido (auto), el <main> se queda con todo
                   el espacio que sobra (1fr) y el footer mide lo que mide (auto).
        Resultado: aunque la página tenga poco contenido, el footer queda siempre abajo de la pantalla.
        (El profe lo resuelve con clases en el div#app de index.html; la guía de estilos pide dejar #app
        sin clases y poner el esqueleto acá.)
    -->
    <div class="min-h-dvh grid grid-rows-[auto_1fr_auto]">
        <!-- 
            # Clases de Tailwind
            Tailwind, como dijimos, se basa en estilizar los elementos desde el HTML con clases de utilidad.
        
            ## Nomenclatura de nombres de clases en Tailwind
            En general, los nombres de las clases caen en uno de dos formatos.

            1. Combinación de "estilo-valor"
            Estas clases tienen siempre al menos 1 "-", y empiezan diciendo qué estilo es el que modifican,
            y después qué valor le asignan.
            Por ejemplo:
                .p-4            => padding: 1rem;
                .mb-2           => margin-bottom: .5rem;
                .text-center    => text-align: center;

            Noten que Tailwind utiliza "rem".
            rem => root em  => Valor "em" del elemento raíz.
            Es una unidad de tamaño relativa de CSS que representa un múltiplo del tamaño de base de la
            tipografía del elemento raíz.
            Para cuentas, se suele considerar que 1rem ~= 16px
            Esta unidad de medida debería usar siempre, al menos, para tipografías.
            Pero es muy común verla con elementos afines, como los tamaños de bloques o separaciones.
            Noten también que el número en la clase de estos estilos es un múltiplo de ".25rem".
        -->
        <!--
            Clases de la nav:
                flex items-center   => logo y lista en fila, centrados verticalmente.
                gap-8               => 2rem (8 * .25rem) de separación entre el logo y la lista.
                h-15                => alto de 3.75rem (60px).
                p-4                 => 1rem de padding en los 4 lados.
                bg-slate-600        => color de fondo (paleta "slate", tono 600).
                text-white          => color de letra blanco.
            La nav y el footer están FUERA del <RouterView />, por eso se ven en todas las páginas.
        -->
        <nav class="flex items-center gap-8 h-15 p-4 bg-slate-600 text-white">
            <RouterLink class="text-xl" to="/">DV Social</RouterLink>
            <ul class="flex gap-4">
                <!-- 
                    RouterLink permite crear un link que se integre con el sistema de routeo.
                    Esto genera una etiqueta <a>, pero programada para que en vez de acceder a la URL que
                    le corresponde (lo que implica redireccionar y refrescar la página), va a cargar el 
                    contenido con JS, Vue y Vue Router.
                    Esto es lo que nos permite hacer que nuestra aplicación funcione como una SPA (Single-Page
                    Application).

                    La diferencia más notoria de <RouterLink> con respecto a <a>, es que en vez del atributo
                    "href", usamos el atributo "to".
                -->
                <li><RouterLink to="/">Home</RouterLink></li>
                <!--
                    # Renderizado condicional: v-if / v-else
                    v-if="condición" dibuja el elemento SOLO si la condición es verdadera; si es falsa, el elemento
                    directamente no existe en el DOM. v-else tiene que ir inmediatamente después del v-if y se
                    dibuja cuando la condición es falsa.
                    (Existe también v-show, que siempre dibuja el elemento y solo lo oculta con display: none.)

                    ¿Por qué <template> y no un <div>? <template> es una etiqueta "invisible" de Vue: agrupa varios
                    elementos para aplicarles un v-if juntos, pero no genera ninguna etiqueta en el HTML final.
                    Con un <div> quedaría un <div> adentro del <ul>, que no es HTML válido (un <ul> solo puede
                    tener <li> como hijos).

                    user.id !== null => hay un usuario logueado (ver data() y mounted() en el script).
                    Logueada: Chat, Mi perfil y Cerrar sesión. Sin loguear: Ingresar y Crear cuenta.
                    Esto solo OCULTA los links. Lo que impide entrar escribiendo /chat en la URL es el guard
                    beforeEach de router/router.js (que usa el meta.requiresAuth de cada ruta).
                -->
                <template v-if="user.id !== null">
                    <li><RouterLink to="/chat">Chat público</RouterLink></li>
                    <li><RouterLink to="/mi-perfil">Mi perfil</RouterLink></li>
                    <li>
                        <!--
                            El logout es un form con un botón (y no un link) porque es una ACCIÓN que cambia algo
                            (cierra la sesión), no una navegación a otra página.
                        -->
                        <form
                            action="#"
                            @submit.prevent="handleLogout"
                        >
                            <!-- Interpolación: el botón muestra el email del usuario logueado. -->
                            <button type="submit">{{ user.email }} (Cerrar sesión)</button>
                        </form>
                    </li>
                </template>
                <template v-else>
                    <li><RouterLink to="/ingresar">Ingresar</RouterLink></li>
                    <li><RouterLink to="/crear-cuenta">Crear cuenta</RouterLink></li>
                </template>
            </ul>
        </nav>
        <main class="container mx-auto p-4">
            <!-- 
                RouterView es el componente de Vue Router donde se va a volcar el componente que corresponde
                a la ruta a la que se está ingresando.
            -->
            <RouterView />
        </main>
        <!-- flex + justify-center + items-center => el texto queda centrado horizontal y verticalmente. h-25 = 100px. -->
        <footer class="flex justify-center items-center h-25 bg-gray-800 text-white">
            <p>Da Vinci &copy; 2026</p>
        </footer>
    </div>
</template>

<!-- <style></style> -->
