# Seguridad de los datos con Postgres y Supabase
Dijimos que Supabase delega las funcionalidades de seguridad a Postgres.

Por su parte, Postgres nos ofrece principalmente 2 mecanismos para la seguridad de la información:

a. El sistema de privilegios a través de GRANTs.
b. El sistema de row level security (RLS).


## Sistema de privilegios (GRANTs)
Este sistema es parte del estándar de SQL.

Lo que nos habilita a hacer es que podamos detallar de manera minusciosa qué consultas pueden qué usuarios
o roles ejecutar en qué estructuras (tablas, schemas, etc).

Cuando decimos usuarios y roles, no nos referimos a los de la tabla de "auth.users" y eso. Sino a los
usuarios y roles de la base de datos.

Por ejemplo, podemos permitir que algunos usuarios de nuestra base puedan ejecutar consulta de inserción
y actualización (INSERT, UPDATE) en registros de alguna tabla, pero no en otras.
A otros les podemos permitir un control más amplio (INSERT, UPDATE, DELETE, SELECT) (por ejemplo, 
administradores).
Y a algunos tal vez solo les permitimos leer (SELECT) ciertos datos (por ejemplo, usuarios no autenticados).

Esto define los privilegios que un usuario o rol tiene.
Controla si el usuario puede ejecutar la consulta o no.

Siempre es recomendable asignar solo los roles indispensables para cada usuario, y ninguno más.


## RLS
RLS es una extensión de Postgres.
Las RLS nos permiten agregar condiciones adicionales que un usuario o rol debe cumplir para poder acceder
a los registros de una tabla.

Esto corre luego de los GRANTs. Las RLS corren con cada registro afectado por la consulta.

Los pueden pensar como algo similar a agregar una cláusula WHERE automáticamente al query.


Vamos a ir a nuestras migraciones para asignar los privilegios y RLS necesarios.