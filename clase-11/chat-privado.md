# Chat privado con Postgres y Supabase
Queremos implementar un chat privado entre 2 usuarios.
Vamos a definir, para simplificar algunos aspectos de las consultas y, sobre todo, la interfaz, la restricción
de que las conversaciones pueden ser entre solo 2 usuarios. Es decir, no vamos a soportar conversaciones 
grupales.

Aclarado eso, podemos definir qué son las cosas que tenemos que almacenar en la base de datos:

1. Las conversaciones que existen. Incluyendo qué usuarios son los que participan.
2. Los mensajes de cada conversación. Incluyendo quién lo mandó.

Esto se va a traducir en 2 tablas: `private_chats` y `private_chats_messages`

- private_chats
    - id bigint pk ...
    - user_id1 uuid     fk => auth.users
    - user_id2 uuid     fk => auth.users
    - created_at timestamptz

- private_chats_messages
    - id bigint pk ...
    - chat_id bigint    fk => public.private_chats
    - sender_id uuid    fk => auth.users
    - body text
    - created_at timestamptz


## Nota importante
Técnicamente, nuestra base de datos está "desnormalizada". En particular, la tabla `private_chats` está 
violando la 1NF (1st Normal Form).

La razón es que la 1NF dicta que no debemos tener "grupos repetidos". Esto significa que:
- No debo tener columnas con múltiples valores (solo columnas escalares).
- No debo tener múltiples columnas que enumeren una lista de valores.

La forma correcta de resolver esto es separándolo en una relación con una nueva tabla.

En nuestro caso, estamos incumpliendo esto por tener las columnas "user_id1" y "user_id2".
Para la situación particular de nuestro sistema, que tiene como restricción que las conversaciones solo
pueden ser entre 2 usuarios, y vamos a suponer que esto jamás cambiaría, entonces podemos darnos el lujo
para armar la tabla de manera desnormalizada. Pero solo porque los requisitos muy específicos (y algo irreales) y con fines de ahorrar tiempo de cursada.

Si quisiéramos hacerlo bien y, de paso, permitir eventualmente chats grupales habría que desdoblar las
columnas de los usuarios en una nueva tabla con relación a `private_chats`.

Quedaría de la siguiente manera:

- private_chats
    - id bigint pk ...
    - name text
    - created_at timestamptz

- private_chats_users
    - id bigint pk ...
    - chat_id bigint    fk => public.private_chats
    - user_id uuid      fk => auth.users
    // - is_admin o role_id
    - created_at timestamptz

- private_chats_messages
    - id bigint pk ...
    - chat_id bigint    fk => public.private_chats
    - sender_id uuid    fk => auth.users
    - body text
    - created_at timestamptz