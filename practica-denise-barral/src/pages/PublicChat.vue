<!--
PublicChat.vue — Página del chat público global (ruta "/chat").
Se encarga de la PANTALLA: guarda los mensajes en el state, los muestra y maneja el formulario.
NO habla con Supabase directamente: para eso llama a las funciones del servicio services/public-chat.js
(separación de responsabilidades). Si mañana cambiamos de backend, este componente no se toca.
-->
<script>
import BaseH1 from '../components/BaseH1.vue';
// Para saber quién es el usuario logueado (su id y su email van en cada mensaje que manda).
import { subscribeToAuthStateChange } from '../services/auth.js';
// Importamos solo las funciones del servicio que necesitamos (son exports con nombre, por eso van entre llaves).
import { getLastPublicChatMessages, sendPublicChatMessages, subscribeToNewPublicChatMessages } from '../services/public-chat.js';


export default {
    name: 'PublicChat',
    components: { BaseH1, },
    /*
        data es la propiedad de los componentes de Vue que nos permite definir el "state" del componente.
        En Vue el "state" hace referencia específicamente a los valores propios del componente (no propiedades
        que reciba) que pueden variar con el tiempo.
        Todos los valores del "state" son automáticamente "reactivos". Esto significa que interactúan con el
        sistema de reactividad de Vue.
        Cuando algún valor del "state" cambie, Vue reacciona y actualiza todo lo que depende de ese valor,
        como el <template> o propiedades computadas.

        data debe ser una función que retorne un objeto con el valor inicial del state.
    */
    data() {
        return {
            user: {
                id: null,
                email: null,
                bio: null,
                display_name: null,
                career: null,
            },
            // Arranca vacío: los mensajes se cargan en mounted() (los guardados) y por Realtime (los nuevos).
            messages: [],

            newMessage: {
                body: '',
            },
        }
    },
    /*
        methods nos permite definir funciones para el componente.
        Estas funciones van a estar disponibles tanto en el <template> como en la instancia del componente.
    */
    methods: {
        // Se ejecuta con el submit del form (@submit.prevent="handleMessageSend").
        // No hace push del mensaje a la lista: el mensaje aparece cuando llega por Realtime (ver mounted()).
        async handleMessageSend() {
            try {
                // El "await" es clave: espera a que el mensaje se guarde antes de seguir.
                // Sin await, el textarea se vaciaría antes de saber si el mensaje se guardó, y si el
                // servicio hace "throw", ese error NO caería en este catch (quedaría como
                // "Uncaught (in promise)" en la consola).
                await sendPublicChatMessages({
                    sender_id: this.user.id,
                    email: this.user.email,
                    body: this.newMessage.body,
                });

                // Solo llegamos acá si se guardó bien: si hubo error, el throw salta directo al catch
                // y el texto queda en el textarea para poder reintentar.
                this.newMessage.body = "";
            } catch (error) {
                // TODO...
                // Acá se podría mostrar un mensaje de error en pantalla (por ejemplo, guardándolo en el state).
            }
        },
    },
    /*
        mounted() es la función del ciclo de vida de Vue que se ejecuta cuando el componente
        es montado en el DOM.
        Es el lugar ideal para la carga inicial de valores.
    */
    async mounted() {
        // try/catch: los servicios hacen "throw new Error(...)" si Supabase devuelve un error, y como acá
        // SÍ usamos await, ese error cae en el catch.
        try {

            subscribeToAuthStateChange(userData => this.user = userData);

            // Cargamos los últimos mensajes del chat público, los que se enviaron antes de que el usuario abra la página (están ya en la base de datos).
            this.messages = await getLastPublicChatMessages();
            // Segundo, nos suscribimos a los nuevos mensajes del chat público, para que se rendericen en tiempo real. La función subscribeToNewPublicChatMessages recibe un callback que se ejecuta cada vez que llega un nuevo mensaje.  
            // Le pasamos una arrow function como callback: el servicio la llama con cada mensaje nuevo.
            // Al ser arrow function, "this" sigue siendo el componente, y el push dispara la reactividad.
            subscribeToNewPublicChatMessages(
                newMessageData => this.messages.push(newMessageData)
            );
        } catch (error) {
            // ...
        }

        // TODO: Auth.
    }
}
</script>

<template>
    <BaseH1>Chat público global</BaseH1>
    
    <!--
        # Layout responsive (mobile first)
        En Tailwind, una clase sin prefijo aplica SIEMPRE, y una con prefijo "md:" aplica desde 768px en adelante.
        - En celular: las dos <section> quedan una abajo de la otra (comportamiento normal de bloques).
        - Desde md (768px): md:flex las pone lado a lado, md:w-3/4 y md:w-1/4 reparten el ancho (75% / 25%)
            y md:gap-4 las separa 1rem.
        mb-8 md:mb-0 => en celular separamos los mensajes del form con margen; desde md ya no hace falta
        porque están lado a lado y los separa el gap.
        min-h-100 => alto mínimo (25rem) para que la caja no colapse cuando no hay mensajes.
    -->
    <div class="md:flex md:gap-4">
        <section class="md:w-3/4 min-h-100 p-4 mb-8 md:mb-0 border rounded">
            <!--
                sr-only ("screen reader only") oculta el título visualmente, pero lo deja disponible para
                los lectores de pantalla. Así la sección tiene un título accesible sin que se vea en el diseño.
                No es lo mismo que "hidden" (display: none), que lo oculta también para los lectores.
            -->
            <h2 class="sr-only">Lista de mensajes</h2>

             <!--
                flex flex-col => los mensajes uno abajo del otro, separados por gap-2.
                items-start   => cada mensaje ocupa solo el ancho de su contenido (no se estira a todo el ancho).
             -->
             <ol class="flex flex-col gap-2 items-start">
                <!-- 
                    # v-for 
                    v-for es una directiva de Vue.
                    Las directivas son atributos que podemos agregar en etiquetas del <template>
                    y que agregan funcionalidades o comportamientos al elemento.
                    Por ejemplo, v-for permite repetir el elemento en el que está por cada uno de
                    los elementos de una secuencia (generalmente, un array).

                    # :key
                    ":key" es la forma corta de "v-bind:key". v-bind (o ":") hace que el valor del atributo
                    sea una expresión de JS en lugar de un texto fijo (acá, el id de cada mensaje).
                    key le da a cada elemento del v-for una identidad única. Vue la usa para saber qué
                    elemento es cuál cuando la lista cambia, y así actualizar solo lo necesario.
                    Tiene que ser un valor único y estable: el id de la base de datos es ideal.
                    (Es lo mismo que la prop "key" en un .map() de React.)
                -->
                <li
                    v-for="message in messages"
                    :key="message.id"
                    class="p-4 rounded bg-gray-100"
                >
                    <div class="mb-1">
                        <!-- 
                            # Atributos con valores de JS con v-bind
                            En Vue los valores de todos los atributos de las etiquetas son siempre strings, 
                            como dicta la especificación de HTML.

                            Dicho esto, Vue tiene una herramienta que nos permite modificar esto, y hacer
                            que el valor de un atributo de una etiqueta se genere a través de una expresión
                            de JS. Esto incluye uso de valores constantes, variables, funciones, operaciones,
                            etc. Además de tener, también, acceso a las propiedades y a los métodos del
                            componente.

                            Esta herramienta es la directiva v-bind.
                            Su sintaxis es:
                                v-bind:atributo="expresionJS"

                            Por ejemplo, si tenemos algo como:
                                <a v-bind:href="'saraza' + 10"></a>

                            Esto genera:
                                <a href="saraza10"></a>
                            
                            Como el v-bind es de uso muy frecuente en Vue, tenemos la sintaxis simplificada:
                                :atributo

                            Por ejemplo:
                                <a :href="'saraza' + 10"></a>
                        -->
                        <RouterLink
                            :to="'/usuario/' + message.sender_id"
                            class="text-blue-700 underline"
                        >
                            <span class="font-bold">{{ message.email }}</span> 
                        </RouterLink>
                        <span class="font-bold">{{ message.email }}</span> 
                        dijo:
                    </div>
                    <div class="mb-1">{{ message.body }}</div>
                    <div class="text-sm text-gray-900">{{ message.created_at }}</div>
                </li>
             </ol>
        </section>
        <section class="md:w-1/4">
            <h2 class="mb-4 text-xl">Enviar un mensaje</h2>

            <!-- 
                # Eventos con Vue
                Para agregar eventos en los elementos del <template> podemos usar la directiva v-on,
                que debe incluir el evento que se quiere escuchar.
                Por ejemplo:
                    v-on:click
                    v-on:input
                    v-on:submit

                Como valor debemos asignar el código que queremos se ejecute. Generalmente, le vamos
                a pasar una función.

                Alternativamente, Vue soporta para mayor comodidad una sintaxis alternativa que es:
                    @evento
                
                Por ejemplo:
                    @click
                    @input
                    @submit

                Adicionalmente, los eventos de Vue aceptan "modificadores", como ".prevent" o ".once" o
                ".stop".
                Estos modificadores agregan algún requisito extra al evento que Vue puede manejar por
                nosotros.
                Por ejemplo, el ".prevent" agrega automáticamente el preventDefault().
            -->
            <form 
                action="#"
                @submit.prevent="handleMessageSend"
            >
                <div class="mb-3">
                    <label class="block mb-2" for="body">Mensaje</label>
                       <!-- 
                        # v-model
                        Esta directiva permite asociar un valor del state a un control de form.
                        Esto lo hace a través de crear lo que conocemos como "two-way data binding"
                        (vinculación de datos bidireccional).
                        "Two-way data binding" es un técnica que permite dejar en manos del framework
                        la sincronización del valor del state y del control del form.
                        Esto significa que si el usuario cambia el valor del control del form, Vue actualiza
                        automáticamente el valor del state.
                        Mientras que si programáticamente modificamos el valor del state, Vue actualiza
                        el control del form.
                    -->
                    <textarea
                        id="body"
                        class="w-full p-2 border border-gray-600 rounded"
                        v-model="newMessage.body"
                    ></textarea>
                </div>
                <!--
                    hover:bg-blue-600 => el prefijo "hover:" aplica la clase solo cuando el mouse está encima.
                    transition        => hace que ese cambio de color sea suave y no de golpe.
                -->
                <button type="submit" class="transition px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-600">Enviar</button>
            </form>
        </section>
    </div>
</template>