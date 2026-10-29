/*
    Creamos una función para crear un usuario con su perfil.

    TODO: Ver perfiles de otros usuarios.

    # plpgsql
    Procedural Language for PostgreSQL (plpgsql) es el lenguaje de programación que soporta Postgres.
    Está inspirando en su sintaxis del lenguaje PL/SQL de Oracle.

    Dentro del SQL nosotros tenemos que crear los fragmentos de códigos de plpgsql como strings que contengan
    las instrucciones que queremos ejecutar.

    Estos strings van a luego ser usados junto a otras cláusulas o instrucciones de SQL.

    Desglosemos un poco la sintaxis de la creación de la función a continuación.

    CREATE OR REPLACE FUNCTION es una cláusula de Postgres que permite crear una función.
    Esta función puede recibir parámetros, los cuales deben especificarse con un nombre seguido del tipo 
    de dato, el cual puede, entre otros, ser de cualquiera de los tipos de dato que Postgres soporte.

    Adicionalmente, puede optar por indicar un tipo de dato de retorno usando la cláusula RETURNS.

    Luego se continúa con la cláusula AS seguida del string con el código plpgsql que queremos asociar.

    Para definir el string del código y evitar problemas con las comillas que podrían existir en el mismo
    es una buena práctica definir el string con el delimitador especial $$ $$.

    Dentro del string definimos el código. Los bloques de plpgsql se definen con la instrucción BEGIN
    y se terminan con la instrucción END.
    Opcionalmente, podemos antes declarar las variables que queremos poder usar en el bloque con la cláusula
    DECLARE.
    Cada variable se define con su nombre seguido de su tipo de dato. Y se separan con ";" (no con ",").

    Después vemos que llama a un par de funciones (gen_random_uuid() y crypt()) y guarda sus retornos en
    las variables definidas.
    Para asignar valores se puede usar tanto el operador "=" como el operador ":=".
    Siempre se prefiere usar el segundo (:=) para la asignación de variables, para evitar posibles confusiones
    de lectura con el operador de comparación "=".

    Y, finalmente, se ejecutan las consultas. Parte del encanto de plpgsql es que podemos llamar a las 
    consultas SQL directamente.
*/
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
    email text,
    password text,
    bio text,
    display_name text,
    career text
) RETURNS uuid AS $$
  DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN -- Noten que no tiene ";" esta línea.
  user_id := gen_random_uuid();
  encrypted_pw := crypt(password, gen_salt('bf', 12));
  
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', email, encrypted_pw, now() at time zone 'utc', now() at time zone 'utc', now() at time zone 'utc', '{"provider":"email","providers":["email"]}', '{}', now() at time zone 'utc', now() at time zone 'utc', '', '', '', '');
  
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, user_id, format('{"sub":"%s","email":"%s"}', user_id::text, email)::jsonb, 'email', now() at time zone 'utc', now() at time zone 'utc', now() at time zone 'utc');

  INSERT INTO public.user_profiles (id, email, bio, display_name, career)
  VALUES 
    (user_id, email, bio, display_name, career);

  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

/*
    Para usar la función que creamos con plpgsql, necesitamos llamarla desde un bloque de plpgsql.

    Si queremos ejecutar un fragmento de código de plpgsql directamente podemos usar la cláusula DO seguida
    del string con el código a correr.

    La instrucción PERFORM sirve para invocar una función y descartar el retorno.
*/
DO $$
  DECLARE
    user_id1 uuid;
    user_id2 uuid;
  BEGIN
    -- PERFORM public.create_user_with_profile('sara@za.com', 'asdasd', '¡Hola! Me llamo Sara za', 'Saraza', 'Diseño y programación web');
    -- PERFORM public.create_user_with_profile('pepe@trueno.com', 'asdasd', NULL, 'Pepe Trueno', NULL);
    user_id1 := public.create_user_with_profile('sara@za.com', 'asdasd', '¡Hola! Me llamo Sara za', 'Saraza', 'Diseño y programación web');
    user_id2 := public.create_user_with_profile('pepe@trueno.com', 'asdasd', NULL, 'Pepe Trueno', NULL);

    INSERT INTO public_chat_messages (sender_id, email, body, created_at)
    VALUES (user_id1, 'sara@za.com', '¡Hola de nuevo, pero desde un seed!', '2026-09-17 10:12:13+00:00'),
        (user_id2, 'pepe@trueno.com', 'holaaaa saraaaa q tal???', '2026-09-17 10:13:54+00:00'),
        (user_id1, 'sara@za.com', '¿Cómo estás, Pepe?', '2026-09-17 10:14:37+00:00');
  END;
$$;
