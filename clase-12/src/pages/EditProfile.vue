<script>
import BaseH1 from '../components/BaseH1.vue';
import { subscribeToAuthStateChange, updateAuthUserProfile } from '../services/auth.js';

export default {
    name: 'EditProfile',
    components: { BaseH1, },
    data() {
        return {
            profile: {
                bio: '',
                display_name: '',
                career: '',
            },
            loading: false,
        }
    },
    methods: {
        async handleSubmit() {
            try {
                this.loading = true;
                await updateAuthUserProfile(this.profile);
            } catch (error) {
                // ...
            } finally {
                this.loading = false;
            }
        },
    },
    mounted() {
        subscribeToAuthStateChange(userData => {
            this.profile = {
                bio: userData.bio,
                display_name: userData.display_name,
                career: userData.career,
            }
        });
    }
}
</script>

<template>
    <BaseH1>Actualizar mi información de perfil</BaseH1>

    <form 
        action="#"
        @submit.prevent="handleSubmit"
    >
        <div class="mb-3">
            <label class="block mb-2" for="bio">Biografía</label>
            <textarea
                id="bio"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="profile.bio"
            ></textarea>
        </div>
        <div class="mb-3">
            <label class="block mb-2" for="display_name">Nombre de usuario</label>
            <input
                type="text"
                id="display_name"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="profile.display_name"
            >
        </div>
        <div class="mb-3">
            <label class="block mb-2" for="career">Carrera</label>
            <input
                type="text"
                id="career"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="profile.career"
            >
        </div>
        <button type="submit" class="transition px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-600">Guardar cambios</button>
    </form>
</template>