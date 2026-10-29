-- Migración: crea la tabla de mensajes del chat público.
-- Una migración es un archivo .sql con los cambios a la estructura de la base, versionado junto con el código.
-- Se crea con "supabase migration new <nombre>" (el número del principio es la fecha y hora de creación,
-- y define el orden en que se ejecutan) y se aplica con "supabase migration up" o "supabase db reset".
-- Equivale a las migraciones de Laravel (php artisan make:migration / migrate), pero escritas en SQL puro.
CREATE TABLE public_chat_messages (
    -- bigint: entero grande. "generated always as identity" hace que Postgres lo genere solo
    -- (1, 2, 3...), como AUTO_INCREMENT en MySQL. "always" impide insertarlo a mano.
    id bigint primary key generated always as identity,
    sender_id uuid not null references auth.users (id),
    -- text: texto sin largo máximo (en Postgres no hace falta elegir un VARCHAR(n)).
    email text,
    body text,
    -- timestamptz: fecha y hora CON zona horaria. default now() completa la fecha del momento del insert,
    -- por eso desde JS no la mandamos.
    created_at timestamptz default now()
);

-- Habilitamos "realtime" a la tabla que creamos.
-- Supabase Realtime solo avisa de los cambios de las tablas que están en la publicación "supabase_realtime".
-- Sin esta línea, el insert funciona pero el .on('postgres_changes', ...) del front nunca se entera.
ALTER PUBLICATION supabase_realtime ADD TABLE public_chat_messages;

-- Nota: la tabla queda SIN RLS (Row Level Security), así que cualquiera con la publishable key puede leer e
-- insertar. Está bien para desarrollo; en producción habría que activar RLS y crear policies.
