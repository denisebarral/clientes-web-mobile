<script>
import BaseH1 from '../components/BaseH1.vue';
import { subscribeToAuthStateChange } from '../services/auth.js';
import { getLastPrivateChatMessages, sendPrivateChatMessage, subscribeToNewPrivateChatMessages } from '../services/private-chat.js';
import { getUserProfileById } from '../services/user-profiles.js';


let unsubscribeFromChat = () => {}


export default {
    name: 'PrivateChat',
    components: { BaseH1, },
    data() {
        return {
            user: {
                id: null,
                email: null,
                bio: null,
                display_name: null,
                career: null,
            },

            // Datos de nuestro interlocutor
            otherUser: {
                id: null,
                email: null,
                bio: null,
                display_name: null,
                career: null,
            },
            loadingOtherUser: false,

            messages: [],
            loadingMessages: false,

            newMessage: {
                body: '',
            },
        }
    },
    methods: {
        async handleMessageSend() {
            try {
                sendPrivateChatMessage({
                    sender_id: this.user.id,
                    receiver_id: this.otherUser.id,
                    body: this.newMessage.body,
                });
                this.newMessage.body = "";
            } catch (error) {
                throw error;
                // ...
            }
        }
    },
    async mounted() {
        try {
            subscribeToAuthStateChange(userData => this.user = userData);

            this.loadingOtherUser = true;
            this.otherUser = await getUserProfileById(this.$route.params.id);
            this.loadingOtherUser = false;

            // Carga y suscripción de los mensajes...
            this.loadingMessages = true;
            this.messages = await getLastPrivateChatMessages({
                sender_id: this.user.id,
                receiver_id: this.otherUser.id,
            });
            this.loadingMessages = false;

            unsubscribeFromChat = await subscribeToNewPrivateChatMessages({
                sender_id: this.user.id,
                receiver_id: this.otherUser.id,
                callback: newMessage => this.messages.push(newMessage),
            });



        } catch (error) {
            throw error;
            // ...
        }
    },

    unmounted() {
        unsubscribeFromChat();
    }
}
</script>

<template>
    <BaseH1>Conversación privada con {{ otherUser.display_name ?? otherUser.email }}</BaseH1>

    <section class="min-h-100 p-4 mb-4 border rounded">
        <h2 class="sr-only">Lista de mensajes</h2>

            <ol class="flex flex-col gap-2 items-start">
            <li
                v-for="message in messages"
                :key="message.id"
                class="p-4 rounded"
                :class="{
                    'bg-gray-100': message.sender_id !== user.id,
                    'self-end bg-green-100': message.sender_id === user.id,
                }"
            >
                <div class="mb-1">{{ message.body }}</div>
                <div class="text-sm text-gray-900">{{ message.created_at }}</div>
            </li>
            </ol>
    </section>
    <section>
        <h2 class="sr-only">Enviar un mensaje</h2>
        <form 
            action="#"
            class="flex gap-4"
            @submit.prevent="handleMessageSend"
        >
            <label class="sr-only" for="body">Mensaje</label>
            <textarea
                id="body"
                class="w-full p-2 border border-gray-600 rounded"
                v-model="newMessage.body"
            ></textarea>
            <button type="submit" class="transition px-4 py-2 rounded bg-blue-700 text-white hover:bg-blue-600">Enviar</button>
        </form>
    </section>
</template>