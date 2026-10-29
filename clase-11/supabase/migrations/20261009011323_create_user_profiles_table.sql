/*
    Esta tabla va a tener una relación de 1-a-1 con `auth.users`, vamos a usar como PK el id 
    del usuario.
    Además, este id que creamos en la tabla va a funcionar también como FK.

    Para definir que un campo es una FK en Postgres es muy sencillo, solo escribimos:
        <campo> <tipo> ... references <tabla> (<pk>)
*/
create table user_profiles (
    id uuid primary key references auth.users (id),
    email text not null,
    bio text,
    display_name text,
    career text,
    created_at timestamptz default now()
);