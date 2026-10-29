<!--
Home.vue — Página de inicio (ruta "/").
Por ahora solo muestra el título de bienvenida usando el componente BaseH1.
-->
<script>
import BaseH1 from '../components/BaseH1.vue';

/*
    En la API de Options, el componente ES este objeto de configuración: cada propiedad es una "opción".
    - name: nombre del componente. Es opcional, pero aparece en los warnings de Vue y en Vue DevTools.
    - components: registra los componentes que se usan en el <template>. Importar no alcanza: si no se
        registra acá, Vue tira "Failed to resolve component: BaseH1".
        { BaseH1, } es el shorthand de { BaseH1: BaseH1 }.
*/
export default {
    name: 'Home',
    components: { BaseH1, },
}
</script>

<template>
    <BaseH1>¡Les damos la bienvenida a DV Social!</BaseH1>
</template>