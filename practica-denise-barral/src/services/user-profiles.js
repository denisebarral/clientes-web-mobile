/*
    user-profiles.js — Servicio de perfiles de usuario: lee y crea filas en la tabla user_profiles.
    La tabla guarda los datos "extra" de cada usuario (bio, nombre, carrera) que no entran en auth.users,
    con una relación 1 a 1: el id del perfil ES el id del usuario de Supabase Auth.
    No maneja la sesión ni sabe quién está logueado: eso es responsabilidad de auth.js, que es quien lo usa.
*/
import { supabase } from "./supabase";

/**
 * getUserProfileById - Trae el perfil del usuario con ese id.
 *
 * @param {string} id - El id (UUID) del usuario, el mismo de auth.users.
 * @returns {Promise<{id: string, email: string, bio: string|null, display_name: string|null, career: string|null, created_at: string}|undefined>}
 *          El perfil, o undefined si ese usuario todavía no tiene perfil.
 * @throws {Error} Si la consulta a Supabase falla.
 */
export async function getUserProfileById(id) {
    const { error, data } = await supabase
        .from('user_profiles')
        .select()
        // Esto es un ejemplo de cómo filtrar por un campo específico en la tabla. En este caso, estamos
        // filtrando por el campo 'id' para obtener el perfil del usuario correspondiente.
        // .eq(columna, valor) = "donde columna sea igual a valor" => en SQL: WHERE id = '...'.
        // Otros filtros del mismo estilo: .neq() (distinto), .gt() / .lt() (mayor / menor), .like(), etc.
        .eq('id', id);

    if(error) {
        console.error("Error al traer el perfil del usuario. ", error);
        throw new Error(error.message);
    }

    // Como solo hay un registro que puede llegar, podemos hardcodearlo.
    // select() SIEMPRE devuelve un array (aunque haya un solo resultado, o ninguno), por eso tomamos el [0].
    // data?.[0] usa "optional chaining" (?.): si data fuera null o undefined, devuelve undefined en lugar de
    // tirar error. Si el array está vacío, [0] también da undefined.
    // (Supabase también tiene .single() / .maybeSingle(), que devuelven directamente un objeto en vez de un array.)
    return data?.[0];
}

/**
 * createUserProfile - Crea el perfil de un usuario recién registrado.
 *
 * Lo llama register() de auth.js, justo después del signUp.
 *
 * @param {{id: string, email: string}} data - El id del usuario de auth.users y su email.
 *        Los demás campos (bio, display_name, career) quedan en null.
 * @returns {Promise<void>}
 * @throws {Error} Si el insert falla (por ejemplo, si ya existe un perfil con ese id).
 */
export async function createUserProfile(data) {
    // insert(data): como data es { id, email }, equivale a INSERT INTO user_profiles (id, email) VALUES (...).
    const { error } = await supabase
        .from('user_profiles')
        .insert(data);

    if(error) {
        console.error("Error al crear el perfil del usuario. ", error);
        throw new Error(error.message);
    }
}


/**
 * 
 * @param {string} id 
 * @param {{bio?: string|null, display_name?: string|null, career?: string|null}} data 
 */
export async function updateUserProfile(id, data) {
    const { error } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', id);
        
    if(error) {
        console.error("Error al editar el perfil del usuario. ", error);
        throw new Error(error.message);
    }
}

