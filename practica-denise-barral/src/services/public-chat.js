/*
    public-chat.js — Servicio del chat público: TODA la comunicación con Supabase sobre los mensajes
    (leer, enviar y escuchar nuevos en tiempo real) pasa por acá.
    No sabe nada de la pantalla: no toca el DOM ni el state del componente. Devuelve datos, lanza errores
    o llama al callback que le pasen, y el componente decide qué hacer con eso.
*/
/*
    # Uso de servicios
    La primera versión del chat público usó los métodos de Supabase directamente.
    Esto, como práctica general, no suele ser la mejor idea.

    Tiene algunos problemas importantes, que salen de estar violando lo que la "separación de responsabilidades"
    o el "Principio de Responsabilidad Única".
    Estos conceptos que nos dicen que cada elemento del sistema (archivo, función, clase, etc) debería tener
    una única "responsabilidad" o "razón para cambiar".

    En esta primera versión, el componente de PublicChat tiene 2 razones para cambiar:
    - Si necesitamos modificar algo relacionado con el funcionamiento del componente: semántica, lógica
        asociada al DOM y eventos.
    - Si cambia en algo nuestra implementación del backend.

    Algunos de los problemas que esto tiene son:
    - Limita la reutilización de los elementos, porque por ejemplo, si queremos usar la misma lógica de Supabase en otro componente, no podemos.
    - Es más endeble y propenso a errores, porque mientras más código tenga un elemento, más fácil es que se rompa algo al modificarlo.
    - Dificulta la comprensión.
    - Dificulta el testing automatizado (unit testing, integration testing, E2E testing, etc).

    Por estos motivos, es que vamos a separar toda la lógica de Supabase en archivos aparte, que vamos a
    llamar "servicios".
*/
import { supabase } from "./supabase";

/**
 * Método para enviar un nuevo mensaje al chat público.
 * @param {{sender_id: string, email: string, body: string}} data
 * @returns {Promise<void>}
 */
export async function sendPublicChatMessages({ sender_id, email, body }) {
    /*
        # Inserts con Supabase
        Hacer un insert es casi idéntico al select, pero llamando al método "insert()" y pasándole
        un objeto con los datos que queremos insertar.
    */
    const { error } = await supabase
        .from('public_chat_messages')
        .insert({
            sender_id,
            email,
            body,
        });

    // Supabase no lanza excepciones: devuelve el error en el objeto. Acá lo convertimos en una excepción
    // común con throw, para que el componente que nos llamó pueda atraparla con try/catch
    // (siempre que haga "await" de esta función).
    if(error) {
        console.error("Error al enviar el nuevo mensaje del chat público. ", error);
        throw new Error(error.message);
    }
}

/**
 * Método para obtener los últimos mensajes del chat público.
 * @returns {Promise<{id: number, email: string, body: string, created_at: string}[]>}
 */
export async function getLastPublicChatMessages() {
    // Leemos los mensajes de la tabla `public_chat_messages` de Supabase que creamos.
    /*
        # Realizando consultas contra Supabase
        Supabase nos permite, desde su cliente de JS, realizar fácilmente peticiones a su backend.
        Por ejemplo, para trabajar con la "Data API" de las tablas.

        Para hacer la consulta contra una tabla tenemos que empezar con el método ".from()" del cliente
        de Supabase.
        ".from()" recibe como argumento el nombre de la tabla a la que queremos consultar.

        Desde el retorno del ".from()" vamos a tener múltiples métodos para poder indicar qué consulta
        ejecutar (select(), insert(), update(), delete()) y qué particularidades queremos que el query
        tenga (por ejemplo, filtros o límites).

        La mayoría de los métodos que realizan alguna petición al backend retornan, por supuesto, una
        Promise.
        El uso de la Promise tiene una peculiaridad en cómo está implementada por Supabase.
        En estas promesas, las peticiones al backend *no se ejecutan* hasta que hacen el await.

        Y, a su vez, la mayoría de estas Promises retornan un objeto que suele tener 2 propiedades:
            - data
                Contiene la data que se obtuvo con la petición. Solo existe en las peticiones que leen
                datos (ej: select).
            - error
                Contiene, si ocurrió, los datos del error. Si no hubo error, retorna null.
    */
    const { data, error } = await supabase
        // Indicamos que queremos trabajar con la tabla "public_chat_messages".
        .from('public_chat_messages')
        // Hace un SELECT contra la tabla. Si no aclaramos los campos, asume "*".
        // No hay .order(): los mensajes vienen en el orden en que Postgres los devuelva (normalmente el de
        // inserción, pero no está garantizado). Con .order('created_at') quedaría asegurado.
        .select();

    if(error) {
        console.error("Error al traer los mensajes del chat público. ", error);
        throw new Error(error.message);
    }

    return data;
}

/**
 * Método para suscribirse a los nuevos mensajes del chat público.
 * Es necesario para poder renderizar los mensajes en tiempo real, sin necesidad de hacer un refresh de la página.
 * @param {({id: number, email: string, body: string, created_at: string}) => void} callback 
 */
export function subscribeToNewPublicChatMessages(callback) {
    /*
        # Recibiendo los nuevos mensajes en tiempo real
        Supabase tiene varias capacidades para el trabajo con tiempo real, ofrecidas en su API de Realtime.

        Toda la funcionalidad de Realtime gira entorno al concepto de "canales".
        Cada canal define un espacio donde enviar y recibir mensajes.
        Esos mensajes se envían a, y se reciben por, todos los que estén conectados al canal.

        Por ende, el primer paso es crear el canal con el método "channel" de Supabase.
        Como parámetro, deben pasar el nombre del canal, que funciona también como su id.
        Puede ser cualquier string *excepto* "realtime".
    */
    const chatChannel = supabase.channel('public_chat');

    /*
        Teniendo el canal, el siguiente paso es configurar los eventos que queremos escuchar en el mismo.
        Esto lo hacemos con el método "on()", que recibe 3 parámetros:
            1. String. Qué API de Realtime queremos usar en el evento.
                Puede ser: broadcast, presence o postgres_changes.
            2. Object. Los detalles del evento. Por lo menos, debe tener la propiedad "event".
                En la API de "postgres_changes", event debe ser uno los siguientes valores:
                    INSERT, UPDATE, DELETE, *
            3. Function. El callback a ejecutar por cada mensaje recibido.
                Este callback va a recibir un objeto con el "payload" (la data) del evento.
    */
    chatChannel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'public_chat_messages',
        },
        payload => {
            // console.log("El payload recibido es: ", payload);
            callback(payload.new); // Ejecutamos la función callback que recibimos, y le pasamos el mensaje.
        }
    );

    /*
        Luego de que terminamos de definir los eventos necesitamos "suscribirnos" al canal para 
        empezar a recibir los mismos.
    */
    chatChannel.subscribe();
}