/*
    Esta tabla va a tener una relación de 1-a-1 con `auth.users`, vamos a usar como PK el id 
    del usuario.
    La creé desde la terminal con "pnpm supabase migration new create_user_profiles_table", y después la
    edité para agregarle los campos que necesitamos.
    Además, este id que creamos en la tabla va a funcionar también como FK.

    Para definir que un campo es una FK en Postgres es muy sencillo, solo escribimos:
        <campo> <tipo> ... references <tabla> (<pk>)
*/
-- ¿Por qué una tabla aparte y no agregar columnas a auth.users? Porque las tablas del schema "auth" son de
-- uso interno de Supabase: modificarlas puede romper la plataforma, y además no se pueden consultar desde
-- el cliente de JS. Las tablas en el schema "public" (el default) sí son accesibles desde JS.
create table user_profiles (
    -- uuid: identificador único universal (ej: 'a1b2c3d4-...'), el mismo tipo que usa auth.users para su id.
    -- primary key + references auth.users (id): es PK y FK a la vez. Como cada usuario puede tener un solo
    -- perfil (el id no se puede repetir), la relación queda 1 a 1.
    -- No es "generated always as identity": el id NO lo genera esta tabla, lo copiamos del usuario.
    -- La FK garantiza la integridad referencial: no se puede crear un perfil para un usuario que no existe.
    id uuid primary key references auth.users (id),
    -- not null: el email es obligatorio (en MySQL es igual: NOT NULL).
    email text not null,
    -- Estos tres pueden quedar en null: el usuario los completa (más adelante) desde su perfil.
    bio text,
    display_name text,
    career text,
    created_at timestamptz default now()
);

-- Nota: la tabla queda sin RLS (cualquiera con la publishable key puede leer y escribir perfiles) y sin
-- "on delete cascade" en la FK (si se borra el usuario de auth.users, Postgres no deja borrarlo mientras
-- tenga perfil). Las RLS se van a ver más adelante.