/*
    auth.js — Servicio de autenticación: registro, login, logout y el ESTADO de autenticación
    (quién está logueado y su perfil), que comparte con el resto de la app usando el patrón Observer.
    Es el único archivo que escucha a Supabase Auth: los componentes y el router solo se suscriben acá.
    No sabe nada de la pantalla: no toca el DOM ni el state de ningún componente.
*/
/*
    # Autenticación con Supabase
    Para el manejo de la autenticación en Supabase tenemos la propiedad "auth" del cliente de Supabase.
    Este objeto ofrece múltiples métodos para interactuar con los servicios de autenticación ofrecidos.


    ## Patrón de diseño Observer para manejar el estado de autenticación y sus cambios
    Como bien recordamos, los patrones de diseño son estrategias comunes para resolver ciertos aspectos
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
import { createUserProfile, getUserProfileById , updateUserProfile } from "./user-profiles";

// Guardamos los datos del usuario autenticado de manera local en el servicio.
// Esto sirve como nuestro "subject" en el observer de la autenticación que vamos a crear.
// Con todo en null = "no hay nadie logueado". Además de id y email (que vienen de Supabase Auth), guarda
// los datos del perfil (bio, display_name, career), que vienen de nuestra tabla user_profiles.
// Es una variable del módulo (con let, porque la reemplazamos): no se exporta, así que nadie de afuera la
// puede modificar. La única forma de leerla es suscribiéndose (subscribeToAuthStateChange).
let userData = {
    id: null,
    email: null,
    bio: null,
    display_name: null,
    career: null,
}

// La lista de observers suscriptos. Cada observer es una función (callback) que quiere recibir los datos
// del usuario cada vez que cambien. Hoy se suscriben App.vue, el router y MyProfile.vue.
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

    Desde esta clase, esto vive en el servicio (en la clase 08 estaba en App.vue). Como está al nivel del
    módulo, se ejecuta UNA sola vez, la primera vez que algún archivo importa auth.js.
    Fijate que es un observer adentro de otro: nosotros somos observers de Supabase Auth, y a la vez somos
    el "subject" de nuestros propios observers (App.vue, el router, MyProfile).
*/
supabase.auth.onAuthStateChange((event, session) => {
    // console.group("Cambio de estado de autenticación");
    // console.log("Evento: ", event);
    // console.log("Sesión: ", session);
    // console.groupEnd();
    if(session !== null) {
        // Primero guardamos lo que ya tenemos de la sesión (id y email). Los datos del perfil todavía no
        // están: en este momento bio, display_name y career quedan undefined (no se copiaron).
        userData = {
            id: session.user.id,
            email: session.user.email,
        }

        // Dejamos cargando los datos del perfil en paralelo.
        // Se usa .then() y no await porque no queremos frenar la notificación: el notifyAll() de abajo avisa
        // enseguida con id y email (la nav ya puede cambiar), y cuando llega el perfil se avisa de nuevo.
        getUserProfileById(userData.id)
            .then(profile => {
                // Opcionalmente, podríamos esperar un segundo y reintentar.
                // ¿Cuándo puede no haber perfil? Justo después de registrarse: signUp dispara este evento
                // ANTES de que register() llegue a crear la fila en user_profiles.
                if(!profile) return;

                // Spread operator (...userData): copiamos lo que ya había (id, email) y le sumamos los
                // datos del perfil, en un objeto nuevo.
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
    // Avisamos a todos los observers del cambio (login con id y email, o logout con todo en null).
    notifyAll();
});

/**
 * Este método permite registrar un usuario en Supabase con un email y un password.
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

    // Creamos el perfil del usuario: una fila en user_profiles con el MISMO id que el usuario de auth.users
    // (relación 1 a 1). El resto de los campos (bio, display_name, career) quedan en null.
    // OJO: si esto falla, el usuario queda creado en Auth pero sin perfil (no hay forma de "deshacer" el signUp).
    await createUserProfile({
        id: data.user.id,
        email,
    });

    // ¡El usuario está registrado y autenticado!
    // signUp, además de crear el usuario, inicia la sesión (si el proyecto no exige confirmar el email):
    // Supabase guarda la sesión en el localStorage del navegador por nosotros.
    // data trae { user, session }. user es el usuario creado (con su id, que es un UUID).
    // Los usuarios NO se guardan en nuestras tablas: Supabase Auth los guarda en su propia tabla auth.users.
    console.log("¡Usuario creado! ", data);
    
    // Devolvemos solo los datos que la app necesita, y no todo el objeto de Supabase.
    // Así, si mañana cambia el backend, el resto de la app sigue recibiendo el mismo formato.
    return {
        id: data.user.id,
        email: data.user.email,
    }
}


/**
 * login - Inicia sesión con email y password.
 *
 * Si sale bien, Supabase guarda la sesión en el localStorage y dispara onAuthStateChange
 * (evento SIGNED_IN): el callback de arriba carga los datos y notifica a los observers.
 *
 * @param {{email: string, password: string}} data
 * @returns {Promise<{id: string, email: string}>} Los datos básicos del usuario autenticado.
 * @throws {Error} Si las credenciales son incorrectas ("Invalid login credentials") u otro error de Auth.
 */
export async function login({ email, password }) {
    const { data, error } = await supabase
        .auth
        // signInWithPassword valida el email y la contraseña contra los usuarios de auth.users.
        // Igual que signUp, devuelve { data, error }; data trae { user, session }.
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
    
    // Igual que en register(): devolvemos solo id y email, con el mismo formato.
    return {
        id: data.user.id,
        email: data.user.email,
    }
}

/**
 * logout - Cierra la sesión del usuario actual.
 *
 * signOut() borra la sesión guardada en el localStorage y dispara onAuthStateChange con el evento
 * SIGNED_OUT (y session = null): el callback de arriba vacía userData y notifica a los observers.
 * Solo desestructuramos "error" porque signOut no devuelve datos.
 *
 * @returns {Promise<void>}
 * @throws {Error} Si Supabase no pudo cerrar la sesión.
 */
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
 * subscribeToAuthStateChange - Suscribe un observer a los cambios del usuario autenticado.
 *
 * El callback se ejecuta inmediatamente con los datos actuales, y después cada vez que cambien.
 * Uso: subscribeToAuthStateChange(userData => this.user = userData);
 *
 * OJO: no hay una función para desuscribirse. Cada vez que se monta un componente que se suscribe
 * (como MyProfile.vue), se agrega un observer nuevo a la lista y los viejos nunca se sacan.
 *
 * @param {(userData: {id: string|null, email: string|null, bio: string|null, display_name: string|null, career: string|null}) => void} callback El observer a suscribir.
 */
export function subscribeToAuthStateChange(callback) {
    // Registramos el observer en nuestro stack.
    observers.push(callback);

    // Le notificamos inmediatamente la data actual del usuario.
    // Así el que se suscribe no tiene que esperar al próximo cambio para saber si hay alguien logueado.
    notify(callback);
}

/**
 * notify - Notifica a UN observer con los datos actuales del usuario.
 * No se exporta: solo se usa dentro de este archivo.
 *
 * @param {(userData: object) => void} callback El observer a notificar.
 */
function notify(callback) {
    // Para notificar al observer, como es un callback, solo necesitamos ejecutarlo y pasarle una
    // copia de los datos del usuario.
    // ¿Por qué una copia ({...userData}) y no userData directo? Para que ningún observer pueda modificar
    // nuestro "subject" por error: cada uno recibe su propio objeto.
    callback({...userData});
}

/**
 * notifyAll - Notifica a TODOS los observers suscriptos. Se llama cada vez que cambia userData.
 * No se exporta: solo se usa dentro de este archivo.
 */
function notifyAll() {
    // Notificamos a todos los observers.
    // observers.forEach(notify) es lo mismo que la línea comentada: forEach llama a notify pasándole
    // cada observer como primer argumento.
    // observers.forEach(observer => notify(observer));
    observers.forEach(notify);
}