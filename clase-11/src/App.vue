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
import { logout, subscribeToAuthStateChange } from './services/auth';

export default {
    name: 'App',
    data() {
        return {
            // Datos del usuario autenticado, si lo hay.
            user: {
                id: null,
                email: null,
            }
        }
    },
    methods: {
        handleLogout() {
            try {
                logout();
                
                this.$router.push('/ingresar');
            } catch (error) {
                // TODO...
            }
        }
    },
    mounted() {
        subscribeToAuthStateChange(userData => this.user = userData);
    }
}
</script>

<template>
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
            
            <template v-if="user.id !== null">
                <li><RouterLink to="/chat">Chat público</RouterLink></li>
                <li><RouterLink to="/mi-perfil">Mi perfil</RouterLink></li>
                <li>
                    <form 
                        action="#"
                        @submit.prevent="handleLogout"
                    >
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
    <footer class="flex justify-center items-center h-25 bg-gray-800 text-white">
        <p>Da Vinci &copy; 2026</p>
    </footer>
</template>

<!-- <style></style> -->