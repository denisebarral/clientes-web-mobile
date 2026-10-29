// Acá vamos a conectar con Supabase y exportar el objeto de la conexión para poder usarlo
// en el resto del programa.
import { createClient } from '@supabase/supabase-js';

// Definimos dos variables para los valores de conexión: URL y la Publishable Key.
// Ambos los obtenemos del dashboard del proyecto.
// const SUPABASE_URL = "https://yraegbmxjfvlbnzdtjtd.supabase.co"; // Noten que es ".co" y no ".com"
// const SUPABASE_KEY = "sb_publishable_HLOClUQpKTjlN064ZRax0Q_9tgW7UJC";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);