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

/*
    # Caché de los chats privados
    Los datos del chat privado (id del chat, los usuarios que participan que son siempre los mismos 2, etc)
    no van a cambiar una vez creados.
    Esto significa que no hay una razón para tener que ir nuevamente a la red a buscar esa información.
    En su lugar, podemos tranquilamente cachear los registros que vamos obteniendo.

    Un caché puede ser cualquier elemento que guarda información en la memoria. Por ejemplo, una simple
    variable.
    Para nuestro ejemplo, vamos a usar un objeto como caché (podría ser un Map o un Set, dependiendo las
    necesidades de cada caso) donde las claves de las propiedades van a ser la unión ordenada de los
    dos ids de los usuarios con un guión bajo.
    Por ejemplo: "userId1_userId2".
    Y los valores serán los objetos con los datos del chat.
*/
let privateChatsCache = {};

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
    // Antes de ir a buscar a la red la conversación, verificamos si no la tenemos en el caché.
    // console.group('Pidiendo el chat privado');
    const cacheKey = sortUserIdsForPrivateChat([ sender_id, receiver_id ]).join('_');
    // console.log('Buscando el chat en el caché...');

    if(privateChatsCache[cacheKey]) {
        // console.log('Conversación encontrada en el caché, retornándola.');
        // console.groupEnd();
        return privateChatsCache[cacheKey];
    }

    // console.log('El chat no se encontró en el caché.');
    // console.log('Buscando el chat en la red...');
    
    let chat = await getPrivateChatFor({ sender_id, receiver_id });
    
    if(!chat) {
        // console.log('Chat no se encontró en la red.');
        // console.log('Creando el chat...');
        chat = await createPrivateChat({ sender_id, receiver_id });
        // console.log('Chat creado.');
    } else {
        // console.log('Chat encontrado en la red.');
    }

    // console.log('Guardando el chat en el caché.');

    privateChatsCache[cacheKey] = chat;

    // console.log('Retornando el chat.');
    // console.groupEnd();

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

/**
 * 
 * @param {{sender_id: string, receiver_id: string, callback: (newMessage: {id: number, chat_id: number, user_id: string, body: string, created_at: string}) => void}} data
 * @returns {Promise<() => void>} Desuscripción
 */
export async function subscribeToNewPrivateChatMessages({ sender_id, receiver_id, callback }) {
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    /*
        # Convención para nombres de canales de realtime
        Supabase nos recomienda seguir la convención de nombre:
            scope:id:entity

        La idea es que vamos a definir qué entidad (entity) es de la que queremos recibir notificaciones,
        y con scope:id vamos a definir el alcance o el ámbito dónde vamos a encontrar a esa entidad.
    */
    const channel = supabase.realtime.channel(`private-chat:${chat.id}:messages`);

    channel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'private_chats_messages',
            // Aclaramos el filtro que queremos que cumplan los registros a recibir.
            // El formato de los filtros es: 
            //  campo=operador.valor
            filter: 'chat_id=eq.' + chat.id,
        },
        payload => {
            callback(payload.new);
        }
    );

    channel.subscribe();

    return () => {
        channel.unsubscribe();
    }
}

// TODO: RLS.