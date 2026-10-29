<!--
Register.vue — Página para crear una cuenta nueva (ruta "/crear-cuenta").
Tiene el formulario de registro (email + contraseña) y llama al servicio de autenticación.
NO habla con Supabase directamente: eso lo hace register() en services/auth.js.
Si el registro sale bien, redirige al chat. Todavía no muestra los errores en pantalla.
(El perfil del usuario lo crea register() en el servicio, no esta página.)
-->
<script>
import BaseH1 from '../components/BaseH1.vue';
import { register } from '../services/auth.js';

export default {
    name: 'Register',
    components: { BaseH1, },
    data() {
        return {
            // Datos del formulario, conectados a los inputs con v-model.
            user: {
                email: '',
                password: '',
            },
            // Indica si hay una petición en curso. Se pone en true al enviar y en false al terminar.
            // OJO: por ahora no se usa en el template. La idea es usarlo para, por ejemplo, deshabilitar el
            // botón mientras se procesa (:disabled="loading") y evitar que se envíe dos veces.
            loading: false,
        }
    },
    methods: {
        // Se ejecuta con el submit del form (@submit.prevent="handleSubmit").
        async handleSubmit() {
            try {
                this.loading = true;

                // register() crea el usuario en Supabase Auth Y su fila en la tabla user_profiles.
                await register({
                    email: this.user.email,
                    password: this.user.password,
                });

                // Redireccionamos al chat. this.$router es el router que registramos con app.use(router):
                // Vue Router lo deja disponible en todos los componentes. Solo se llega a esta línea si
                // register() no hizo throw (gracias al await).
                this.$router.push('/chat');
            } catch (error) {
                // TODO...
                // Acá llega el "throw new Error(error.message)" de register() si Supabase rechaza el registro
                // (por ejemplo, email ya registrado o contraseña muy corta). Se podría mostrar en pantalla.
            }
            // Va DESPUÉS del try/catch para que se ejecute siempre, haya salido bien o mal.
            // (Otra forma de lograr lo mismo es ponerlo en un bloque finally { }.)
            this.loading = false;
        }
    }
}
</script>

<template>
    <BaseH1>Crear una nueva cuenta</BaseH1>

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
            <!-- type="password" oculta lo que se escribe. Supabase exige por defecto un mínimo de 6 caracteres. -->
            <input
                type="password"
                id="password"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="user.password"
            >
        </div>
        <button type="submit" class="transition px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-600">Crear cuenta</button>
    </form>
</template>