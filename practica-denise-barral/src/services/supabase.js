/*
    supabase.js — Crea y exporta el "cliente" de Supabase: el objeto con el que el resto de la app se
    comunica con el backend (base de datos, Realtime y Auth).
    Se crea UNA sola vez acá y se importa donde haga falta (en los servicios).
    No hace consultas: solo configura la conexión.
*/
// Acá vamos a conectar con Supabase y exportar el objeto de la conexión para poder usarlo
// en el resto del programa.
// createClient viene del paquete @supabase/supabase-js (el cliente de JS de Supabase).
import { createClient } from '@supabase/supabase-js';

// Definimos dos variables para los valores de conexión: URL y la Publishable Key.
// Ambos los obtenemos del dashboard del proyecto. Estos son cuando trabajé con la opción del hosting free:
//const SUPABASE_URL = "https://rexfsplcwvkotirucvsg.supabase.co"; 
//const SUPABASE_KEY = "sb_publishable_fNkqT4FUMwTc3nxWdxck0w_Nh8smsuQ";

// Ahora trabajo con el deploy local de desarrollo de Supabase (Docker). Estos datos los imprime en la terminal
// "pnpm supabase start" (si ya está corriendo, se pueden volver a ver con "pnpm supabase status").
// 54321 es el puerto por defecto de la API local (definido en supabase/config.toml).
const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// La publishable key es PÚBLICA: está pensada para el navegador (cualquiera la ve con DevTools).
// Lo que protege los datos son las reglas de seguridad de las tablas (RLS), no esconder esta key.
// La que NUNCA va en el front es la "secret key".
// Mejora posible: guardar URL y key en un archivo .env (VITE_SUPABASE_URL=...) y leerlas con
// import.meta.env.VITE_SUPABASE_URL, para cambiar entre local y hosting sin tocar el código.
//
// Export con nombre (export const) => en los otros archivos se importa con llaves: import { supabase } from ...
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);