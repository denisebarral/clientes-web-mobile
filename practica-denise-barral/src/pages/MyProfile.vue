<!--
MyProfile.vue — Página "Mi perfil" (ruta "/mi-perfil", solo para usuarios logueados: meta.requiresAuth).
Muestra los datos del usuario autenticado: email (de Supabase Auth) y bio, nombre de usuario y carrera
(de la tabla user_profiles).
NO consulta Supabase: recibe los datos ya armados suscribiéndose al observer de services/auth.js.
Por ahora solo muestra; editar el perfil está en los TODO del profe.
-->
<script>
import BaseH1 from '../components/BaseH1.vue';
import { subscribeToAuthStateChange } from '../services/auth.js';

export default {
    name: 'MyProfile',
    components: { BaseH1, },
    data() {
        return {
            // Misma forma que el userData del servicio de auth. Arranca vacío y se completa en mounted().
            user: {
                id: null,
                email: null,
                bio: null,
                display_name: null,
                career: null,
            }
        }
    },
    mounted() {
        // Nos suscribimos al observer del servicio de auth: recibimos los datos del usuario apenas nos
        // suscribimos y cada vez que cambian. Esto es importante porque el perfil se carga "en paralelo":
        // primero puede llegar solo el id y el email, y un momento después la bio, el nombre y la carrera.
        // OJO: no hay forma de desuscribirse. Cada vez que entrás a esta página se suma un observer nuevo
        // al servicio, y los de las visitas anteriores siguen en la lista aunque el componente ya no exista.
        subscribeToAuthStateChange(userData => this.user = userData);
    },
}
</script>

<template>
    <BaseH1>Mi perfil</BaseH1>

    <!--
        ?? es el operador "nullish coalescing" de JS: si lo de la izquierda es null o undefined, usa lo de la
        derecha. Así, si el usuario no cargó su bio, se muestra "Sin especificar..." en vez de nada.
        (A diferencia de ||, ?? no reemplaza valores como "" o 0: solo null y undefined.)
    -->
    <div class="p-4 mb-4">{{ user.bio ?? 'Sin especificar...' }}</div>
    <RouterLink to="/mi-perfil/editar" class="mb-4 text-blue-700 underline">Editar</RouterLink>

    <!--
        <dl> (description list) es la etiqueta semántica para pares "término: descripción".
        <dt> es el término (la etiqueta del dato) y <dd> su descripción (el valor).
        mb-0.5 => margen inferior de .125rem (la escala de Tailwind también acepta medios).
        ps-2   => padding-inline-start: padding del lado donde empieza el texto (a la izquierda en español).
    -->
    <dl>
        <dt class="mb-0.5 font-bold">Email</dt>
        <dd class="ps-2 mb-2">{{ user.email }}</dd>
        <dt class="mb-0.5 font-bold">Nombre de usuario</dt>
        <dd class="ps-2 mb-2">{{ user.display_name ?? 'Sin especificar...' }}</dd>
        <dt class="mb-0.5 font-bold">Carrera</dt>
        <dd class="ps-2 mb-2">{{ user.career ?? 'Sin especificar...' }}</dd>
    </dl>
</template>
