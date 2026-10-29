<!--
Login.vue — Página para ingresar a la cuenta (ruta "/ingresar").
Tiene el formulario de login (email + contraseña) y llama al servicio de autenticación.
NO habla con Supabase directamente: eso lo hace login() en services/auth.js.
Tampoco actualiza la nav: de eso se entera App.vue solo, gracias al observer de services/auth.js.
Si el login sale bien, redirige al chat.
-->
<script>
import BaseH1 from '../components/BaseH1.vue';
import { login } from '../services/auth.js';

/*
    En la API de Options, el componente ES este objeto de configuración: cada propiedad es una "opción".
    - name: nombre del componente. Es opcional, pero aparece en los warnings de Vue y en Vue DevTools.
    - components: registra los componentes que se usan en el <template>. Importar no alcanza: si no se
        registra acá, Vue tira "Failed to resolve component: BaseH1".
*/
export default {
    name: 'Login',
    components: { BaseH1, },
    data() {
        return {
            // Datos del formulario, conectados a los inputs con v-model.
            user: {
                email: '',
                password: '',
            },
            // Indica si hay una petición en curso (true al enviar, false al terminar).
            // OJO: por ahora no se usa en el template. Serviría para deshabilitar el botón mientras se
            // procesa (:disabled="loading") y evitar que se envíe dos veces.
            loading: false,
        }
    },
    methods: {
        // Se ejecuta con el submit del form (@submit.prevent="handleSubmit").
        async handleSubmit() {
            try {
                this.loading = true;

                // Acá SÍ está el await: si login() hace throw (credenciales incorrectas), cae en el catch.
                // Si sale bien, Supabase guarda la sesión y dispara onAuthStateChange: el servicio de auth
                // actualiza sus datos y avisa a sus observers (App.vue entre ellos), y la nav cambia sola.
                await login({
                    email: this.user.email,
                    password: this.user.password,
                });
                /*
                    # Redireccionamiento desde código
                    Para redireccionar necesitamos usar el método "push" del objeto Router.
                    ¿De dónde sacamos el Router?
                    En un proyecto que esté usando Vue Router, automáticamente vamos a tener a
                    disposición en todos los componentes una propiedad especial llamada "$router"
                    con el Router.
                    push('/chat') agrega /chat al historial y navega ahí (como un <RouterLink to="/chat">,
                    pero desde JS). Solo se llega a esta línea si login() no hizo throw.
                */
                this.$router.push('/chat');
            } catch (error) {
                // TODO...
                // Acá llega el error de login() (por ejemplo "Invalid login credentials"). Se podría mostrar
                // en pantalla guardándolo en el state.
            }
            // Fuera del try/catch para que se ejecute siempre, haya salido bien o mal (o en un finally { }).
            this.loading = false;
        }
    }
}
</script>

<template>
    <BaseH1>Ingresar a mi cuenta</BaseH1>

    <form 
        action="#"
        @submit.prevent="handleSubmit"
    >
        <div class="mb-3">
            <label class="block mb-2" for="email">Email</label>
            <input
                type="email"
                id="email"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="user.email"
            >
        </div>
        <div class="mb-3">
            <label class="block mb-2" for="password">Contraseña</label>
            <!-- type="password" oculta lo que se escribe en pantalla. -->
            <input
                type="password"
                id="password"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="user.password"
            >
        </div>
        <button type="submit" class="transition px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-600">Ingresar</button>
    </form>
</template>