/*
    private-chat.js — Servicio del chat privado entre 2 usuarios.
    Maneja las 2 tablas del chat privado: private_chats (las conversaciones) y private_chats_messages
    (los mensajes de cada conversación).
    Hacia afuera solo exporta 2 funciones: mandar un mensaje y traer los mensajes. Todo lo demás (ordenar
    ids, buscar o crear la conversación) son detalles internos que los componentes no necesitan conocer.
    No sabe nada de la pantalla: no toca el DOM ni el state de ningún componente.

    Mapa de cómo se llaman las funciones entre sí:

        sendPrivateChatMessage ─────┐
                                    ├──► getOrCreatePrivateChatFor ──┬──► getPrivateChatFor ──► sortUserIdsForPrivateChat
        getLastPrivateChatMessages ─┘                                └──► createPrivateChat ──► sortUserIdsForPrivateChat
*/
/*
    Este servicio va a manejar 2 tablas: private_chats y private_chats_messages.

    Nota: Como estamos guardando en la tabla de private_chats los ids de los usuarios desnormalizados con
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

// En esta variable guardamos en memoria las conversaciones que ya buscamos o creamos, para no tener que ir a la red cada vez que se manda un mensaje o se traen los mensajes. La clave es la concatenación de los 2 ids ordenados (userId1_userId2). El valor es el objeto de la conversación (id, user_id1, user_id2, created_at).
// La usamos en getOrCreatePrivateChatFor, que es la función que busca o crea la conversación. Si ya la tenemos en el caché, no hace falta ir a la red.
let privateChatsCache = {};

/**
 * sortUserIdsForPrivateChat - Ordena los ids de los 2 usuarios de una conversación.
 *
 * Existe para que una misma conversación tenga UNA sola forma de guardarse y de buscarse: no importa
 * quién manda y quién recibe, [A, B] y [B, A] devuelven el mismo array ordenado.
 * No se exporta: solo la usan las funciones de este archivo.
 *
 * Paso a paso:
 *   1. Recibe un array con 2 ids, por ejemplo [ idDeSara, idDePepe ].
 *   2. sort() los ordena alfabéticamente (los UUID son strings, así que se comparan como texto).
 *   3. Devuelve el array ordenado.
 *
 * Ojo: sort() además MODIFICA el array original (no crea uno nuevo). Acá no importa, porque el array se
 * arma en el momento al llamar a la función ([ sender_id, receiver_id ]) y no se usa para otra cosa.
 *
 * @param {string[]} ids - Los ids (UUID) de los 2 usuarios, en cualquier orden.
 * @returns {string[]} Los mismos ids, ordenados.
 */
function sortUserIdsForPrivateChat(ids) {
    return ids.sort();
}

/**
 * getPrivateChatFor - Busca la conversación entre 2 usuarios.
 *
 * Paso a paso:
 *   1. Ordena los 2 ids (así busca en el mismo orden en que se guardan).
 *   2. Hace un SELECT en private_chats filtrando por los 2 ids.
 *   3. Si Supabase devuelve un error, lo muestra en la consola y lanza una excepción.
 *   4. Devuelve la conversación encontrada, o undefined si todavía no existe.
 *
 * No se exporta: la usa getOrCreatePrivateChatFor.
 *
 * @param {{ sender_id: string, receiver_id: string }} data - Los ids de los 2 usuarios (el que manda y el que recibe).
 * @returns {Promise<{id: number, user_id1: string, user_id2: string, created_at: string}|undefined>}
 *          La conversación, o undefined si no existe.
 * @throws {Error} Si la consulta a Supabase falla.
 */
async function getPrivateChatFor({ sender_id, receiver_id }) {
    // Paso 1: Ordenamos los ids.
    // Destructuring de array: sortUserIdsForPrivateChat devuelve un array de 2 elementos, y los
    // "desarmamos" por posición: el primero queda en userId1 y el segundo en userId2.
    const [ userId1, userId2 ] = sortUserIdsForPrivateChat([ sender_id, receiver_id ]);

    // Paso 2: Buscamos la conversación.
    // Varios .eq() encadenados se combinan con AND (se tienen que cumplir todos). En SQL:
    //   SELECT * FROM private_chats WHERE user_id1 = '<userId1>' AND user_id2 = '<userId2>';
    const { data, error } = await supabase
        .from('private_chats')
        .select()
        .eq('user_id1', userId1)
        .eq('user_id2', userId2);

    // Paso 3: Supabase no lanza excepciones, devuelve el error en el objeto. Lo convertimos en una
    // excepción para que la función que nos llamó se entere (con try/catch).
    if(error) {
        console.error("Error al buscar el chat privado. ", error);
        throw new Error(error.message);
    }

    // Paso 4: select() siempre devuelve un array. Si la conversación existe, es el primer (y único)
    // elemento; si no existe, el array está vacío y [0] da undefined.
    // data?.[0] (optional chaining): si data fuera null, devuelve undefined en vez de tirar error.
    return data?.[0];
}

/**
 * createPrivateChat - Crea la conversación entre 2 usuarios.
 *
 * Paso a paso:
 *   1. Ordena los 2 ids (así se guardan siempre en el mismo orden).
 *   2. Hace un INSERT en private_chats con los 2 ids, y con .select() pide que le devuelva la fila creada.
 *   3. Si Supabase devuelve un error, lo muestra en la consola y lanza una excepción.
 *   4. Devuelve la conversación creada (con el id que le generó la base).
 *
 * No se exporta: la usa getOrCreatePrivateChatFor.
 *
 * @param {{ sender_id: string, receiver_id: string }} data - Los ids de los 2 usuarios.
 * @returns {Promise<{id: number, user_id1: string, user_id2: string, created_at: string}>} La conversación creada.
 * @throws {Error} Si el insert falla.
 */
async function createPrivateChat({ sender_id, receiver_id }) {
    // Paso 1: Ordenamos los ids.
    const [ userId1, userId2 ] = sortUserIdsForPrivateChat([ sender_id, receiver_id ]);

    // Paso 2: Creamos el chat, y obtenemos sus datos.
    // No mandamos id ni created_at: los genera la base (identity y default now()).
    // En SQL: INSERT INTO private_chats (user_id1, user_id2) VALUES (...) RETURNING *;
    const { data, error } = await supabase
        .from('private_chats')
        .insert({
            user_id1: userId1,
            user_id2: userId2,
        })
        // El .select() siguiendo al .insert() retorna el registro creado.
        // Sin él, data vendría null. Lo necesitamos porque los mensajes se guardan con el id del chat
        // (chat_id), y ese id recién existe después de este insert.
        .select();

    // Paso 3: Si falló, avisamos con una excepción.
    if(error) {
        console.error("Error al crear el chat privado. ", error);
        throw new Error(error.message);
    }

    // Paso 4: Igual que el select(), el .select() del insert devuelve un array: la fila creada es la [0].
    return data[0];
}

/**
 * getOrCreatePrivateChatFor - Devuelve la conversación entre 2 usuarios; si no existe, la crea.
 *
 * Es el patrón "buscar o crear" (como firstOrCreate de Laravel). Gracias a esto no hace falta un botón
 * de "iniciar conversación": se crea sola la primera vez que se necesita.
 *
 * Paso a paso:
 *   1. Busca la conversación.
 *   2. Si no la encontró, la crea.
 *   3. Devuelve la conversación (la encontrada o la recién creada).
 *
 * No se exporta: la usan sendPrivateChatMessage y getLastPrivateChatMessages.
 *
 * @param {{sender_id: string, receiver_id: string}} data - Los ids de los 2 usuarios.
 * @returns {Promise<{id: number, user_id1: string, user_id2: string, created_at: string}>} La conversación.
 * @throws {Error} Si falla la búsqueda o la creación.
 */
async function getOrCreatePrivateChatFor({ sender_id, receiver_id }) {

    // 0. Creamos la clave del caché: los 2 ids ordenados y concatenados con guión bajo. Esto asegura que la misma conversación tenga siempre la misma clave, sin importar quién manda y quién recibe.
    const cacheKey = sortUserIdsForPrivateChat([ sender_id, receiver_id ]).join('_');

    // 1. ¿Está en el caché? → la devolvemos sin ir a la red
    if(privateChatsCache[cacheKey]) {
        return privateChatsCache[cacheKey];
    }

    // 2. No está → la buscamos en Supabase
    let chat = await getPrivateChatFor({ sender_id, receiver_id });

    // 3. No existe (o sea, getPrivateChatFor() devuelve undefined) → la creamos
    if(!chat) {
        chat = await createPrivateChat({ sender_id, receiver_id });
    }

    // 4. Si no está o no existe, la acabamos de crear. Guardamos en el caché para la próxima vez.
    privateChatsCache[cacheKey] = chat;

    return chat;
}

/**
 * sendPrivateChatMessage - Manda un mensaje en la conversación entre 2 usuarios.
 *
 * Recibe los ids de los usuarios (no el id del chat): el componente solo sabe con quién está hablando.
 *
 * Paso a paso:
 *   1. Obtiene la conversación entre los 2 usuarios (la busca, o la crea si es el primer mensaje).
 *   2. Inserta el mensaje en private_chats_messages, con el id de esa conversación.
 *   3. Si Supabase devuelve un error, lo muestra en la consola y lanza una excepción.
 *
 * @param {{sender_id: string, receiver_id: string, body: string}} data - Quién manda, quién recibe y el texto.
 * @returns {Promise<void>}
 * @throws {Error} Si falla obtener la conversación o el insert del mensaje.
 */
export async function sendPrivateChatMessage({ body, sender_id, receiver_id }) {
    // Paso 1: Para poder insertar un mensaje, necesitamos el chat privado antes. Lo buscamos o creamos con getOrCreatePrivateChatFor.
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    // Paso 2: Ahora sí, insertamos el mensaje.
    // No guardamos el receiver_id: alcanza con chat_id (la conversación ya sabe quiénes son los 2 usuarios) y sender_id (quién lo mandó). 
    // En SQL: INSERT INTO private_chats_messages (chat_id, sender_id, body) VALUES (...);
    const { error } = await supabase
        .from('private_chats_messages')
        .insert({
            chat_id: chat.id,
            sender_id, // es igual que poner sender_id: sender_id, pero más corto (shorthand de objetos).
            body, // es igual que poner body: body, pero más corto (shorthand de objetos).
        });

    // Paso 3: Si falló, avisamos con una excepción.
    if(error) {
        console.error("Error al enviar el mensaje del chat privado. ", error);
        throw new Error(error.message);
    }
}

/**
 * getLastPrivateChatMessages - Trae los mensajes de la conversación entre 2 usuarios.
 *
 * Paso a paso:
 *   1. Obtiene la conversación entre los 2 usuarios (la busca, o la crea si no existe).
 *   2. Hace un SELECT de los mensajes de esa conversación.
 *   3. Si Supabase devuelve un error, lo muestra en la consola y lanza una excepción.
 *   4. Devuelve el array de mensajes.
 *
 * Ojo: como usa getOrCreatePrivateChatFor, con solo ABRIR la pantalla del chat ya se crea la conversación
 * en la base, aunque nunca se mande un mensaje.
 *
 * @param {{ sender_id: string, receiver_id: string }} data - Los ids de los 2 usuarios.
 * @returns {Promise<{id: number, chat_id: number, sender_id: string, body: string, created_at: string}[]>}
 *          Los mensajes (array vacío si todavía no hay ninguno).
 * @throws {Error} Si falla obtener la conversación o la consulta de los mensajes.
 */
export async function getLastPrivateChatMessages({ sender_id, receiver_id }) {
    // Paso 1: Obtenemos la conversación (necesitamos su id para filtrar los mensajes).
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    // Paso 2: Traemos los mensajes de esa conversación.
    // En SQL: SELECT * FROM private_chats_messages WHERE chat_id = <chat.id>;
    // No tiene .order(): vienen en el orden en que Postgres los devuelva (normalmente el de inserción, pero no está garantizado). Con .order('created_at') quedaría asegurado el orden cronológico.
    const { data, error } = await supabase
        .from('private_chats_messages')
        .select()
        // Buscamos solo los mensajes de la conversación que nos interesa (chat_id = id del chat que obtuve recien con el método getOrCreatePrivateChatFor).
        .eq('chat_id', chat.id);

    // Paso 3: Si falló, avisamos con una excepción.
    if(error) {
        console.error("Error al traer los mensajes del chat privado. ", error);
        throw new Error(error.message);
    }

    // Paso 4: Devolvemos el array de mensajes.
    return data;
}

/**
 * Suscribe a una función de callback para recibir notificaciones en tiempo real de nuevos mensajes en un chat privado.
 * @param {{sender_id: string, receiver_id: string, callback: (newMessage: {id: number, chat_id: number, user_id: string, body: string, created_at: string}) => void}} data
 * @returns {Promise<() => void>} Desuscripción
 */
export async function subscribeToNewPrivateChatMessages({ sender_id, receiver_id, callback }) {
    // 1. Necesitamos el id de la conversación
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    // 2. Creamos un canal propio para esta conversación
    /*
        # Convención para nombres de canales de realtime
        Supabase nos recomienda seguir la convención de nombre:
            scope:id:entity

        La idea es que vamos a definir qué entidad (entity) es de la que queremos recibir notificaciones,
        y con scope:id vamos a definir el alcance o el ámbito dónde vamos a encontrar a esa entidad.
    */
    const channel = supabase.realtime.channel(`private-chat:${chat.id}:messages`);

    // 3. Configuramos qué eventos escuchar
    channel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'private_chats_messages',
             // Aclaramos el filtro que queremos que cumplan los registros a recibir.
            // El formato de los filtros es: campo=operador.valor
            // O sea, acá digo: quiero que me lleguen los registros cuyo campo chat_id sea igual al id de la conversación que obtuve recien.
            filter: 'chat_id=eq.' + chat.id,     // solo los mensajes de ESTA conversación
        },
        payload => {
            callback(payload.new);
        }
    );

    // 4. Nos suscribimos para empezar a recibir
    channel.subscribe();

    // 5. Devolvemos una función para desuscribirse (ver Parte 2)
    return () => {
        channel.unsubscribe();
    }
}




/**
 *  CÓMO ESTABA ANTES DE CACHÉ:
        async function getOrCreatePrivateChatFor({ sender_id, receiver_id }) {
            // Paso 1: Buscamos. "let" (y no "const") porque en el paso 2 la variable se puede reasignar.
            let chat = await getPrivateChatFor({ sender_id, receiver_id });

            // Paso 2: Si no existe, chat es undefined, y !undefined es true: entramos al if y la creamos.
            if(!chat) {
                chat = await createPrivateChat({ sender_id, receiver_id });
            }

            // Paso 3: Acá chat siempre tiene una conversación.
            return chat;
        }
 * 
 */