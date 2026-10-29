<script>
import BaseH1 from '../components/BaseH1.vue';
import { login } from '../services/auth.js';

export default {
    name: 'Login',
    components: { BaseH1, },
    data() {
        return {
            user: {
                email: '',
                password: '',
            },
            loading: false,
        }
    },
    methods: {
        async handleSubmit() {
            try {
                this.loading = true;

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
                */
                this.$router.push('/chat');
            } catch (error) {
                // TODO...
            }
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