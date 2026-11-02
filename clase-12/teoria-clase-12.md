# Clase 12 — Chat privado en tiempo real, caché y seguridad con GRANTs y RLS

## Índice

- [¿Qué se hizo esta clase?](#qué-se-hizo-esta-clase)
- [Estructura de archivos](#estructura-de-archivos)
- [Parte 1 — Tiempo real en el chat privado](#parte-1--tiempo-real-en-el-chat-privado)
  - [La función subscribeToNewPrivateChatMessages](#la-función-subscribetonewprivatechatmessages)
  - [Convención para nombrar canales: scope:id:entity](#convención-para-nombrar-canales-scopeidentity)
  - [Filtrar los eventos: filter](#filtrar-los-eventos-filter)
  - [Chat público vs chat privado en Realtime](#chat-público-vs-chat-privado-en-realtime)
- [Parte 2 — Desuscribirse: una función que devuelve otra función](#parte-2--desuscribirse-una-función-que-devuelve-otra-función)
  - [¿Por qué hace falta desuscribirse?](#por-qué-hace-falta-desuscribirse)
  - [La función de desuscripción](#la-función-de-desuscripción)
  - [El hook unmounted()](#el-hook-unmounted)
  - [Comparación con React](#comparación-con-react)
- [Parte 3 — Caché de los chats privados](#parte-3--caché-de-los-chats-privados)
  - [¿Qué es un caché y por qué acá?](#qué-es-un-caché-y-por-qué-acá)
  - [Un objeto como caché](#un-objeto-como-caché)
  - [El flujo: caché → red → crear](#el-flujo-caché--red--crear)
  - [Limitaciones del caché](#limitaciones-del-caché)
- [Parte 4 — Seguridad en Postgres y Supabase](#parte-4--seguridad-en-postgres-y-supabase)
  - [¿Por qué la seguridad va en la base?](#por-qué-la-seguridad-va-en-la-base)
  - [Los roles: anon, authenticated y service_role](#los-roles-anon-authenticated-y-service_role)
  - [Mecanismo 1: privilegios con GRANT y REVOKE](#mecanismo-1-privilegios-con-grant-y-revoke)
  - [El cambio de Supabase (30/10/2026)](#el-cambio-de-supabase-30102026)
  - [Mecanismo 2: Row Level Security (RLS)](#mecanismo-2-row-level-security-rls)
  - [CREATE POLICY, parte por parte](#create-policy-parte-por-parte)
  - [USING vs WITH CHECK](#using-vs-with-check)
  - [auth.uid(): quién está haciendo la consulta](#authuid-quién-está-haciendo-la-consulta)
  - [Las 3 policies de user_profiles](#las-3-policies-de-user_profiles)
  - [Qué pasa cuando GRANT o RLS bloquean algo](#qué-pasa-cuando-grant-o-rls-bloquean-algo)
  - [Comparación con lo que ya conocés](#comparación-con-lo-que-ya-conocés)
- [Los snippets del Studio](#los-snippets-del-studio)
- [Flujo completo](#flujo-completo)
- [Observaciones sobre el código de la clase](#observaciones-sobre-el-código-de-la-clase)
- [Cómo probarlo](#cómo-probarlo)
- [Resumen para el parcial](#resumen-para-el-parcial)

---

## ¿Qué se hizo esta clase?

Se resolvieron los `TODO` de la clase 11:

1. **Tiempo real en el chat privado:** ahora los mensajes aparecen al instante en la pantalla de los dos usuarios, sin recargar. Se usa un **canal de Realtime por conversación**, con un **filtro** para recibir solo los mensajes de esa conversación.
2. **Desuscripción:** cuando se sale de la pantalla del chat, el canal **se cierra** (hook `unmounted()`). Para eso, la función que suscribe **devuelve otra función** que desuscribe.
3. **Caché de los chats privados:** el servicio guarda en memoria las conversaciones que ya buscó, para no volver a preguntarle a Supabase cada vez.
4. **Seguridad:** se vieron los dos mecanismos de seguridad de Postgres, los **privilegios (GRANT / REVOKE)** y la **Row Level Security (RLS)**, y se aplicaron a la tabla `user_profiles`.

**Archivos nuevos:**

| Archivo | Qué es |
|---|---|
| `seguridad-postgres-supabase.md` | Apunte del profe: GRANTs y RLS |
| `supabase/snippets/Untitled query 927.sql` | Una consulta guardada desde el SQL Editor del Studio (las pruebas de la clase; no es una migración) |

**Archivos modificados:**

| Archivo | Qué cambió |
|---|---|
| `src/services/private-chat.js` | Caché `privateChatsCache` en `getOrCreatePrivateChatFor`; nueva función exportada `subscribeToNewPrivateChatMessages` (Realtime con filtro, devuelve la desuscripción) |
| `src/pages/PrivateChat.vue` | Se suscribe a los mensajes nuevos al montarse y se desuscribe en el nuevo hook `unmounted()` |
| `supabase/migrations/20261009011323_create_user_profiles_table.sql` | `REVOKE` / `GRANT`, se habilita RLS y se crean 3 policies |
| `src/services/auth.js` | Se comentó un `console.log` |

---

## Estructura de archivos

```
clase-12/
├── seguridad-postgres-supabase.md                       ← NUEVO (apunte del profe)
├── supabase/
│   ├── snippets/
│   │   └── Untitled query 927.sql                       ← NUEVO (consulta guardada del Studio)
│   └── migrations/
│       ├── 20260925010818_create_public_chat_messages_table.sql
│       ├── 20261009011323_create_user_profiles_table.sql        ← MODIFICADO (GRANTs + RLS)
│       ├── 20261023003327_create_private_chats_table.sql
│       └── 20261023003334_create_private_chats_messages_table.sql
└── src/
    ├── services/
    │   └── private-chat.js        ← MODIFICADO (caché + tiempo real)
    └── pages/
        └── PrivateChat.vue        ← MODIFICADO (suscripción + unmounted)
```

---

## Parte 1 — Tiempo real en el chat privado

### La función subscribeToNewPrivateChatMessages

Es la "hermana" de `subscribeToNewPublicChatMessages` (clase 07), pero para una conversación privada:

```js
export async function subscribeToNewPrivateChatMessages({ sender_id, receiver_id, callback }) {
    // 1. Necesitamos el id de la conversación
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    // 2. Creamos un canal propio para esta conversación
    const channel = supabase.realtime.channel(`private-chat:${chat.id}:messages`);

    // 3. Configuramos qué eventos escuchar
    channel.on(
        'postgres_changes',
        {
            event: 'INSERT',
            schema: 'public',
            table: 'private_chats_messages',
            filter: 'chat_id=eq.' + chat.id,     // solo los mensajes de ESTA conversación
        },
        payload => {
            callback(payload.new);
        }
    );

    // 4. Nos suscribimos para empezar a recibir
    channel.subscribe();

    // 5. Devolvemos una función para desuscribirse (ver Parte 2)
    return () => {
        channel.unsubscribe();
    }
}
```

| Paso | Qué hace |
|---|---|
| 1 | Obtiene la conversación entre los 2 usuarios (gracias al caché, casi siempre ya está en memoria) |
| 2 | Crea un canal con un nombre **único para esa conversación** |
| 3 | Escucha los `INSERT` en `private_chats_messages`, pero **solo los de este `chat_id`** |
| 4 | Se suscribe al canal |
| 5 | Devuelve una función que cierra el canal |

- Es `async` porque necesita esperar a tener la conversación (paso 1). Por eso, quien la llama tiene que hacer `await`.
- Recibe un **objeto** con tres propiedades: los dos ids y el `callback`, la función que se va a ejecutar con cada mensaje nuevo. Es el mismo estilo de "parámetros con nombre" que usa todo el servicio.
- `supabase.realtime.channel(...)` es otra forma de escribir `supabase.channel(...)` (la que se usó en el chat público): hacen lo mismo.

En `PrivateChat.vue`, después de cargar los mensajes:

```js
unsubscribeFromChat = await subscribeToNewPrivateChatMessages({
    sender_id: this.user.id,
    receiver_id: this.otherUser.id,
    callback: newMessage => this.messages.push(newMessage),
});
```

Con cada mensaje nuevo, el callback lo agrega a `this.messages` y, por la reactividad, aparece en la lista. Como en el chat público, `handleMessageSend` **no hace `push`**: el mensaje propio también llega por Realtime (si no, se vería duplicado).

### Convención para nombrar canales: scope:id:entity

```js
supabase.realtime.channel(`private-chat:${chat.id}:messages`)
// → por ejemplo: "private-chat:5:messages"
```

Supabase recomienda nombrar los canales con el formato **`scope:id:entity`**:

| Parte | Qué indica | En el ejemplo |
|---|---|---|
| `scope` | El ámbito, el "dónde" | `private-chat` |
| `id` | Cuál de esos ámbitos | `5` (el id de la conversación) |
| `entity` | De qué entidad queremos recibir notificaciones | `messages` |

Se lee: "los mensajes del chat privado 5". Así, cada conversación tiene **su propio canal**, y los nombres son únicos y fáciles de entender.

Se arma con un **template literal** (`` `...${chat.id}...` ``), como el link de la clase 11.

### Filtrar los eventos: filter

```js
filter: 'chat_id=eq.' + chat.id,     // → 'chat_id=eq.5'
```

Sin filtro, el canal recibiría los `INSERT` de **todas** las conversaciones (de todos los usuarios) y habría que descartar a mano los que no son de esta. Con `filter`, Supabase **solo manda los que cumplen la condición**.

El formato es **`columna=operador.valor`**:

| Filtro | Significa | SQL |
|---|---|---|
| `chat_id=eq.5` | `chat_id` igual a 5 | `WHERE chat_id = 5` |
| `chat_id=neq.5` | distinto de 5 | `WHERE chat_id <> 5` |
| `id=gt.10` | mayor a 10 (`gte`: mayor o igual) | `WHERE id > 10` |
| `id=lt.10` | menor a 10 (`lte`: menor o igual) | `WHERE id < 10` |
| `id=in.(1,2,3)` | está en la lista | `WHERE id IN (1, 2, 3)` |

Los operadores tienen **los mismos nombres** que los métodos del query builder (`.eq()`, `.neq()`, `.gt()`...), pero acá se escriben como texto.

### Chat público vs chat privado en Realtime

| | Chat público (clase 07) | Chat privado (clase 12) |
|---|---|---|
| Canal | Uno solo para todos: `'public_chat'` | **Uno por conversación**: `` `private-chat:${chat.id}:messages` `` |
| Tabla | `public_chat_messages` | `private_chats_messages` |
| Filtro | No (queremos todos los mensajes) | `chat_id=eq.<id>` (solo los de esta conversación) |
| Desuscripción | No tiene | Devuelve una función y se llama en `unmounted()` |
| ¿Es `async`? | No | Sí (primero necesita el id del chat) |

---

## Parte 2 — Desuscribirse: una función que devuelve otra función

### ¿Por qué hace falta desuscribirse?

Una suscripción a un canal **sigue viva aunque el componente desaparezca**. Si entrás al chat con Pepe, salís, y volvés a entrar, sin desuscribirse quedarían **dos** canales abiertos escuchando lo mismo, y el callback del primero intentaría hacer `push` en un componente que ya no existe. Cada visita sumaría uno más: es una **fuga de memoria** (*memory leak*) y de conexiones.

Es el mismo problema que venimos arrastrando con el observer de `auth.js` desde la clase 09 (el profe todavía tiene un `// TODO: Unsub` ahí). En esta clase se resolvió **para el canal del chat privado**.

### La función de desuscripción

`subscribeToNewPrivateChatMessages` **devuelve una función**:

```js
return () => {
    channel.unsubscribe();
}
```

Esa función "se acuerda" de cuál es su `channel`, aunque `subscribeToNewPrivateChatMessages` ya haya terminado. Esto en JS se llama **closure** (clausura): una función recuerda las variables del lugar donde se creó. Quien la llame no necesita saber nada del canal: solo ejecuta la función y listo.

#### Mejor: `supabase.removeChannel(channel)` en lugar de `channel.unsubscribe()`

El profe cierra el canal con `channel.unsubscribe()`. Funciona, pero **es mejor usar `supabase.removeChannel(channel)`** (como en el parcial 1, en `reviews.js`):

```js
return () => {
    supabase.removeChannel(channel);
}
```

Por dentro, `removeChannel` **llama a `channel.unsubscribe()`** y además hace `channel.teardown()`, que detiene los timers internos del canal. O sea: hace todo lo que hace `unsubscribe()` y además **libera los recursos del canal**. Es la forma de limpieza que recomienda la documentación de Supabase.

| | `channel.unsubscribe()` | `supabase.removeChannel(channel)` |
|---|---|---|
| Avisa al servidor que se deja el canal y deja de recibir eventos | ✅ | ✅ |
| Saca el canal de la lista del cliente | ✅ | ✅ |
| Hace `teardown()` (libera los recursos internos) | ❌ | ✅ |

Importa todavía más cuando el canal **siempre se llama igual** (por ejemplo, `'reviews'`): `supabase.channel(nombre)` devuelve **el canal que ya existe** si hay uno con ese nombre. Si el viejo no se cerró bien, al volver a entrar a la página se reutiliza un canal ya suscripto y falla el `.on()`.

En `PrivateChat.vue` se guarda en una variable **del módulo** (fuera del `export default`):

```js
let unsubscribeFromChat = () => {}
```

- Arranca con una **función vacía** (`() => {}`, que no hace nada). Así, si el componente se desmonta **antes** de que la suscripción termine (o si falló), llamar a `unsubscribeFromChat()` no tira error (llamar a `undefined()` sí lo haría).
- Cuando la suscripción termina, se reemplaza por la función real: `unsubscribeFromChat = await subscribeToNewPrivateChatMessages({...})`.
- Está fuera de `data()` porque **no necesita ser reactiva**: no se muestra en el template, solo se guarda para usarla después.

### El hook unmounted()

```js
unmounted() {
    unsubscribeFromChat();
}
```

Es la **primera vez** que aparece este hook del ciclo de vida. Es el "opuesto" de `mounted()`:

| Hook | Cuándo se ejecuta | Para qué |
|---|---|---|
| `mounted()` | Cuando el componente se agrega al DOM | Cargar datos, **suscribirse** |
| `unmounted()` | Cuando el componente se saca del DOM (por ejemplo, al navegar a otra página) | **Limpiar**: desuscribirse, cerrar conexiones, cancelar timers |

**Regla práctica:** todo lo que se abre en `mounted()` se cierra en `unmounted()`.

### Comparación con React

En React esto se hacía en un solo lugar: la función que devuelve el `useEffect` es la "limpieza".

| | React | Vue (API de Options) |
|---|---|---|
| Suscribirse al montar | `useEffect(() => { ... }, [])` | `mounted() { ... }` |
| Limpiar al desmontar | `return () => { desuscribir() }` adentro del `useEffect` | `unmounted() { desuscribir() }` |
| Dónde se guarda la función de desuscripción | No hace falta (queda en el closure del efecto) | En una variable (acá, del módulo) |

---

## Parte 3 — Caché de los chats privados

### ¿Qué es un caché y por qué acá?

Un **caché** es cualquier lugar que **guarda en memoria información que ya obtuvimos**, para no tener que volver a buscarla. Puede ser algo tan simple como una variable.

En el chat privado, cada vez que se cargan los mensajes, se manda uno o se suscribe al canal, se llama a `getOrCreatePrivateChatFor()`, que va **a la red** (a Supabase) a buscar la conversación. Solo con abrir la pantalla son **2 consultas** (cargar los mensajes y suscribirse), y una más por cada mensaje enviado.

Pero los datos de una conversación (su id y sus 2 usuarios) **no cambian nunca** una vez creada. No hay razón para volver a pedirlos: se pueden **cachear**.

### Un objeto como caché

```js
let privateChatsCache = {};
```

Se usa un **objeto como diccionario**:
- La **clave** es la unión de los 2 ids **ordenados**, con un guion bajo: `"userId1_userId2"`.
- El **valor** es el objeto de la conversación.

```js
privateChatsCache = {
    "1f0c2a9e-..._7b3d55aa-...": { id: 5, user_id1: "1f0c2a9e-...", user_id2: "7b3d55aa-...", created_at: "..." },
    "1f0c2a9e-..._c4e81b02-...": { id: 8, ... },
}
```

La clave se arma así:

```js
const cacheKey = sortUserIdsForPrivateChat([ sender_id, receiver_id ]).join('_');
```

- Se **ordenan** los ids (por la misma razón que en la clase 11: `[A, B]` y `[B, A]` tienen que dar la misma clave).
- **`join('_')`** une los elementos del array en un string, poniendo `'_'` entre cada uno: `['abc', 'xyz'].join('_')` → `'abc_xyz'`.

Se accede con **corchetes**, porque la clave está en una variable: `privateChatsCache[cacheKey]`. (Con punto, `privateChatsCache.cacheKey`, buscaría una propiedad que se llama literalmente "cacheKey".)

> El profe aclara que también se podría usar un **`Map`** o un **`Set`**, según lo que se necesite. Un `Map` es parecido a un objeto, pero pensado específicamente para ser un diccionario (`cache.get(clave)`, `cache.set(clave, valor)`, `cache.has(clave)`).

### El flujo: caché → red → crear

```js
async function getOrCreatePrivateChatFor({ sender_id, receiver_id }) {
    const cacheKey = sortUserIdsForPrivateChat([ sender_id, receiver_id ]).join('_');

    // 1. ¿Está en el caché? → la devolvemos sin ir a la red
    if(privateChatsCache[cacheKey]) {
        return privateChatsCache[cacheKey];
    }

    // 2. No está → la buscamos en Supabase
    let chat = await getPrivateChatFor({ sender_id, receiver_id });

    // 3. No existe → la creamos
    if(!chat) {
        chat = await createPrivateChat({ sender_id, receiver_id });
    }

    // 4. La guardamos en el caché para la próxima
    privateChatsCache[cacheKey] = chat;

    return chat;
}
```

```
¿Está en el caché? ──sí──► devolverla (0 consultas)
        │ no
        ▼
¿Existe en Supabase? ──sí──► guardarla en el caché ──► devolverla (1 consulta)
        │ no
        ▼
Crearla en Supabase ──► guardarla en el caché ──► devolverla (2 consultas)
```

Fijate que es el patrón "buscar o crear" de la clase 11, con un paso más **adelante**: primero buscar en memoria.

Los `console.log` comentados en el código del profe sirven para ver este recorrido en la consola: si los descomentás, vas a ver cuándo la conversación sale del caché y cuándo va a la red.

### Limitaciones del caché

| Limitación | Por qué no es problema acá (o cuándo sí lo sería) |
|---|---|
| Vive **en la memoria de la pestaña**: se pierde al recargar la página | Se vuelve a llenar solo, con la primera búsqueda |
| Cada pestaña o navegador tiene **su propio** caché | Cada uno lo llena por su cuenta |
| Si el dato **cambiara** en la base, el caché quedaría desactualizado | Las conversaciones no cambian una vez creadas. Para datos que sí cambian (por ejemplo, perfiles) habría que **invalidar** el caché |
| **Nunca se vacía**: crece con cada conversación abierta | Son objetos chiquitos; no es un problema en la práctica |

> **Alternativa profesional:** librerías como **TanStack Query** (que mencionábamos en React) manejan el caché, la invalidación y la recarga automáticamente. Lo que hicimos acá es la versión "a mano" de la misma idea.

---

## Parte 4 — Seguridad en Postgres y Supabase

### ¿Por qué la seguridad va en la base?

Desde la clase 09 venimos diciendo que **lo que está en el front no da seguridad**: el código JS lo puede ver y modificar cualquiera, y la publishable key es pública. Cualquiera podría armar su propio script con nuestra URL y nuestra publishable key y hacer `supabase.from('user_profiles').update({ bio: 'hackeado' }).eq('id', '<id de otra persona>')`.

**Supabase delega la seguridad en Postgres.** Y Postgres ofrece principalmente **2 mecanismos**:

| Mecanismo | Qué controla | Nivel |
|---|---|---|
| **Privilegios (GRANT / REVOKE)** | **Qué operaciones** (SELECT, INSERT, UPDATE, DELETE) puede hacer un rol sobre una tabla | Toda la tabla |
| **Row Level Security (RLS)** | **Sobre qué filas** puede hacer esa operación | Cada fila |

Funcionan **en capas**: primero se chequean los GRANTs (¿este rol puede hacer un UPDATE en esta tabla?) y, si pasa, después las RLS (¿y puede hacerlo sobre **esta** fila?).

```
Consulta desde el front
        ↓
¿El rol tiene GRANT para esta operación en esta tabla?  ── no ──► error "permission denied"
        ↓ sí
¿La tabla tiene RLS? ── no ──► se ejecuta sobre todas las filas que pida
        ↓ sí
Para cada fila: ¿cumple alguna policy? ── no ──► esa fila se ignora (o error, en un INSERT)
        ↓ sí
Se ejecuta sobre esa fila
```

### Los roles: anon, authenticated y service_role

Ojo: cuando se habla de "usuarios y roles" en los GRANTs, **no son los usuarios de `auth.users`**, sino los **usuarios y roles de la base de datos** (los que se conectan a Postgres). Supabase usa estos 3:

| Rol | Quién lo usa |
|---|---|
| `anon` | **Todos los usuarios que NO están logueados.** Es el rol de las consultas que se hacen solo con la publishable key |
| `authenticated` | **Todos los usuarios logueados.** Supabase lo usa cuando la consulta viene con la sesión (el JWT) de un usuario |
| `service_role` | Para conectarse a Postgres **desde un backend** propio, con la *secret key*. Se saltea las RLS. **No aplica** a la API pública (como el cliente de JS en el navegador) |

El cliente de JS manda automáticamente la sesión del usuario logueado en cada consulta. Por eso **la misma línea de código** se ejecuta como `anon` o como `authenticated` según si hay alguien logueado o no.

> **Comparación con phpMyAdmin:** es la pestaña "Cuentas de usuario / Privilegios", donde le dabas a un usuario de MySQL permisos de SELECT, INSERT, etc. sobre una base o una tabla.

### Mecanismo 1: privilegios con GRANT y REVOKE

Son parte del **estándar de SQL** (existen igual en MySQL). Permiten detallar **qué consultas puede ejecutar cada rol sobre cada estructura** (tablas, schemas, etc.).

```sql
GRANT  <operaciones> ON <tabla> TO   <roles>;    -- dar privilegios
REVOKE <operaciones> ON <tabla> FROM <roles>;    -- sacar privilegios
```

En la migración de `user_profiles`:

```sql
REVOKE all ON public.user_profiles FROM anon, authenticated;
GRANT select, insert, update ON public.user_profiles TO authenticated;
```

| Línea | Qué hace |
|---|---|
| `REVOKE all ... FROM anon, authenticated` | Le saca **todos** los privilegios a los dos roles: se arranca de cero |
| `GRANT select, insert, update ... TO authenticated` | Les da a los **logueados** permiso para leer, crear y editar perfiles |

Resultado:
- Los usuarios **no logueados (`anon`)** no pueden hacer **nada** con los perfiles.
- Los **logueados** pueden hacer SELECT, INSERT y UPDATE, pero **no DELETE** (nadie puede borrar perfiles).

**Principio del mínimo privilegio:** asignar solo los privilegios **indispensables** para cada rol, y ninguno más. Por eso el patrón es **"primero revocar todo y después dar lo que haga falta"**.

### El cambio de Supabase (30/10/2026)

Hasta el 30/10/2026, Supabase les daba **automáticamente** a `anon`, `authenticated` y `service_role` los privilegios de SELECT, INSERT, UPDATE y DELETE sobre las tablas nuevas. Por eso hasta ahora todas nuestras tablas funcionaban desde el front sin escribir ningún GRANT.

**A partir de esa fecha, Supabase deja de dárselos a `anon` y `authenticated`.** Las tablas nuevas, entonces, no son accesibles desde el front hasta que se les den los GRANTs a mano.

De todas formas, **la práctica recomendada siempre fue la misma**: revocar todo a esos dos roles y dar solo lo necesario, como se hizo en `user_profiles`.

> **Para tener en cuenta:** las otras tablas (`public_chat_messages`, `private_chats`, `private_chats_messages`) todavía no tienen GRANTs explícitos. Si al actualizar el CLI de Supabase alguna consulta empieza a dar `permission denied for table ...`, la causa es esta: les faltan los GRANTs.

### Mecanismo 2: Row Level Security (RLS)

**RLS** (seguridad a nivel de fila) es una funcionalidad de Postgres que permite agregar **condiciones que un rol tiene que cumplir para acceder a cada fila** de una tabla.

- Corre **después** de los GRANTs.
- Se evalúa **con cada fila** afectada por la consulta.
- Se puede pensar como si Postgres **agregara automáticamente una cláusula `WHERE`** a cada consulta.

Por ejemplo, con una policy "cada usuario solo puede editar su perfil", cuando Sara hace:

```js
supabase.from('user_profiles').update({ bio: 'hola' }).eq('id', '<id de Pepe>')
```

Postgres, en la práctica, ejecuta algo como:

```sql
UPDATE user_profiles SET bio = 'hola'
WHERE id = '<id de Pepe>'
  AND id = '<id de Sara>';     -- ← la condición que agrega la policy
```

Ninguna fila cumple las dos condiciones, así que **no se modifica nada**.

**Paso 1 — Habilitar RLS en la tabla:**

```sql
ALTER TABLE public.user_profiles enable row level security;
```

**Ojo:** apenas se habilita RLS, **se bloquean todas las filas para todas las consultas** (SELECT, INSERT, UPDATE, DELETE). Es "denegar todo por defecto". Para que vuelvan a funcionar, hay que crear **policies**.

**Paso 2 — Crear las policies** (las reglas que dicen quién puede acceder a qué filas).

### CREATE POLICY, parte por parte

```sql
CREATE POLICY <nombre>
ON <tabla>
[AS PERMISSIVE | RESTRICTIVE]
FOR <operación>
TO <roles>
[USING (<condición>)]
[WITH CHECK (<condición>)];
```

(Lo que está entre corchetes es opcional.)

| Parte | Qué es |
|---|---|
| `<nombre>` | El nombre de la policy. Cualquier texto, **entre comillas dobles** (`"..."`) porque es el nombre de una estructura, no un valor (los valores van con comillas simples `'...'`) |
| `ON <tabla>` | A qué tabla se aplica |
| `AS PERMISSIVE \| RESTRICTIVE` | Qué hacer si **varias** policies aplican a la misma consulta: `PERMISSIVE` (el default, el que usamos) une sus condiciones con **OR** (alcanza con cumplir una); `RESTRICTIVE` las une con **AND** (hay que cumplir todas) |
| `FOR <operación>` | A qué consulta aplica: `SELECT`, `INSERT`, `UPDATE`, `DELETE` o `ALL`. **Una sola por policy** (no se puede poner `SELECT, INSERT`). La recomendación es **no usar nunca `ALL`** |
| `TO <roles>` | A qué roles se aplica (por ejemplo, `authenticated`) |
| `USING (...)` | Condición para las filas que se **leen** o se **buscan** |
| `WITH CHECK (...)` | Condición para las filas que se **escriben** |

### USING vs WITH CHECK

| | `USING` | `WITH CHECK` |
|---|---|---|
| Qué controla | Qué filas **existentes** se pueden ver o tocar | Cómo pueden quedar las filas **nuevas o modificadas** |
| Se usa en | `SELECT`, `UPDATE`, `DELETE` (las que leen o buscan filas) | `INSERT`, `UPDATE` (las que escriben filas) |
| Pregunta que responde | "¿Puedo acceder a esta fila?" | "¿Puedo dejar la fila así?" |

| Operación | `USING` | `WITH CHECK` |
|---|---|---|
| `SELECT` | ✅ | — |
| `INSERT` | — | ✅ |
| `UPDATE` | ✅ (qué filas puedo editar) | ✅ (cómo pueden quedar después de editarlas) |
| `DELETE` | ✅ | — |

En el `UPDATE` se suele poner **la misma condición en los dos**: "solo puedo editar **mi** perfil" (`USING`) y "después de editarlo, **tiene que seguir siendo** mi perfil" (`WITH CHECK`). Sin el `WITH CHECK`, alguien podría editar su propio perfil y cambiarle el `id` por el de otra persona.

### auth.uid(): quién está haciendo la consulta

```sql
(select auth.uid()) = id
```

- **`auth.uid()`** es una función helper de Supabase que devuelve **el id del usuario logueado que está haciendo la consulta** (lo saca de la sesión, del JWT que manda el cliente de JS). Si no hay nadie logueado, devuelve `null`.
- `id` es la columna `id` de la fila que se está evaluando.
- La condición se lee: "el usuario que hace la consulta es el dueño de esta fila".
- Se escribe `(select auth.uid())` y no `auth.uid()` a secas por **rendimiento**: con el `select` entre paréntesis, Postgres calcula el valor **una sola vez** por consulta, en lugar de una vez **por cada fila**. Es la forma que recomienda Supabase.

> Es lo mismo que hacías en Express con el middleware de JWT: `if (req.user.id !== perfil.id) return res.status(403)...`. Pero acá lo hace **la base de datos**, así que no hay forma de saltearlo desde el front.

### Las 3 policies de user_profiles

Lo que se quiere:
- Los usuarios logueados pueden **ver cualquier perfil**.
- Los usuarios logueados pueden **crear su propio perfil**.
- Los usuarios logueados pueden **editar su propio perfil**.

**1. Ver cualquier perfil:**

```sql
CREATE POLICY "Auth users can view profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);
```

`USING (true)`: la condición siempre se cumple, así que **todas** las filas son visibles. No hace falta pedir nada más, porque `TO authenticated` ya garantiza que solo aplica a usuarios logueados.

**2. Crear su propio perfil:**

```sql
CREATE POLICY "Auth users can create their profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
    (select auth.uid()) = id
);
```

Solo se puede insertar un perfil **cuyo `id` sea el del usuario logueado**. Es justo lo que hace `register()` → `createUserProfile({ id: data.user.id, email })` después del `signUp`. Nadie puede crear un perfil "a nombre" de otro.

**3. Editar su propio perfil:**

```sql
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
```

Solo se puede editar la fila propia, y tiene que seguir siendo propia después de editarla. Es lo que usa `updateAuthUserProfile()` desde la página Editar perfil.

**No hay policy de `DELETE`** (y tampoco hay GRANT de DELETE): nadie puede borrar perfiles desde el front.

**Resumen de quién puede qué en `user_profiles`:**

| | Sin loguear (`anon`) | Logueado (`authenticated`) |
|---|---|---|
| Ver perfiles | ❌ (sin GRANT) | ✅ todos |
| Crear un perfil | ❌ | ✅ solo el propio |
| Editar un perfil | ❌ | ✅ solo el propio |
| Borrar un perfil | ❌ | ❌ (sin GRANT ni policy) |

### Qué pasa cuando GRANT o RLS bloquean algo

No siempre aparece un error. Es importante saberlo para no volverse loca debuggeando:

| Situación | Qué devuelve Supabase |
|---|---|
| Falta el **GRANT** (por ejemplo, `anon` intenta leer perfiles) | **Error**: `permission denied for table user_profiles` (código `42501`) |
| **RLS** en un `SELECT`: ninguna fila cumple las policies | **Sin error**: `data` viene como array vacío `[]` |
| **RLS** en un `UPDATE` o `DELETE` sobre filas ajenas | **Sin error**: simplemente no se modifica ninguna fila |
| **RLS** en un `INSERT` que no cumple el `WITH CHECK` | **Error**: `new row violates row-level security policy for table "user_profiles"` |

> Por eso, si un `select` "no trae nada" o un `update` "no hace nada" sin dar error, lo primero a revisar son las **policies**.

### Comparación con lo que ya conocés

| | Express + MongoDB (Aplicaciones Híbridas) | Laravel | Supabase (Postgres) |
|---|---|---|---|
| ¿Quién puede usar el recurso? | Middleware que valida el JWT | Middleware `auth` | **GRANT** al rol `authenticated` |
| ¿Puede tocar **este** registro? | `if (req.user.id !== doc.userId)` en el controller | **Policies** (`$this->authorize('update', $profile)`) | **RLS** con `auth.uid() = id` |
| ¿Dónde vive la regla? | En el código del backend | En el código del backend | **En la base de datos** |

---

## Los snippets del Studio

La carpeta nueva `supabase/snippets/` tiene un archivo `Untitled query 927.sql`. Son las **consultas guardadas desde el SQL Editor** del Studio local: el profe fue probando ahí el `REVOKE`, el `GRANT` y las policies antes de pasarlos a la migración.

- **No es una migración**: no se ejecuta con `migration up` ni con `db reset`.
- Sirve como "borrador" o historial de pruebas. Lo que tiene que quedar en la base va siempre en una migración.

---

## Flujo completo

```
[Abrir el chat con Pepe]
PrivateChat mounted()
   1. subscribeToAuthStateChange → this.user = Sara
   2. getUserProfileById(this.$route.params.id) → this.otherUser = Pepe
         (RLS: Sara está logueada → la policy de SELECT con USING (true) la deja leer el perfil)
   3. getLastPrivateChatMessages(...)
         → getOrCreatePrivateChatFor → no está en el caché → SELECT en Supabase → la guarda en el caché
         → SELECT de los mensajes
   4. subscribeToNewPrivateChatMessages(...)
         → getOrCreatePrivateChatFor → ¡está en el caché! (0 consultas)
         → canal "private-chat:5:messages", filtro chat_id=eq.5 → subscribe()
         → devuelve la función de desuscripción → unsubscribeFromChat

[Pepe le manda un mensaje a Sara]
INSERT en private_chats_messages (chat_id = 5)
        ↓
Realtime: el INSERT cumple el filtro chat_id=eq.5 → avisa a los suscriptos de ese canal
        ↓
En la pantalla de Sara (y en la de Pepe): callback(payload.new) → this.messages.push(...) → aparece

[Sara sale del chat]
Navega a otra página → PrivateChat unmounted() → unsubscribeFromChat() → channel.unsubscribe()

[Sara edita su perfil]
updateAuthUserProfile(...) → UPDATE user_profiles ... WHERE id = <Sara>
   GRANT: authenticated tiene UPDATE ✅ → RLS: USING (auth.uid() = id) ✅ → WITH CHECK ✅ → se guarda
```

---

## Observaciones sobre el código de la clase

| Dónde | Qué pasa | Cómo se arreglaría |
|---|---|---|
| Migración de `user_profiles` | Se **editó** una migración ya aplicada (se le sumaron los GRANTs y las RLS) | Hay que correr `supabase db reset` (como con `sender_id` en la clase 10). En un proyecto real: migración nueva |
| Las otras 3 tablas | `public_chat_messages`, `private_chats` y `private_chats_messages` **siguen sin RLS**: cualquier usuario logueado podría leer los mensajes de cualquier conversación privada (incluso suscribirse al canal de otro chat cambiando el filtro) | Es el `TODO` del profe: "Completar RLS". Por ejemplo, que solo los 2 participantes (`user_id1` o `user_id2`) puedan leer y escribir en su conversación |
| `register()` + RLS | El INSERT del perfil funciona porque `signUp` deja a la usuaria **logueada** al toque (en el local no se pide confirmar el email). Si se activara la confirmación por email, no habría sesión, la consulta iría como `anon` y el INSERT fallaría | Crear el perfil desde la base con un *trigger*, en vez de desde el front |
| `PrivateChat.vue` → `handleMessageSend` | Sigue sin `await` y con el `catch` que solo relanza el error | `await sendPrivateChatMessage({ ... });` y manejar el error |
| `PrivateChat.vue` → navegación | Si se pasa de `/usuario/A/chat` a `/usuario/B/chat` sin salir de la página, Vue reutiliza el componente: no se ejecutan ni `unmounted()` ni `mounted()`, y queda abierto el canal del chat con A | Escuchar los cambios de `$route.params.id` (con `watch`) y re-suscribirse |
| `PrivateChat.vue` → `unsubscribeFromChat` | Es una variable del **módulo**: la comparten todas las instancias del componente (hoy no es un problema, porque solo hay una a la vez) | Guardarla en la instancia (por ejemplo, `this.unsubscribeFromChat` asignada en `mounted()`) |
| `auth.js` | Sigue el `// TODO: Unsub`: el observer de autenticación todavía no permite desuscribirse (lo de esta clase fue solo para el canal del chat privado) | Aplicar el mismo patrón: que `subscribeToAuthStateChange` devuelva una función de desuscripción |
| `private-chat.js` → caché | Quedó un `else { }` vacío (solo tenía un `console.log` comentado) | Se puede borrar |
| `private-chat.js` | Los mensajes siguen sin `.order()` | `.order('created_at')` |

**`TODO` del profe para las próximas clases:** completar las RLS (las demás tablas) y **subida de archivos** (*upload*, probablemente con Supabase Storage).

---

## Cómo probarlo

```bash
# Desde clase-12/ (con Docker Desktop abierto)
npm install                 # pnpm install
npx supabase start          # pnpm supabase start
npx supabase db reset       # pnpm supabase db reset   → OBLIGATORIO: la migración de user_profiles cambió
npm run dev                 # pnpm dev
```

**Tiempo real:**
1. En un navegador, ingresar como `sara@za.com` / `asdasd` y abrir el chat privado con Pepe.
2. En otro navegador (o ventana de incógnito), ingresar como `pepe@trueno.com` / `asdasd` y abrir el chat con Sara.
3. Mandar mensajes desde los dos lados: tienen que aparecer **al instante en las dos pantallas**, sin recargar.

**Caché:** descomentar los `console.log` de `getOrCreatePrivateChatFor` y abrir el chat: la primera vez dice que lo busca en la red, y las siguientes (por ejemplo, al suscribirse o al mandar un mensaje) que lo encontró en el caché.

**Desuscripción:** en DevTools → Network → **WS**, ver los mensajes de la conexión de Realtime: al salir del chat se manda el aviso de salida del canal (`phx_leave`).

**RLS:**
- En el Studio → *Authentication* → *Policies* (o en *Table Editor* → `user_profiles`) se ven las 3 policies y el aviso de que la tabla tiene RLS habilitado.
- Editar el propio perfil desde la app (Mi perfil → Editar): ✅ funciona.
- Para probar que **no** se puede editar el perfil de otra persona, agregar temporalmente en algún `mounted()` (estando logueada como Sara) una llamada como `updateUserProfile('<id de Pepe>', { bio: 'hackeado' })`: no da error, pero en el Studio se ve que la bio de Pepe **no cambió** (su fila no cumple el `USING`). Después, borrar esa línea.
- Sin sesión, una consulta a `user_profiles` devuelve el error `permission denied for table user_profiles` (`anon` no tiene GRANT).

---

## Resumen para el parcial

- **Realtime por conversación:** un canal por chat (`` `private-chat:${chat.id}:messages` ``) con `filter: 'chat_id=eq.' + chat.id`.
- Convención de nombres de canales: **`scope:id:entity`**.
- Formato de los filtros de Realtime: **`columna=operador.valor`** (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`).
- Una suscripción sigue viva aunque el componente desaparezca: hay que **desuscribirse** (si no, memory leak).
- La función que suscribe **devuelve otra función** que desuscribe (un *closure* que recuerda el canal).
- Para cerrar un canal, mejor **`supabase.removeChannel(channel)`** que `channel.unsubscribe()`: hace lo mismo y además libera los recursos del canal (`teardown()`).
- **`unmounted()`**: hook que se ejecuta al sacar el componente del DOM → limpiar lo que se abrió en `mounted()`.
- Variable inicializada con `() => {}` para poder llamarla sin error aunque la suscripción no haya terminado.
- **Caché** = guardar en memoria datos que ya se obtuvieron. Las conversaciones no cambian → se pueden cachear.
- Objeto como diccionario: clave `ids.sort().join('_')`, acceso con `cache[clave]`. Orden: caché → red → crear.
- El caché vive en la memoria de la pestaña (se pierde al recargar) y sirve para datos que no cambian.
- **Supabase delega la seguridad en Postgres**: GRANTs (qué operaciones en qué tabla) + RLS (sobre qué filas).
- Roles: **`anon`** (no logueados), **`authenticated`** (logueados), **`service_role`** (backend, se saltea RLS).
- `REVOKE all ON tabla FROM anon, authenticated;` + `GRANT select, ... ON tabla TO authenticated;` = **mínimo privilegio**.
- Desde el 30/10/2026, Supabase ya no da GRANTs automáticos a `anon` y `authenticated`.
- `ALTER TABLE ... enable row level security;` → **bloquea todo** hasta que se creen policies.
- `CREATE POLICY "nombre" ON tabla FOR operación TO rol USING (...) WITH CHECK (...);`
- Una operación por policy; nunca `ALL`. `PERMISSIVE` (default) une con OR; `RESTRICTIVE` con AND.
- **`USING`** = qué filas existentes se pueden leer o tocar (SELECT, UPDATE, DELETE). **`WITH CHECK`** = cómo pueden quedar las filas escritas (INSERT, UPDATE).
- **`(select auth.uid())`** = id del usuario logueado que hace la consulta (con `select` para que se calcule una sola vez).
- `USING (true)` = todas las filas.
- Sin GRANT → **error** "permission denied". RLS en SELECT / UPDATE / DELETE → **sin error**, simplemente no hay filas. RLS en INSERT → **error**.
