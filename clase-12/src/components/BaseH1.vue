<template>
    <!-- <h1 class="mb-4 text-3xl"> -->
    <h1 class="h1">
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