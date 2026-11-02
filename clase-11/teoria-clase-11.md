# Clase 11 — Chat privado: modelado de datos, normalización y "buscar o crear"

## Índice

- [¿Qué se hizo esta clase?](#qué-se-hizo-esta-clase)
- [Estructura de archivos](#estructura-de-archivos)
- [Parte 1 — Diseñar la base de datos del chat privado](#parte-1--diseñar-la-base-de-datos-del-chat-privado)
  - [¿Qué hay que guardar?](#qué-hay-que-guardar)
  - [Las dos tablas](#las-dos-tablas)
  - [Las migraciones](#las-migraciones)
  - [El orden de las migraciones importa](#el-orden-de-las-migraciones-importa)
- [Parte 2 — Normalización: la 1NF y por qué la estamos rompiendo](#parte-2--normalización-la-1nf-y-por-qué-la-estamos-rompiendo)
  - [¿Qué es normalizar?](#qué-es-normalizar)
  - [La Primera Forma Normal (1NF)](#la-primera-forma-normal-1nf)
  - [Por qué private_chats la rompe](#por-qué-private_chats-la-rompe)
  - [Cómo sería el diseño correcto](#cómo-sería-el-diseño-correcto)
  - [¿Cuándo está bien desnormalizar?](#cuándo-está-bien-desnormalizar)
- [Parte 3 — El servicio private-chat.js](#parte-3--el-servicio-private-chatjs)
  - [El problema del orden de los ids](#el-problema-del-orden-de-los-ids)
  - [Funciones privadas y funciones exportadas](#funciones-privadas-y-funciones-exportadas)
  - [Buscar el chat: varios .eq() encadenados](#buscar-el-chat-varios-eq-encadenados)
  - [Crear el chat: .insert().select()](#crear-el-chat-insertselect)
  - [El patrón "buscar o crear"](#el-patrón-buscar-o-crear)
  - [Mandar un mensaje y leer los mensajes](#mandar-un-mensaje-y-leer-los-mensajes)
- [Parte 4 — La interfaz](#parte-4--la-interfaz)
  - [La ruta /usuario/:id/chat](#la-ruta-usuarioidchat)
  - [El link desde el perfil: template literals](#el-link-desde-el-perfil-template-literals)
  - [La página PrivateChat.vue](#la-página-privatechatvue)
  - [Clases dinámicas con :class](#clases-dinámicas-con-class)
- [Flujo completo](#flujo-completo)
- [Observaciones sobre el código de la clase](#observaciones-sobre-el-código-de-la-clase)
- [Referencia rápida: comandos del CLI de Supabase (migraciones y seed)](#referencia-rápida-comandos-del-cli-de-supabase-migraciones-y-seed)
- [Cómo probarlo](#cómo-probarlo)
- [Resumen para el parcial](#resumen-para-el-parcial)

---

## ¿Qué se hizo esta clase?

Se arrancó el **chat privado entre dos usuarios**: desde el perfil de otro usuario hay un link "Ir a la conversación privada", que lleva a una pantalla donde se ven los mensajes de esa conversación y se pueden mandar nuevos.

Para eso se vio:
1. **Cómo diseñar las tablas** de la base de datos para guardar conversaciones y sus mensajes.
2. **Normalización** (la 1NF) y por qué, en este caso puntual, el profe decidió no cumplirla.
3. Un **servicio nuevo** con el patrón **"buscar o crear"**: si la conversación entre los dos usuarios no existe, se crea en el momento.
4. En el front: una **ruta nueva** con parámetro, **template literals** en `:to` y **clases dinámicas** con `:class` (mis mensajes a la derecha y en verde, los del otro a la izquierda y en gris).

> El chat privado **todavía no está completo**: falta el **tiempo real** (los mensajes nuevos no aparecen sin recargar) y las **RLS** (por ahora no es realmente "privado"). Quedaron como `TODO` para la próxima clase.

**Archivos nuevos:**

| Archivo | Qué es |
|---|---|
| `chat-privado.md` | Apunte del profe: diseño de las tablas y la nota sobre la 1NF |
| `supabase/migrations/20261023003327_create_private_chats_table.sql` | Tabla `private_chats` (las conversaciones) |
| `supabase/migrations/20261023003334_create_private_chats_messages_table.sql` | Tabla `private_chats_messages` (los mensajes), con Realtime |
| `src/services/private-chat.js` | Servicio del chat privado: buscar o crear la conversación, mandar y leer mensajes |
| `src/pages/PrivateChat.vue` | Página de la conversación privada (ruta `/usuario/:id/chat`) |

**Archivos modificados:**

| Archivo | Qué cambió |
|---|---|
| `src/router/router.js` | Ruta nueva `/usuario/:id/chat` (con `requiresAuth`) |
| `src/pages/UserProfile.vue` | Un `<hr>` y el link "Ir a la conversación privada con ..." |
| `src/services/auth.js` | Un `// TODO: Unsub` (el profe reconoce que falta poder desuscribirse del observer) |
| `src/App.vue`, `supabase/seed.sql` | Se borraron `TODO` que ya estaban resueltos |

---

## Estructura de archivos

```
clase-11/
├── chat-privado.md                                           ← NUEVO (apunte del profe)
├── supabase/
│   └── migrations/
│       ├── 20260925010818_create_public_chat_messages_table.sql
│       ├── 20261009011323_create_user_profiles_table.sql
│       ├── 20261023003327_create_private_chats_table.sql            ← NUEVO
│       └── 20261023003334_create_private_chats_messages_table.sql   ← NUEVO
└── src/
    ├── router/
    │   └── router.js                ← MODIFICADO (/usuario/:id/chat)
    ├── services/
    │   └── private-chat.js          ← NUEVO
    └── pages/
        ├── UserProfile.vue          ← MODIFICADO (link al chat privado)
        └── PrivateChat.vue          ← NUEVO
```

---

## Parte 1 — Diseñar la base de datos del chat privado

### ¿Qué hay que guardar?

Antes de escribir código, el profe arrancó por **pensar qué datos hay que almacenar**. Con una restricción para simplificar: **las conversaciones son solo entre 2 usuarios** (no hay chats grupales).

Hay que guardar:
1. **Las conversaciones que existen**, incluyendo **qué usuarios participan**.
2. **Los mensajes de cada conversación**, incluyendo **quién lo mandó**.

### Las dos tablas

```
private_chats                         private_chats_messages
─────────────────────                 ─────────────────────────
id          bigint  PK   ◄──────┐     id          bigint  PK
user_id1    uuid    FK → auth.users   chat_id     bigint  FK → private_chats
user_id2    uuid    FK → auth.users   sender_id   uuid    FK → auth.users
created_at  timestamptz               body        text
                                 └────created_at  timestamptz
```

| Relación | Tipo |
|---|---|
| Una conversación tiene **muchos** mensajes | 1 a muchos (`chat_id` en los mensajes) |
| Un usuario manda **muchos** mensajes | 1 a muchos (`sender_id`) |
| Una conversación tiene **2** usuarios | `user_id1` y `user_id2` (ver la Parte 2) |

> Es el mismo razonamiento que hacías en Laravel al diseñar un **DER** (diagrama entidad-relación) antes de escribir las migraciones. Comparado con MongoDB, ahí quizás habrías guardado los mensajes como un array adentro del documento de la conversación; en SQL, cada mensaje es una fila en otra tabla.

### Las migraciones

```sql
-- 20261023003327_create_private_chats_table.sql
CREATE TABLE private_chats (
    id bigint primary key generated always as identity,
    user_id1 uuid not null references auth.users (id),
    user_id2 uuid not null references auth.users (id),
    created_at timestamptz default now()
);
```

```sql
-- 20261023003334_create_private_chats_messages_table.sql
CREATE TABLE private_chats_messages (
    id bigint primary key generated always as identity,
    chat_id bigint not null references public.private_chats (id),
    sender_id uuid not null references auth.users (id),
    body text not null,
    created_at timestamptz default now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE private_chats_messages;
```

| Detalle | Por qué |
|---|---|
| `chat_id bigint` | Tiene que ser del **mismo tipo** que la PK a la que apunta (`private_chats.id` es `bigint`) |
| `references public.private_chats (id)` | FK a una tabla **nuestra** (schema `public`), no a `auth` |
| `body text not null` | A diferencia del chat público, acá un mensaje vacío no se acepta |
| `ALTER PUBLICATION supabase_realtime ADD TABLE private_chats_messages` | Se habilita Realtime en los **mensajes** (para el tiempo real que falta implementar). En `private_chats` no hace falta |

Esta vez sí se crearon **migraciones nuevas** (con `supabase migration new ...`), así que alcanza con `supabase migration up` para aplicarlas (o `db reset` si se quiere empezar de cero).

### El orden de las migraciones importa

Las migraciones se ejecutan **en el orden del número del nombre** (fecha y hora de creación). Fijate que la de `private_chats` (`...003327`) se creó **antes** que la de los mensajes (`...003334`).

Tiene que ser así: `private_chats_messages` tiene una FK a `private_chats`, y **no se puede crear una FK a una tabla que todavía no existe**. Si se ejecutaran al revés, la segunda migración fallaría.

> Es lo mismo que en Laravel: la migración de `posts` (con `user_id`) tiene que correr después de la de `users`.

---

## Parte 2 — Normalización: la 1NF y por qué la estamos rompiendo

### ¿Qué es normalizar?

**Normalizar** una base de datos es organizar las tablas siguiendo unas reglas (las **formas normales**: 1NF, 2NF, 3NF...) para **evitar datos repetidos e inconsistencias**. Cada forma normal suma una regla sobre la anterior. Una base que no las cumple está **desnormalizada**.

### La Primera Forma Normal (1NF)

La 1NF dice que **no tiene que haber "grupos repetidos"**. En concreto:
- **No tener columnas con múltiples valores**: cada columna guarda un solo valor (un valor "escalar"). Por ejemplo, nada de `usuarios = '2,7'`.
- **No tener múltiples columnas que enumeren una lista de valores**: por ejemplo, `telefono1`, `telefono2`, `telefono3`.

La forma correcta de resolver una lista es **separarla en una tabla nueva**, relacionada con la original.

### Por qué private_chats la rompe

`user_id1` y `user_id2` son **dos columnas que enumeran una lista** (la lista de participantes). Es el caso de `telefono1`, `telefono2`: un grupo repetido.

El profe lo hizo así **a propósito**, porque:
- La restricción del sistema es que las conversaciones son **siempre de 2 usuarios**, y suponemos que eso nunca va a cambiar.
- **Simplifica mucho** las consultas y la interfaz.
- Ahorra tiempo de cursada.

Pero aclara que son requisitos **muy específicos (y algo irreales)**: en un sistema real, tarde o temprano alguien pide chats grupales.

Además, este diseño tiene un costo que se ve en el servicio: hay que tener cuidado con **el orden de los ids** (ver la Parte 3).

### Cómo sería el diseño correcto

Para cumplir la 1NF (y de paso permitir **chats grupales**), los participantes se sacan a una **tabla intermedia**:

```
private_chats                private_chats_users                 private_chats_messages
──────────────               ───────────────────                 ──────────────────────
id          PK  ◄────┬────── chat_id     FK → private_chats      id
name                 │       user_id     FK → auth.users         chat_id    FK → private_chats
created_at           │       (is_admin o role_id)                sender_id  FK → auth.users
                     │       created_at                          body
                     └────────────────────────────────────────── created_at
```

- Cada participante de una conversación es **una fila** en `private_chats_users`. Una conversación de 2 personas tiene 2 filas; un grupo de 10, 10 filas.
- Se puede agregar información de cada participante en la conversación (por ejemplo, `is_admin` o un `role_id`).
- `name` sirve para ponerle nombre a los grupos.

Esto es una relación **muchos a muchos** (N a M): un usuario está en muchas conversaciones, y una conversación tiene muchos usuarios. La tabla del medio es una **tabla pivote**.

> En Laravel es exactamente lo que hacías con `belongsToMany` y una tabla pivote (por ejemplo, `chat_user`).

### ¿Cuándo está bien desnormalizar?

| | Normalizado (tabla pivote) | Desnormalizado (`user_id1`, `user_id2`) |
|---|---|---|
| Cumple la 1NF | Sí | No |
| Chats grupales | Sí | No |
| Consultas | Más complejas (hay que cruzar tablas) | Más simples |
| Riesgo | — | Hay que cuidar el orden de los ids; duplicados |

**Regla práctica:** por defecto, normalizar. Desnormalizar solo cuando hay una razón concreta (simplicidad, rendimiento) **y sabiendo** qué se resigna. Como hizo el profe: decidirlo a conciencia y dejarlo documentado.

---

## Parte 3 — El servicio private-chat.js

### El problema del orden de los ids

Como la conversación se guarda en dos columnas, una misma conversación se podría guardar de **dos formas**:

```
Conversación entre A (id 2) y B (id 7):

  user_id1 = 2, user_id2 = 7     ← una forma
  user_id1 = 7, user_id2 = 2     ← otra forma (¡para la base son dos filas distintas!)
```

Si cuando A abre el chat se busca `(2, 7)` y cuando B lo abre se busca `(7, 2)`, **no encontrarían la misma conversación** y se crearían dos chats separados.

**La solución:** guardar y buscar **siempre en el mismo orden**. La forma más simple es **ordenar los ids de menor a mayor**:

```js
function sortUserIdsForPrivateChat(ids) {
    return ids.sort();
}
```

- `sort()` ordena el array (por defecto, como texto: alfabéticamente). Los UUID son textos, así que se ordenan bien.
- Ojo: `sort()` **modifica el array original** (además de devolverlo). Acá no importa, porque el array se crea en el momento: `[ sender_id, receiver_id ]`.
- No importa quién manda y quién recibe: `[A, B]` y `[B, A]` dan **el mismo resultado ordenado**.

Y se usa con **destructuring de arrays**:

```js
const [ userId1, userId2 ] = sortUserIdsForPrivateChat([ sender_id, receiver_id ]);
```

Igual que el destructuring de objetos (`const { data, error } = ...`), pero con corchetes: toma los elementos **por posición**. `userId1` queda con el primero y `userId2` con el segundo.

### Funciones privadas y funciones exportadas

| Función | ¿Exportada? | Para qué |
|---|---|---|
| `sortUserIdsForPrivateChat(ids)` | No | Ordenar los dos ids |
| `getPrivateChatFor({ sender_id, receiver_id })` | No | Buscar la conversación entre dos usuarios |
| `createPrivateChat({ sender_id, receiver_id })` | No | Crear la conversación |
| `getOrCreatePrivateChatFor({ sender_id, receiver_id })` | No | Buscar, y si no existe, crear |
| `sendPrivateChatMessage({ body, sender_id, receiver_id })` | **Sí** | Mandar un mensaje |
| `getLastPrivateChatMessages({ sender_id, receiver_id })` | **Sí** | Leer los mensajes de la conversación |

Las funciones sin `export` solo se pueden usar **dentro de este archivo**: son **detalles internos** del servicio. Los componentes solo ven "mandar un mensaje" y "traer los mensajes"; no saben (ni les importa) que existe una tabla `private_chats` ni que hay que ordenar ids. Es la **separación de responsabilidades** de la clase 07, llevada un paso más allá.

### Buscar el chat: varios .eq() encadenados

```js
async function getPrivateChatFor({ sender_id, receiver_id }) {
    const [ userId1, userId2 ] = sortUserIdsForPrivateChat([ sender_id, receiver_id ]);

    const { data, error } = await supabase
        .from('private_chats')
        .select()
        .eq('user_id1', userId1)
        .eq('user_id2', userId2);

    if(error) { ... }

    return data?.[0];
}
```

Encadenar varios filtros los combina con **AND**: tienen que cumplirse **todos**.

| Supabase | SQL | MongoDB |
|---|---|---|
| `.select().eq('user_id1', a).eq('user_id2', b)` | `SELECT * FROM private_chats WHERE user_id1 = a AND user_id2 = b` | `find({ user_id1: a, user_id2: b })` |

Devuelve `data?.[0]`: la conversación, o `undefined` si no existe todavía.

### Crear el chat: .insert().select()

```js
const { data, error } = await supabase
    .from('private_chats')
    .insert({
        user_id1: userId1,
        user_id2: userId2,
    })
    .select();

return data[0];
```

Hasta ahora, en los `insert` solo pedíamos `error`, porque `data` venía `null`. **Encadenar `.select()` después del `.insert()` hace que devuelva el registro creado** (como array).

Acá hace falta, porque necesitamos el **`id` que generó la base** para la conversación nueva (es el `chat_id` que llevan los mensajes).

> En SQL de Postgres es `INSERT ... RETURNING *`. En Laravel, `Chat::create([...])` ya te devuelve el modelo con su id. En MongoDB, `insertOne` devuelve el `insertedId`.

### El patrón "buscar o crear"

```js
async function getOrCreatePrivateChatFor({ sender_id, receiver_id }) {
    let chat = await getPrivateChatFor({ sender_id, receiver_id });

    if(!chat) {
        chat = await createPrivateChat({ sender_id, receiver_id });
    }

    return chat;
}
```

- Primero **busca** la conversación entre los dos usuarios.
- Si **no existe** (`!chat` porque vino `undefined`), la **crea**.
- Siempre devuelve una conversación.
- `let` y no `const`, porque `chat` se puede reasignar.

Así no hace falta un botón de "Iniciar conversación": la conversación **se crea sola la primera vez que se necesita**.

> En Laravel es exactamente `Chat::firstOrCreate([...])`.

### Mandar un mensaje y leer los mensajes

```js
export async function sendPrivateChatMessage({ body, sender_id, receiver_id }) {
    // Para poder insertar un mensaje, necesitamos el chat privado antes.
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    const { error } = await supabase
        .from('private_chats_messages')
        .insert({
            chat_id: chat.id,
            sender_id,
            body,
        });
    ...
}

export async function getLastPrivateChatMessages({ sender_id, receiver_id }) {
    const chat = await getOrCreatePrivateChatFor({ sender_id, receiver_id });

    const { data, error } = await supabase
        .from('private_chats_messages')
        .select()
        .eq('chat_id', chat.id);
    ...
    return data;
}
```

Las dos funciones reciben los **ids de los dos usuarios** (no el id del chat): primero obtienen (o crean) la conversación, y con su `id` hacen el insert o el select de los mensajes.

En el mensaje no se guarda el `receiver_id`: alcanza con el `chat_id` (la conversación ya sabe quiénes son los dos usuarios) y el `sender_id` (quién lo mandó).

---

## Parte 4 — La interfaz

### La ruta /usuario/:id/chat

```js
{ path: '/usuario/:id/chat', component: PrivateChat, meta: { requiresAuth: true, }, },
// { path: '/chat/:id',         component: PrivateChat, meta: { requiresAuth: true, }, },
```

- El parámetro `:id` es el id **del otro usuario** (con quien se quiere hablar), no el de la conversación. La URL se lee como "el chat del usuario X".
- Quedó comentada una alternativa (`/chat/:id`). Son decisiones de diseño de URLs; las dos funcionan.
- `/usuario/:id` y `/usuario/:id/chat` son rutas **distintas**: la primera muestra el perfil y la segunda el chat.

### El link desde el perfil: template literals

En `UserProfile.vue`:

```html
<hr class="mb-4">

<!-- :to="'/usuario/' + user.id + 'chat'" -->
<RouterLink
    :to="`/usuario/${user.id}/chat`"
    class="text-blue-700 underline"
>Ir a la conversación privada con {{ user.email }}</RouterLink>
```

Esta vez el `:to` se armó con un **template literal** (string entre *backticks* `` ` ``) en lugar de concatenar con `+`:

| Concatenación | Template literal |
|---|---|
| `'/usuario/' + user.id + '/chat'` | `` `/usuario/${user.id}/chat` `` |
| Hay que abrir y cerrar comillas y sumar | Se escribe el texto de corrido y se "incrusta" el valor con `${...}` |
| Fácil olvidarse una `/` | Se lee como la URL final |

De hecho, la versión comentada (`'/usuario/' + user.id + 'chat'`) **tiene un error**: le falta la `/` antes de `chat`, y generaría `/usuario/abc123chat`. Es justo el tipo de error que los template literals ayudan a evitar.

> Ya los conocías de JS: son los mismos que usabas para armar URLs en los `fetch` (`` `http://localhost:2026/api/libros/${id}` ``).

### La página PrivateChat.vue

**El state:**

```js
data() {
    return {
        user: { id: null, email: null, ... },        // yo (el usuario logueado)
        otherUser: { id: null, email: null, ... },   // el otro (nuestro interlocutor)
        loadingOtherUser: false,
        messages: [],
        loadingMessages: false,
        newMessage: { body: '' },
    }
},
```

Hay **dos** usuarios y **dos** estados de carga separados (uno para el perfil del otro y uno para los mensajes), porque son dos cargas distintas.

**La carga inicial (`mounted`):**

```js
async mounted() {
    try {
        subscribeToAuthStateChange(userData => this.user = userData);   // 1. quién soy yo

        this.loadingOtherUser = true;
        this.otherUser = await getUserProfileById(this.$route.params.id);   // 2. con quién hablo
        this.loadingOtherUser = false;

        this.loadingMessages = true;
        this.messages = await getLastPrivateChatMessages({                 // 3. los mensajes
            sender_id: this.user.id,
            receiver_id: this.otherUser.id,
        });
        this.loadingMessages = false;
    } catch (error) {
        throw error;
    }
}
```

El orden importa: para pedir los mensajes hacen falta **los dos ids**, así que primero se obtiene el usuario logueado (del observer de auth), después el otro usuario (de la URL), y recién después los mensajes.

**Mandar un mensaje:**

```js
async handleMessageSend() {
    try {
        sendPrivateChatMessage({
            sender_id: this.user.id,
            receiver_id: this.otherUser.id,
            body: this.newMessage.body,
        });
        this.newMessage.body = "";
    } catch (error) {
        throw error;
    }
}
```

**El template:**

```html
<BaseH1>Conversación privada con {{ otherUser.display_name ?? otherUser.email }}</BaseH1>
```

Usa `??`: si el otro usuario tiene nombre de usuario, muestra el nombre; si no, el email.

```html
<form action="#" class="flex gap-4" @submit.prevent="handleMessageSend">
    <label class="sr-only" for="body">Mensaje</label>
    <textarea id="body" ... v-model="newMessage.body"></textarea>
    <button type="submit" ...>Enviar</button>
</form>
```

El formulario es una sola fila (`flex gap-4`): el textarea y el botón al lado. El `<label>` sigue estando, pero con `sr-only`: no se ve, pero los lectores de pantalla saben qué es el campo.

### Clases dinámicas con :class

```html
<li
    v-for="message in messages"
    :key="message.id"
    class="p-4 rounded"
    :class="{
        'bg-gray-100': message.sender_id !== user.id,
        'self-end bg-green-100': message.sender_id === user.id,
    }"
>
```

`:class` (es `v-bind:class`) permite **agregar o sacar clases según una condición**. Con la **sintaxis de objeto**:
- Cada **clave** es la clase (o las clases, separadas por espacio).
- Cada **valor** es una condición: si es verdadera, la clase se agrega; si es falsa, no.

| Mensaje de... | Condición verdadera | Clases que quedan |
|---|---|---|
| El otro usuario | `message.sender_id !== user.id` | `p-4 rounded bg-gray-100` |
| Yo | `message.sender_id === user.id` | `p-4 rounded self-end bg-green-100` |

- El `class` normal (estático) y el `:class` (dinámico) **se combinan**: Vue junta las dos.
- **`self-end`**: la lista es `flex flex-col items-start` (todos los mensajes a la izquierda). `self-end` (`align-self: flex-end`) hace que **ese** elemento se alinee al final, a la derecha. Es el típico diseño de chat: lo mío a la derecha, lo del otro a la izquierda.

| Forma | Ejemplo |
|---|---|
| Objeto (la que se usó) | `:class="{ 'bg-green-100': esMio, 'bg-gray-100': !esMio }"` |
| Array | `:class="[esMio ? 'bg-green-100' : 'bg-gray-100']"` |
| String con ternario | `:class="esMio ? 'self-end bg-green-100' : 'bg-gray-100'"` |

> **Ojo con Tailwind:** las clases tienen que estar escritas **completas** (como acá: `'bg-green-100'`). Si se armaran con partes (`` `bg-${color}-100` ``), Tailwind no las encuentra al escanear el código y no genera su CSS.
>
> En React era `className={esMio ? 'self-end bg-green-100' : 'bg-gray-100'}`, o con la librería `clsx`.

---

## Flujo completo

```
[Entrar a la conversación]
/chat → click en el email de Pepe → /usuario/<id de Pepe> (UserProfile)
        ↓
Click en "Ir a la conversación privada con pepe@trueno.com"
        ↓
<RouterLink :to="`/usuario/${user.id}/chat`"> → /usuario/<id de Pepe>/chat
        ↓
Guard beforeEach (requiresAuth) → hay usuario → PrivateChat
        ↓
mounted():
   1. subscribeToAuthStateChange → this.user = yo (Sara)
   2. getUserProfileById(this.$route.params.id) → this.otherUser = Pepe
   3. getLastPrivateChatMessages({ sender_id: Sara, receiver_id: Pepe })
         → getOrCreatePrivateChatFor
              → sort([Sara, Pepe]) → [userId1, userId2]
              → SELECT ... WHERE user_id1 = ... AND user_id2 = ...
              → ¿no existe? → INSERT ... .select() → el chat nuevo con su id
         → SELECT ... FROM private_chats_messages WHERE chat_id = ...
      → this.messages = [...]
        ↓
v-for + :class → mis mensajes a la derecha en verde, los de Pepe a la izquierda en gris

[Mandar un mensaje]
Escribo → "Enviar" → handleMessageSend()
        ↓
sendPrivateChatMessage({ sender_id: Sara, receiver_id: Pepe, body })
   → getOrCreatePrivateChatFor (ahora lo encuentra)
   → INSERT en private_chats_messages (chat_id, sender_id, body)
        ↓
⚠️ Todavía no hay suscripción en tiempo real: el mensaje NO aparece hasta recargar la página
```

---

## Observaciones sobre el código de la clase

| Dónde | Qué pasa | Cómo se arreglaría |
|---|---|---|
| `PrivateChat.vue` | **Falta el tiempo real**: al mandar un mensaje, no aparece en la lista (ni en la del otro usuario) hasta recargar | Es el `TODO` del profe: suscribirse con Realtime a los INSERT de `private_chats_messages` (filtrando por `chat_id`) |
| Tablas | **Sin RLS**: cualquier usuario logueado podría leer los mensajes de cualquier conversación. El chat "privado" todavía no es privado | Es el `TODO` del profe: RLS para que solo los dos participantes accedan |
| `PrivateChat.vue` → `handleMessageSend` | Sin `await` delante de `sendPrivateChatMessage(...)`: si falla, el error no cae en el `catch` | `await sendPrivateChatMessage({ ... });` |
| `PrivateChat.vue` → `catch` | `catch (error) { throw error; // ... }`: atrapa el error solo para volver a lanzarlo, así que es como no tener `try/catch`. El `// ...` después del `throw` nunca se ejecuta | Manejar el error de verdad (mostrarlo en pantalla) |
| `PrivateChat.vue` → `mounted` | Usa `this.user.id` justo después de suscribirse. Si se recarga la página directamente en el chat, puede que la sesión todavía no esté cargada y `this.user.id` sea `null`: se buscaría (o crearía) un chat con un id `null` y la base lo rechazaría (`not null`) | Esperar a tener el usuario antes de pedir los mensajes |
| `getLastPrivateChatMessages` | Solo con **abrir** la pantalla ya se **crea** la conversación (aunque nunca se mande un mensaje) | Que leer solo **busque** (y devuelva `[]` si no existe) y que solo `sendPrivateChatMessage` cree |
| `private_chats` | No hay una restricción que impida **dos filas para la misma conversación** (por ejemplo, si los dos usuarios abren el chat al mismo tiempo, se pueden crear dos) | `UNIQUE (user_id1, user_id2)` en la migración, y un `CHECK (user_id1 < user_id2)` para forzar el orden desde la base |
| `private_chats_messages` | El `select()` no tiene `.order()` | `.order('created_at')` |
| Cada mensaje | Se busca la conversación **cada vez** que se manda o se leen mensajes | Es el `TODO` del profe: guardar en **caché** los chats privados ya encontrados |
| `UserProfile.vue` | Desde tu propio perfil (`/usuario/<tu id>`) aparece el link para chatear **con vos misma** | Ocultar el link con `v-if="user.id !== <mi id>"` |
| `auth.js` | El profe agregó `// TODO: Unsub`: reconoce que falta poder **desuscribirse** del observer (cada página que se suscribe suma un observer que nunca se borra, y ahora `PrivateChat` también se suscribe) | Que `subscribeToAuthStateChange` devuelva una función para desuscribirse y llamarla en `unmounted()` |

**`TODO` del profe para la próxima clase:** completar el chat privado (suscripción en tiempo real y caché de los chats privados), RLS y la desuscripción del observer.

---

## Referencia rápida: comandos del CLI de Supabase (migraciones y seed)

Todos se corren **desde la carpeta del proyecto** (la que tiene la carpeta `supabase/` adentro), con **Docker Desktop abierto**. En la práctica se usa pnpm; el profe usa npm (`npx supabase ...`).

| Para qué | pnpm | npm |
|---|---|---|
| Levantar Supabase local | `pnpm supabase start` | `npx supabase start` |
| Ver URLs y keys | `pnpm supabase status` | `npx supabase status` |
| Detener Supabase local | `pnpm supabase stop` | `npx supabase stop` |
| **Crear** una migración nueva | `pnpm supabase migration new <nombre>` | `npx supabase migration new <nombre>` |
| **Aplicar** las migraciones pendientes | `pnpm supabase migration up` | `npx supabase migration up` |
| Ver qué migraciones están aplicadas | `pnpm supabase migration list` | `npx supabase migration list` |
| **Resetear** la base (todas las migraciones + seed) | `pnpm supabase db reset` | `npx supabase db reset` |

Ejemplo real de esta clase:

```bash
pnpm supabase migration new create_private_chats_table
# → crea supabase/migrations/20261023003327_create_private_chats_table.sql (vacío; el SQL lo escribimos nosotros)
```

### migration new vs migration up vs db reset

(No existe un comando `create`: para crear se usa `migration new`.)

| | `migration new <nombre>` | `migration up` | `db reset` |
|---|---|---|---|
| Qué hace | **Crea un archivo** `.sql` vacío en `supabase/migrations/`, con la fecha y hora adelante | **Ejecuta** las migraciones que **todavía no se aplicaron** | **Borra toda la base** y la vuelve a armar: ejecuta **todas** las migraciones desde cero y después el **seed** |
| ¿Toca la base de datos? | No (solo crea el archivo) | Sí, solo agrega lo nuevo | Sí, la recrea entera |
| ¿Borra datos? | No | No | **Sí**: mensajes, perfiles y **usuarios registrados** |
| ¿Corre el seed? | No | **No** | **Sí** |
| ¿Aplica cambios hechos a una migración **ya aplicada**? | — | **No** (ya figura como aplicada, la saltea) | Sí (corre todo de nuevo) |
| Cuándo usarlo | Para empezar un cambio en la estructura de la base | Agregaste una migración nueva y querés conservar tus datos | Querés empezar de cero, cambiaste el seed, o editaste una migración vieja (como `sender_id` en la clase 10) |

**El flujo típico para un cambio en la base:**

```bash
pnpm supabase migration new <nombre>   # 1. crear el archivo
# 2. escribir el SQL en el archivo nuevo de supabase/migrations/
pnpm supabase migration up             # 3a. aplicarlo conservando los datos...
pnpm supabase db reset                 # 3b. ...o empezar de cero (incluye el seed)
```

### ¿Y para correr el seed?

**No hay un comando que corra solo el seed.** `supabase/seed.sql` se ejecuta **automáticamente al final de `db reset`**, después de las migraciones (si está habilitado en `config.toml`, sección `[db.seed]`, que viene así por defecto).

| Quiero... | Cómo |
|---|---|
| Cargar los datos del seed | `pnpm supabase db reset` (recrea la base y corre el seed) |
| Resetear **sin** cargar el seed | `pnpm supabase db reset --no-seed` |
| Correr solo un pedazo de SQL sin borrar nada | Pegarlo en el **SQL Editor** del Studio local (`http://127.0.0.1:54323`) |

> **Ojo:** como `db reset` borra también los usuarios, después de un reset solo existen los que crea el seed (`sara@za.com` y `pepe@trueno.com`, contraseña `asdasd`). Si te habías registrado con otro usuario, hay que volver a crearlo.

---

## Cómo probarlo

```bash
# Desde clase-11/ (con Docker Desktop abierto)
npm install                 # pnpm install
npx supabase start          # pnpm supabase start
npx supabase migration up   # pnpm supabase migration up   → aplica las 2 migraciones nuevas
                            # (o "db reset" para empezar de cero con el seed)
npm run dev                 # pnpm dev
```

1. Ingresar con `sara@za.com` / `asdasd`.
2. En el chat público, click en `pepe@trueno.com` → en su perfil, click en **"Ir a la conversación privada con pepe@trueno.com"**.
3. La URL tiene que ser `/usuario/<id de Pepe>/chat` y el título "Conversación privada con Pepe Trueno".
4. En el Studio (`http://127.0.0.1:54323`) → *Table Editor* → `private_chats`: ya hay una fila con los dos ids **ordenados** (aunque todavía no se haya mandado ningún mensaje).
5. Mandar un mensaje: **no aparece** en la lista. Recargar la página: ahora sí aparece, a la **derecha** y en **verde**.
6. En otro navegador (o una ventana de incógnito), ingresar como `pepe@trueno.com` / `asdasd` y abrir el chat con Sara: tiene que ser **la misma conversación** (en `private_chats` sigue habiendo una sola fila) y el mensaje de Sara aparece a la **izquierda** y en **gris**.

---

## Resumen para el parcial

- Antes de programar, **diseñar los datos**: qué hay que guardar y cómo se relaciona.
- Chat privado = `private_chats` (conversación, con `user_id1` y `user_id2`) + `private_chats_messages` (con `chat_id` y `sender_id`).
- La FK tiene que ser del mismo tipo que la PK a la que apunta, y la tabla referenciada tiene que existir antes: **el orden de las migraciones importa**.
- **Normalizar** = organizar las tablas para evitar repeticiones e inconsistencias (formas normales).
- **1NF**: nada de columnas con varios valores ni de columnas que enumeren una lista (`user_id1`, `user_id2`).
- El diseño correcto (y que permite grupos) usa una **tabla pivote** (`private_chats_users`): relación **muchos a muchos**.
- Desnormalizar se puede, pero **a conciencia**: acá por simplicidad y porque los chats son siempre de a 2.
- Con columnas `user_id1` / `user_id2` hay que **ordenar los ids** (`sort()`) para que una conversación tenga una sola forma de guardarse.
- Destructuring de arrays: `const [a, b] = array;` (por posición).
- Funciones sin `export` = detalles internos del servicio.
- Varios `.eq()` encadenados = `AND`.
- `.insert(...).select()` devuelve el registro creado (con su id) ≈ `INSERT ... RETURNING *`.
- **Buscar o crear** (`getOrCreate...`) ≈ `firstOrCreate` de Laravel.
- Template literals: `` `/usuario/${user.id}/chat` `` en vez de concatenar con `+`.
- `:class="{ 'clase': condicion }"` agrega clases según condiciones; se combina con el `class` estático.
- `self-end` alinea un solo elemento al final dentro de un flex (los mensajes propios a la derecha).
- Clases de Tailwind **siempre completas**, nunca armadas por partes.
- El chat privado todavía **no tiene tiempo real ni RLS** (`TODO` de la próxima clase).
