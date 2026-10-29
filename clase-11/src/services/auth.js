/*
    # Autenticación con Supabase
    Para el manejo de la autenticación en Supabase tenemos la propiedad "auth" del cliente de Supabase.
    Este objeto ofrece múiltiples métodos para interactuar con los servicios de autenticación ofrecidos.


    ## Patrón de diseño Observer para manejar el estado de autenticación y sus cambios
    Como bien recordarmos, los patrones de diseño son estrategias comunes para resolver ciertos aspectos
    del diseño del código del software.

    En particular, el patrón Observer nos permite resolver un escenario de comunicación de 1 a muchos
    donde los "muchos" (llamamos "observers") quieren ser informados de cambios en, o sucesos 
    relacionados a, el 1 (llamado el "subject").

    Para implementar este patrón, generalmente necesitamos los siguientes puntos:
    1. Tener un "subject". En nuestro caso, los datos del usuario (la variable userData)
        va a ser nuestro "subject".
    2. Ofrecer un mecanismo para que los "observers" puedan "suscribirse" para recibir las 
        notificaciones. Esto lo vamos a resolver con una función que reciba el observer (que va a
        tener que ser un callback).
    3. Tener un lugar donde guardar toda la lista de "observers" suscritos. Para esto vamos a usar
        un array en una variable "observers".
    4. Tener métodos que permitan notificar a los "observers" de los datos del usuario cada vez que
        cambien. Esto lo vamos a resolver con un par de funciones.

    Nota: Dependiendo la implementación y el objetivo que queremos resolver con el patrón observer,
    a veces en vez de hablar de "suscripción", pueden verlo mencionado como "adjuntar" (attach),
    "escuchar" (listen) o "vigilar" (watch).
*/
import { supabase } from "./supabase";
import { createUserProfile, getUserProfileById, updateUserProfile } from "./user-profiles";

// Guardamos los datos del usuario autenticado de manera local en el servicio.
// Esto sirve como nuestro "subject" en el observer de la autenticación que vamos a crear.
let userData = {
    id: null,
    email: null,
    bio: null,
    display_name: null,
    career: null,
}

let observers = [];

/*
    # Datos del usuario autenticado
    Los vamos a obtener a través de un "observer".

    Por ejemplo, podemos usar el método de Auth onAuthStateChange.
    Este método recibe un callback que se va a ejecutar cada vez que el estado de autenticación
    cambie.
    El callback va a recibir 2 argumentos:
    1. El nombre del evento.
    2. El objeto Session si el usuario está autenticado, o no en caso contrario.
*/
supabase.auth.onAuthStateChange((event, session) => {
    // console.group("Cambio de estado de autenticación");
    // console.log("Evento: ", event);
    // console.log("Sesión: ", session);
    // console.groupEnd();
    if(session !== null) {
        userData = {
            id: session.user.id,
            email: session.user.email,
        }

        // Dejamos cargando los datos del perfil en paralelo.
        getUserProfileById(userData.id)
            .then(profile => {
                // Opcionalmente, podríamos esperar un segundo y reintentar.
                if(!profile) return;

                userData = {
                    ...userData,
                    bio: profile.bio,
                    display_name: profile.display_name,
                    career: profile.career,
                }

                // ¡No nos olvidemos de notificar a los observers!
                notifyAll();
            });
    } else {
        userData = {
            id: null,
            email: null,
            bio: null,
            display_name: null,
            career: null,
        }
    }
    notifyAll();
});

/**
 * 
 * @param {{email: string, password: string}} data
 * @returns {Promise<{id: string, email: string}>}
 */
export async function register({ email, password }) {
    const { data, error } = await supabase
        .auth
        // signUp permite crear un usuario pasándole un email o número de teléfono, y un password.
        // Retorna una Promise que se resuelve con un objeto con las propiedades "data" y "error".
        .signUp({
            email,
            password,
        });
    
    if(error) {
        console.error("Error al crear una cuenta: ", error);
        throw new Error(error.message);
    }

    // Creamos el perfil del usuario.
    await createUserProfile({
        id: data.user.id,
        email,
    });

    // ¡El usuario está registrado y autenticado!
    console.log("¡Usuario creado! ", data);
    
    return {
        id: data.user.id,
        email: data.user.email,
    }
}

/**
 * 
 * @param {{email: string, password: string}} data
 * @returns {Promise<{id: string, email: string}>}
 */
export async function login({ email, password }) {
    const { data, error } = await supabase
        .auth
        .signInWithPassword({
            email,
            password,
        });
    
    if(error) {
        console.error("Error al iniciar sesión: ", error);
        throw new Error(error.message);
    }

    // ¡El usuario está autenticado!
    console.log("¡Usuario autenticado! ", data);
    
    return {
        id: data.user.id,
        email: data.user.email,
    }
}

export async function logout() {
    const { error } = await supabase
        .auth
        .signOut();
    
    if(error) {
        console.error("Error al cerrar sesión: ", error);
        throw new Error(error.message);
    }
}

/**
 * @param {{bio?: string|null, display_name?: string|null, career?: string|null}} data 
 */
export async function updateAuthUserProfile(data) {
    try {
        await updateUserProfile(userData.id, data);

        // Actualizamos la data local del usuario y notificamos a los observers.
        userData = {
            ...userData,
            ...data,
        }
        notifyAll();
    } catch (error) {
        console.error("Error al editar el usuario autenticado: ", error);
        throw error;
    }
}

/*
+-----------------------------------------------------------------------------------------
| Implementación de las funcionalidades para el patrón observer
+-----------------------------------------------------------------------------------------
*/
/**
 * 
 * @param {() => {}} callback El observer a suscribir.
 */
export function subscribeToAuthStateChange(callback) {
    // Registramos el observer en nuestro stack.
    observers.push(callback);

    // Le notificamos inmediatamente la data actual del usuario.
    notify(callback);

    // TODO: Unsub
}

/**
 * 
 * @param {() => {}} callback El observer a notificar.
 */
function notify(callback) {
    // Para notificar al observer, como es un callback, solo necesitamos ejecutarlo y pasarle una
    // copia de los datos del usuario.
    callback({...userData});
}

function notifyAll() {
    // Notificamos a todos los observers.
    // observers.forEach(observer => notify(observer));
    observers.forEach(notify);
}