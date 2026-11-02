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

/*
    # GRANTs
    Para definir privilegios tenemos que usar la claúsula GRANT:
        GRANT <cláusulas> ON <tabla> TO <usuarios_roles>;

    De la misma forma, si queremos revocar privilegios ya asignados, podemos usar la cláusula REVOKE:
        REVOKE <cláusulas> ON <tabla> FROM <usuarios_roles>;

    Nota importante:
    Hasta el 30/10/2026 Supabase automáticamente le agregaba una serie de GRANTs a los roles: anon,
    authenticated y service_role.
    Estos GRANTs incluyen SELECT, INSERT, UPDATE, DELETE.

    A partir de la fecha mencionada, Supabase va a cambiar su política y no agregar estos GRANTs a los
    roles anon y authenticated.

    De todas formas, siempre la práctica recomendada fue primero revocar todos los privilegios de esos
    dos roles, y luego agregar los que hagan falta.


    ¿Qué son los roles anon, authenticated y service_role?
    - anon: Rol que comparten todos los usuarios que no están autenticados en el proyecto.
    - authenticated: Rol que comparten todos los usuarios que ya están autenticados en el proyecto.
    - service_role: Rol que usan los usuarios con los que conectamos a Postgres desde el backend. No
        aplica a la API pública de Supabase (como la de JS).


    Para la tabla de user profiles, vamos a querer que:
    - Los usuarios autenticados puedan ejecutar consultas de SELECT, INSERT y UPDATE en la tabla.
    - Los usuarios anónimos no pueden hacer nada.
*/
REVOKE all ON public.user_profiles FROM anon, authenticated;
GRANT select, insert, update ON public.user_profiles TO authenticated;


/*
    # RLS
    Para poder usar RLS primero necesitamos habilitar esta funcionalidad en la tabla
    corriendo la consulta:
        ALTER TABLE <tabla> enable row level security;
*/
ALTER TABLE public.user_profiles enable row level security;

/*
    Cuando habilitamos RLS en una tabla, por defecto se van a bloquear todos los registros de la tabla
    de cualquier consulta (SELECT, INSERT, ...).

    Para permitir que vuelvan a "funcionar" estas consultas tenemos que definir las "policies" (pólizas)
    que indiquen las condiciones que tienen que cumplir los usuarios para acceder a los registros.

    Esto se logra con la consulta CREATE POLICY:
        CREATE POLICY <nombre>
        ON <tabla>
        [AS PERMISSIVE|RESTRICTIVE]
        FOR <cláusula>
        TO <usuarios_roles>
        [USING (<condición>)]
        [WITH CHECK (<condición>)];

    Nota: Los corchetes indican que ese fragmento es opcional.

    Dónde:
        <nombre>
            El nombre / identificador de la policy. Puede ser cualquier string.
        
        <tabla>
            La tabla a la que aplica.

        PERMISSIVE|RESTRICTIVE
            Cómo debe manejar Postgres los casos donde haya múltiples policies que apliquen en el query
            para el usuario o rol.
                PERMISSIVE => Unir las condiciones con OR
                RESTRICTIVE => Unir las condiciones con AND

            El default es PERMISSIVE, y es el que vamos a usar.

        <cláusula>
            A qué consulta esto aplica.
            Puede ser uno de: SELECT, INSERT, UPDATE, DELETE, ALL.

            La recomendación es no usar nunca ALL.
            Cada policy solo puede contemplar una única cláusula. No podemos poner "SELECT, INSERT".

        <usuarios_roles>
            A quiénes asignamos la policy.

        <condition>
            Las condiciones que deben cumplirse para permitir el acceso al registro.

        
        Notarán que hay dos partes opcionales que aceptan <condition>: USING y WITH CHECK

        USING tenemos que ponerlo para las consultas que pueden leer registros: SELECT, UPDATE, DELETE.
        WITH CHECK lo ponemos en la consulta que pueden escribir registros: INSERT, UPDATE.

    Para esta tabla queremos que:
    - Los usuarios autenticados puedan ver cualquier perfil.
    - Los usuarios autenticados puedan crear su perfil.
    - Los usuarios autenticados puedan editar su perfil.
*/
CREATE POLICY "Auth users can view profiles" -- Noten que son comillas dobles, porque es el nombre de la estructura, no un valor.
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

/*
    Como ya el rol authenticated verifica que el usuario esté autenticado, no necesitamos aclarar ninguna
    condición específica en el USING. Así que le pasamos directamente un true.
*/

CREATE POLICY "Auth users can create their profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    -- Queremos verificar que el valor de la columna "id" de la tabla "user_profiles" coincida con el
    -- id del usuario autenticado.
    -- Para obtener el id del usuario autenticado podemos usar la función helper de Supabase: auth.uid()
    (select auth.uid()) = id
);

CREATE POLICY "Auth users can update their profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
    (select auth.uid()) = id
)
WITH CHECK (
    (select auth.uid()) = id
);

-- Noten que en el update se suele poner la misma condición en el USING y en el WITH CHECK.

-- TODO: Completar RLS. Upload de archivos.