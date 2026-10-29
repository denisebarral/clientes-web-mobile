/*
    Este servicio va a manejar 2 tablas: private_chats y private_chats_messages.

    Nota: Como estamos guardando en la tabla de private_chats los ids de los usuarios desnomarlizados con
    las columnas user_id1 y user_id2 tenemos que tener cuidado de asegurarnos de siempre usar el mismo
    orden de los ids para cada columna.

    Es decir, hay que tener cuidado de evitar lo siguiente.
    Si la conversación es entre, por ejemplo, A (usuario ID 2) y B (usuario ID 7)
    No es lo mismo tener:
        user_id1 = 2
        user_id2 = 7
    
    Que tener:
        user_id1 = 7
        user_id2 = 2

    ¿Cómo podemos forzar el mismo orden?
    La forma más simple es ordenar los ids de menor a mayor.
*/
import { supabase } from "./supabase";

/**
 * 
 * @param {string[]} ids 
 * @returns {string[]}
 */
function sortUserIdsForPrivateChat(ids) {
    return ids.sort();
}

/**
 * 
 * @param {{ sender_id: string, receiver_id: string }} data
 * @returns {Promise<{id: number, user_id1: string, user_id2: string, created_at: string}|null>}
 */
async function getPrivateChatFor({ sender_id, receiver_id }) {
    // Ordenamos los ids.
    const [ userId1, userId2 ] = sortUserIdsForPrivateChat([ sender_id, receiver_id ]);

    const { data, error } = await supabase
        .from('private_chats')
        .select()
        .eq('user_id1', userId1)
        .eq('user_id2', userId2);

    if(error) {
        console.error("Error al buscar el chat privado. ", error);
        throw new Error(error.message);
    }

    return data?.[0];
}

/**
 * 
 * @param {{ sender_id: string, receiver_id: string }} data
 * @returns {Promise<{id: number, user_id1: string, user_id2: string, created_at: string}>}
 */
async function createPrivateChat({ sender_id, receiver_id }) {
    // Ordenamos los ids.
    const [ userId1, userId2 ] = sortUserIdsForPrivateChat([ sender_id, receiver_id ]);

    // Creamos el chat, y obtenemos sus datos.
    const { data, error } = await supabase
        .from('private_chats')
        .insert({
            user_id1: userId1,
            user_id2: userId2,
        })
        // El .select() siguiendo al .insert() retorna el registro creado.
        .select();

    if(error) {
        console.error("Error al crear el chat privado. ", error);
        throw new Error(error.message);
    }

    return data[0];
}

/**
 * 
 * @param {{sender_id: string, receiver_id: string}} data
 * @returns {Promise<{id: number, user_id1: string, user_id2: string, created_at: string}>}
 */
async function getOrCreatePrivateChatFor({ sender_id, receiver_id }) {
    let chat = await getPrivateChatFor({ sender_id, receiver_id });
    
    if(!chat) {
        chat = await createPrivateChat({ sender_id, receiver_id });
    }

    return chat;
}

/**
 * 
 * @param {{sender_id: string, receiver_id: string, body: string}} data
 */
export async function sendPrivateChatMessage({ body, sender_id, receiver_id }) {
    // Para poder insertar un mensaje, necesitamos el chat privado antes.
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    // Ahora sí, insertamos el mensaje.
    const { error } = await supabase
        .from('private_chats_messages')
        .insert({
            chat_id: chat.id,
            sender_id,
            body,
        });

    if(error) {
        console.error("Error al enviar el mensaje del chat privado. ", error);
        throw new Error(error.message);
    }
}

/**
 * 
 * @param {{ sender_id: string, receiver_id: string }} data
 * @returns {Promise<{id: number, chat_id: number, sender_id: string, body: string, created_at: string}[]>}
 */
export async function getLastPrivateChatMessages({ sender_id, receiver_id }) {
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    const { data, error } = await supabase
        .from('private_chats_messages')
        .select()
        .eq('chat_id', chat.id);

    if(error) {
        console.error("Error al traer los mensajes del chat privado. ", error);
        throw new Error(error.message);
    }

    return data;
}

// TODO: Completar el chat privado (suscripción en tiempo real y caché de los chats privados). RLS.