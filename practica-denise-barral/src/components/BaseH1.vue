<!--
BaseH1.vue — Componente reutilizable para el título principal (h1) de cada página.
Existe para que todos los títulos se vean igual y, si cambia el diseño, se cambie en un solo lugar.
El prefijo "Base" es una convención de Vue para componentes de presentación básicos y reutilizables.
No tiene lógica: solo estructura (<h1>) + estilo (utilidades de Tailwind).
-->
<template>
    <!--
        Las clases van directo acá (y no en una clase propia .h1 con @apply, como hace el profe) porque la
        guía de estilos (estilizacion.md) pide reutilizar con componentes Vue y dejar @apply solo para
        @layer base. El resultado es el mismo: este componente ES el lugar único donde se define el estilo.
            mb-4     => 1rem de margen abajo, para separar el título del contenido.
            text-3xl => 1.875rem (30px) de tamaño de letra (con su interlineado).
        Hace falta ponerlo porque el reset de Tailwind le saca al <h1> el tamaño y el margen del navegador.
    -->
    <h1 class="mb-4 text-3xl">
        <!--
            <slot> es una etiqueta especial que representa el contenido que le pasamos al
            componente al usarlo.
            Por ejemplo:
                <BaseH1>Hola <span>Gatito</span></BaseH1>

            El <slot> sería:
                Hola <span>Gatito</span>
        -->
        <slot />
    </h1>
</template>
