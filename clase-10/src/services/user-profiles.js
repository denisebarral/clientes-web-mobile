import { supabase } from "./supabase";

/**
 * 
 * @param {string} id 
 */
export async function getUserProfileById(id) {
    const { error, data } = await supabase
        .from('user_profiles')
        .select()
        .eq('id', id);
        
    if(error) {
        console.error("Error al traer el perfil del usuario. ", error);
        throw new Error(error.message);
    }

    // Como solo hay un registro que puede llegar, podemos hardcodearlo.
    return data?.[0];
}

/**
 * 
 * @param {{id: string, email: string}} data 
 */
export async function createUserProfile(data) {
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