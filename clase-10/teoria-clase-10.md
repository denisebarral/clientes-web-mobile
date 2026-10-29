# Clase 10 — Editar el perfil, ver perfiles de otros usuarios, mensajes con autor y PL/pgSQL

## Índice

- [¿Qué se hizo esta clase?](#qué-se-hizo-esta-clase)
- [Estructura de archivos](#estructura-de-archivos)
- [Parte 1 — Editar el perfil](#parte-1--editar-el-perfil)
  - [Actualizar datos: .update() + .eq()](#actualizar-datos-update--eq)
  - [updateAuthUserProfile(): actualizar y avisar a los observers](#updateauthuserprofile-actualizar-y-avisar-a-los-observers)
  - [La página EditProfile.vue](#la-página-editprofilevue)
  - [try / catch / finally](#try--catch--finally)
- [Parte 2 — Parámetros de ruta: ver el perfil de otro usuario](#parte-2--parámetros-de-ruta-ver-el-perfil-de-otro-usuario)
  - [Definir el parámetro: /usuario/:id](#definir-el-parámetro-usuarioid)
  - [Leer el parámetro: this.$route.params](#leer-el-parámetro-thisrouteparams)
  - [$route vs $router](#route-vs-router)
  - [La página UserProfile.vue](#la-página-userprofilevue)
- [Parte 3 — Mensajes del chat con autor](#parte-3--mensajes-del-chat-con-autor)
  - [La columna sender_id](#la-columna-sender_id)
  - [Ojo: se modificó una migración ya existente](#ojo-se-modificó-una-migración-ya-existente)
  - [El chat usa el usuario logueado](#el-chat-usa-el-usuario-logueado)
  - [Links dinámicos con v-bind](#links-dinámicos-con-v-bind)
- [Parte 4 — PL/pgSQL: el seed, explicado](#parte-4--plpgsql-el-seed-explicado)
  - [¿Qué es PL/pgSQL?](#qué-es-plpgsql)
  - [Crear una función: CREATE OR REPLACE FUNCTION](#crear-una-función-create-or-replace-function)
  - [El código como string: $$ ... $$](#el-código-como-string---)
  - [DECLARE, BEGIN y END](#declare-begin-y-end)
  - [Asignar valores: :=](#asignar-valores-)
  - [Lo que hace la función por dentro](#lo-que-hace-la-función-por-dentro)
  - [Ejecutar código suelto: DO $$ ... $$](#ejecutar-código-suelto-do---)
  - [PERFORM vs guardar el retorno](#perform-vs-guardar-el-retorno)
- [Flujo completo](#flujo-completo)
- [Observaciones sobre el código de la clase](#observaciones-sobre-el-código-de-la-clase)
- [Cómo probarlo](#cómo-probarlo)
- [Resumen para el parcial](#resumen-para-el-parcial)

---

## ¿Qué se hizo esta clase?

Se resolvieron más `TODO` de la clase 09:
1. **Editar el perfil:** página nueva `/mi-perfil/editar` con un formulario que guarda la bio, el nombre de usuario y la carrera (`.update()` en Supabase). Al guardar, el servicio de auth actualiza sus datos y **avisa a los observers**, así Mi perfil se actualiza solo.
2. **Ver el perfil de otro usuario:** página nueva `/usuario/:id`, que usa un **parámetro de ruta** para saber de quién es el perfil.
3. **Mensajes con autor:** la tabla del chat tiene una columna nueva `sender_id` (FK a `auth.users`). El chat ya **no pide el email**: usa el del usuario logueado. Cada email en el chat es un **link al perfil** de quien lo mandó.
4. **PL/pgSQL:** el profe explicó la sintaxis de la función del seed, que ahora también crea los mensajes con su autor.

**Archivos nuevos:**

| Archivo | Qué es |
|---|---|
| `src/pages/EditProfile.vue` | Formulario para editar el perfil propio (ruta `/mi-perfil/editar`) |
| `src/pages/UserProfile.vue` | Perfil de cualquier usuario (ruta `/usuario/:id`) |

**Archivos modificados:**

| Archivo | Qué cambió |
|---|---|
| `src/router/router.js` | Rutas nuevas `/mi-perfil/editar` y `/usuario/:id` (las dos con `requiresAuth`) |
| `src/services/user-profiles.js` | Nueva función `updateUserProfile(id, data)` con `.update().eq()` |
| `src/services/auth.js` | Nueva función `updateAuthUserProfile(data)`: actualiza el perfil del usuario logueado y notifica a los observers |
| `src/pages/MyProfile.vue` | Link "Editar" al lado del título |
| `src/pages/PublicChat.vue` | Se suscribe al servicio de auth; ya no tiene el campo email; manda `sender_id`; el email del autor es un `<RouterLink>` a su perfil |
| `src/services/public-chat.js` | `sendPublicChatMessages()` recibe y guarda `sender_id` |
| `supabase/migrations/..._create_public_chat_messages_table.sql` | Columna nueva `sender_id uuid not null references auth.users (id)` |
| `supabase/seed.sql` | Explicación de PL/pgSQL; los mensajes se insertan dentro del bloque `DO`, con el `sender_id` de cada usuario |

---

## Estructura de archivos

```
clase-10/
├── supabase/
│   ├── migrations/
│   │   ├── 20260925010818_create_public_chat_messages_table.sql   ← MODIFICADO (sender_id)
│   │   └── 20261009011323_create_user_profiles_table.sql
│   └── seed.sql                         ← MODIFICADO (PL/pgSQL explicado + mensajes con autor)
└── src/
    ├── router/
    │   └── router.js                    ← MODIFICADO (/mi-perfil/editar y /usuario/:id)
    ├── services/
    │   ├── auth.js                      ← MODIFICADO (updateAuthUserProfile)
    │   ├── public-chat.js               ← MODIFICADO (sender_id)
    │   └── user-profiles.js             ← MODIFICADO (updateUserProfile)
    └── pages/
        ├── MyProfile.vue                ← MODIFICADO (link "Editar")
        ├── EditProfile.vue              ← NUEVO
        ├── UserProfile.vue              ← NUEVO
        └── PublicChat.vue               ← MODIFICADO (usuario logueado + links a perfiles)
```

---

## Parte 1 — Editar el perfil

### Actualizar datos: .update() + .eq()

En `user-profiles.js`:

```js
export async function updateUserProfile(id, data) {
    const { error } = await supabase
        .from('user_profiles')
        .update(data)        // qué columnas cambiar y con qué valores
        .eq('id', id);       // en qué fila(s)

    if(error) {
        console.error("Error al editar el perfil del usuario. ", error);
        throw new Error(error.message);
    }
}
```

| Supabase | SQL | MongoDB |
|---|---|---|
| `.from('user_profiles').update({ bio, display_name, career }).eq('id', id)` | `UPDATE user_profiles SET bio = ..., display_name = ..., career = ... WHERE id = '...'` | `updateOne({ _id: id }, { $set: { bio, display_name, career } })` |

- `.update(data)` recibe un objeto con **solo las columnas que se quieren cambiar**. Las que no están en el objeto quedan igual.
- **El filtro (`.eq()`) es fundamental**: sin él, el `UPDATE` afectaría a **todas las filas** de la tabla (igual que un `UPDATE` sin `WHERE` en SQL). Por seguridad, Supabase rechaza por defecto los `update` y `delete` sin filtro.
- El JSDoc usa `bio?: string|null`: el `?` indica que la propiedad es **opcional** y `string|null` que puede ser un texto o `null`.

### updateAuthUserProfile(): actualizar y avisar a los observers

¿Por qué la página de edición no llama directamente a `updateUserProfile()`? Porque, después de guardar en la base, **los datos del usuario logueado que guarda el servicio de auth (`userData`) quedarían viejos**, y Mi perfil o la nav seguirían mostrando lo anterior.

Por eso `auth.js` tiene su propia función, que hace las dos cosas:

```js
export async function updateAuthUserProfile(data) {
    try {
        await updateUserProfile(userData.id, data);   // 1. Guardar en Supabase

        userData = {                                   // 2. Actualizar el subject
            ...userData,
            ...data,
        }
        notifyAll();                                   // 3. Avisar a los observers
    } catch (error) {
        console.error("Error al editar el usuario autenticado: ", error);
        throw error;
    }
}
```

- **No recibe el id**: usa `userData.id`, el del usuario logueado. Así **nadie puede editar el perfil de otro** desde esta función (aunque, de nuevo, la seguridad real va en el backend con RLS).
- **Doble spread** (`...userData, ...data`): primero se copian todos los datos actuales y después se **pisan** con los nuevos. Si dos objetos tienen la misma propiedad, gana el que va último.
  ```js
  { ...{ email: 'a', bio: 'vieja' }, ...{ bio: 'nueva' } }   // → { email: 'a', bio: 'nueva' }
  ```
- **`throw error` en el `catch`**: el error se registra en la consola y se **vuelve a lanzar** para que el componente que llamó también se entere. Si no se relanzara, el componente creería que salió todo bien.

Es el patrón Observer funcionando: el componente que edita no tiene que avisarle a nadie; el servicio notifica y **todos los suscriptos se actualizan solos**.

### La página EditProfile.vue

```js
data() {
    return {
        profile: { bio: '', display_name: '', career: '' },
        loading: false,
    }
},
methods: {
    async handleSubmit() {
        try {
            this.loading = true;
            await updateAuthUserProfile(this.profile);
        } catch (error) {
            // ...
        } finally {
            this.loading = false;
        }
    },
},
mounted() {
    subscribeToAuthStateChange(userData => {
        this.profile = {
            bio: userData.bio,
            display_name: userData.display_name,
            career: userData.career,
        }
    });
}
```

- El formulario arranca **precargado** con los datos actuales: en `mounted()` se suscribe al servicio y copia solo los 3 campos editables a `this.profile`, que está conectado a los inputs con `v-model`.
- Al guardar, se manda `this.profile` entero: un objeto con `bio`, `display_name` y `career`, justo las columnas que `update()` va a cambiar.
- El callback del observer tiene **llaves** `{ ... }` porque hace más de una cosa (arma un objeto nuevo). Cuando era una sola asignación, se escribía sin llaves: `userData => this.user = userData`.

### try / catch / finally

`finally` es la **tercera parte opcional** del bloque `try...catch`. Lo que va adentro se ejecuta **siempre** después del `try` y/o del `catch`, incluso si ocurre un error inesperado. Es el lugar ideal para limpiar valores, cerrar conexiones, apagar el `loading`, etc.

```js
try {
    this.loading = true;
    await algo();          // si falla, salta al catch
} catch (error) {
    // manejar el error
} finally {
    this.loading = false;  // se ejecuta haya salido bien o mal
}
```

| Forma | ¿Se apaga el loading si hay un error que no se atrapa o un `return` dentro del try? |
|---|---|
| `this.loading = false;` **después** del `try/catch` (como en Login y Register) | No siempre |
| `this.loading = false;` **en el `finally`** (como en EditProfile y UserProfile) | Sí, siempre |

---

## Parte 2 — Parámetros de ruta: ver el perfil de otro usuario

### Definir el parámetro: /usuario/:id

```js
{ path: '/usuario/:id', component: UserProfile, meta: { requiresAuth: true, }, },
```

`:id` es un **parámetro de ruta**: un segmento **dinámico** de la URL que puede tener cualquier valor, y que después podemos leer. Todas estas URLs muestran el componente `UserProfile`:

```
/usuario/1f0c2a9e-...   → params.id = '1f0c2a9e-...'
/usuario/7b3d55aa-...   → params.id = '7b3d55aa-...'
```

> **Comparación:** es igual que en Express (`router.get('/libros/:id', ...)` y `req.params.id`), en Laravel (`Route::get('/usuario/{id}', ...)`) y en React Router (`path: '/libros/:id'` + `useParams()`).

### Leer el parámetro: this.$route.params

```js
this.user = await getUserProfileById(this.$route.params.id);
```

Vue Router agrega en **todos los componentes** una propiedad especial **`$route`** con la información de la **ruta actual**. Sus parámetros están en `params`, con el nombre del parámetro **sin los dos puntos**.

| Propiedad de `$route` | Qué tiene | Ejemplo para `/usuario/abc?tab=info` |
|---|---|---|
| `path` | La URL (sin el dominio) | `'/usuario/abc'` |
| `params` | Los parámetros de ruta (`:nombre`) | `{ id: 'abc' }` |
| `query` | Los parámetros de la query string (`?clave=valor`) | `{ tab: 'info' }` |
| `meta` | El `meta` de la ruta | `{ requiresAuth: true }` |

### $route vs $router

Se parecen mucho en el nombre, pero son cosas distintas:

| | `this.$route` | `this.$router` |
|---|---|---|
| Qué es | La ruta **actual** (información) | El **router** (el que navega) |
| Para qué se usa | **Leer**: params, query, path, meta | **Hacer**: `push()`, `back()`, etc. |
| Ejemplo | `this.$route.params.id` | `this.$router.push('/chat')` |
| En React Router | `useParams()`, `useLocation()` | `useNavigate()` |

### La página UserProfile.vue

```js
async mounted() {
    try {
        this.loading = true;
        this.user = await getUserProfileById(this.$route.params.id);
    } catch (error) {
        // ...
    } finally {
        this.loading = false;
    }
}
```

```html
<BaseH1>Perfil de {{ user.email }}</BaseH1>
```

- A diferencia de Mi perfil, **no se suscribe al servicio de auth**: no muestra al usuario logueado, sino a cualquier otro. Por eso consulta directamente la tabla `user_profiles` con el id que viene en la URL.
- El template es el mismo que el de Mi perfil (con `??` para los datos vacíos), pero sin el link "Editar".
- Como `BaseH1` usa un `<slot>`, se le puede pasar texto con interpolación adentro: `Perfil de {{ user.email }}`.

---

## Parte 3 — Mensajes del chat con autor

### La columna sender_id

Hasta ahora cada mensaje guardaba solo un `email` escrito a mano: no había forma segura de saber **quién** lo había mandado. Ahora la tabla tiene una columna nueva:

```sql
CREATE TABLE public_chat_messages (
    id bigint primary key generated always as identity,
    sender_id uuid not null references auth.users (id),
    email text,
    body text,
    created_at timestamptz default now()
);
```

| Parte | Qué significa |
|---|---|
| `uuid` | El mismo tipo que el id de `auth.users` |
| `not null` | Todo mensaje tiene que tener autor |
| `references auth.users (id)` | **Clave foránea**: el autor tiene que ser un usuario que exista |

La relación es **1 a muchos**: un usuario puede mandar muchos mensajes, y cada mensaje es de un solo usuario. (En la clase 09, el perfil era 1 a 1 porque el id era PK y FK a la vez; acá `sender_id` **no** es PK, así que se puede repetir.)

El `email` se sigue guardando en el mensaje, aunque se podría obtener a partir del `sender_id`. Es una **duplicación** que simplifica mostrarlo en el chat (no hace falta consultar otra tabla), con la desventaja de que, si el usuario cambiara su email, los mensajes viejos seguirían mostrando el anterior.

> En Laravel sería `$message->belongsTo(User::class, 'sender_id')`. En MongoDB, un campo con el `ObjectId` del usuario.

### Ojo: se modificó una migración ya existente

El profe agregó `sender_id` **editando la migración original** del chat (la de la clase 07), en vez de crear una migración nueva.

- `supabase migration up` aplica **solo las migraciones que todavía no se corrieron**. Como esa migración ya se había aplicado, **no la vuelve a ejecutar**: la columna no se crea.
- Hay que correr **`supabase db reset`**, que borra todo y vuelve a correr todas las migraciones desde cero (y el seed).

| Forma | Ventaja | Desventaja |
|---|---|---|
| Editar una migración existente | Queda todo en un solo archivo | Obliga a `db reset` (se pierden los datos). En un proyecto real con datos o con otras personas, **no se hace** |
| Crear una migración nueva (`ALTER TABLE public_chat_messages ADD COLUMN sender_id ...`) | Se aplica con `migration up` sin perder datos; queda el historial del cambio | Hay que pensar qué pasa con las filas que ya existen (con `not null`, necesitan un valor) |

**Regla práctica:** mientras se está desarrollando en local y los datos salen del seed, editar está bien. Una vez que la base tiene datos reales, **siempre migración nueva**.

### El chat usa el usuario logueado

En `PublicChat.vue`:
- El componente se **suscribe al servicio de auth** (como App y Mi perfil) y guarda los datos en `this.user`.
- Se **sacó el campo "Email"** del formulario: `newMessage` ahora solo tiene `body`.
- Al enviar, se manda el id y el email **del usuario logueado**:

```js
sendPublicChatMessages({
    sender_id: this.user.id,
    email: this.user.email,
    body: this.newMessage.body,
});
```

Y en `public-chat.js`, la función recibe y guarda el `sender_id`:

```js
export async function sendPublicChatMessages({ sender_id, email, body }) {
    const { error } = await supabase
        .from('public_chat_messages')
        .insert({ sender_id, email, body });
    ...
}
```

### Links dinámicos con v-bind

Cada email en la lista de mensajes es un link al perfil de quien lo mandó:

```html
<RouterLink
    :to="'/usuario/' + message.sender_id"
    class="text-blue-700 underline"
>
    <span class="font-bold">{{ message.email }}</span>
</RouterLink>
dijo:
```

- En HTML, los valores de los atributos son **siempre strings**. `to="/usuario/message.sender_id"` mandaría literalmente ese texto.
- **`v-bind`** hace que el valor del atributo sea una **expresión de JS** (con acceso a las propiedades y métodos del componente, y a las variables del `v-for`).
  - Forma larga: `v-bind:to="..."`. Forma corta (la que se usa siempre): `:to="..."`.
- `'/usuario/' + message.sender_id` concatena el texto con el id → `/usuario/1f0c2a9e-...`.
- También se puede escribir con un *template literal*: `` :to="`/usuario/${message.sender_id}`" ``.

> Ya lo veníamos usando sin explicarlo a fondo: `:key="message.id"` en el `v-for` es exactamente lo mismo (`v-bind:key`). En React sería `to={'/usuario/' + message.sender_id}`.

---

## Parte 4 — PL/pgSQL: el seed, explicado

### ¿Qué es PL/pgSQL?

**PL/pgSQL** (*Procedural Language/PostgreSQL*) es el **lenguaje de programación** de Postgres. Está inspirado en la sintaxis de PL/SQL, el de Oracle.

SQL "puro" es **declarativo**: decís **qué** querés (`SELECT ... WHERE ...`) y la base decide cómo. PL/pgSQL es **procedural**: permite escribir **pasos** como en un lenguaje de programación (variables, condiciones, bucles), mezclando consultas SQL adentro.

Dentro del SQL, el código de PL/pgSQL se escribe **como un string** con las instrucciones a ejecutar, y ese string se usa junto con otras cláusulas de SQL (como `CREATE FUNCTION` o `DO`).

### Crear una función: CREATE OR REPLACE FUNCTION

```sql
CREATE OR REPLACE FUNCTION public.create_user_with_profile(
    email text,
    password text,
    bio text,
    display_name text,
    career text
) RETURNS uuid AS $$
    ... código ...
$$ LANGUAGE plpgsql;
```

| Parte | Qué hace |
|---|---|
| `CREATE OR REPLACE FUNCTION` | Crea la función, o la **reemplaza** si ya existía (así se puede correr el seed varias veces sin error) |
| `public.create_user_with_profile` | El nombre, con el schema adelante (`public`) |
| `(email text, password text, ...)` | Los **parámetros**: nombre seguido del tipo de dato (cualquier tipo de Postgres) |
| `RETURNS uuid` | El **tipo de dato que devuelve** (opcional) |
| `AS $$ ... $$` | El **código** de la función, como string |
| `LANGUAGE plpgsql` | En qué lenguaje está escrito ese código |

> **Comparación con JS:** es como `function createUserWithProfile(email, password, bio, displayName, career) { ...; return userId; }`, pero con los tipos declarados.

### El código como string: $$ ... $$

El código podría ir entre comillas simples (`'...'`), pero adentro hay **muchas comillas** (`'authenticated'`, `'utc'`, etc.) que habría que "escapar" una por una.

Por eso es buena práctica usar el **delimitador especial `$$`** (*dollar quoting*): todo lo que esté entre `$$` y `$$` es el string, sin importar qué comillas tenga adentro.

### DECLARE, BEGIN y END

```sql
  DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN -- Noten que no tiene ";" esta línea.
  user_id := gen_random_uuid();
  ...
  RETURN user_id;
END;
```

- **`DECLARE`** (opcional): declara las **variables** que se van a usar en el bloque. Cada una con su **nombre seguido de su tipo**, y separadas con **`;`** (no con `,`).
- **`BEGIN ... END`**: delimitan el **bloque de código**. Ojo: `BEGIN` **no** lleva `;`, pero `END` sí.
- **`RETURN`**: devuelve el valor (del tipo declarado en `RETURNS`).

| PL/pgSQL | JS |
|---|---|
| `DECLARE user_id uuid;` | `let userId;` |
| `BEGIN ... END;` | `{ ... }` |
| `user_id := gen_random_uuid();` | `userId = crypto.randomUUID();` |
| `RETURN user_id;` | `return userId;` |

### Asignar valores: :=

Para asignar un valor a una variable se puede usar tanto `=` como **`:=`**. Siempre se prefiere **`:=`**, para no confundirlo al leer con el `=` de **comparación** (que en SQL es un solo `=`, por ejemplo en `WHERE id = ...`).

### Lo que hace la función por dentro

```sql
user_id := gen_random_uuid();                          -- 1. genera un UUID nuevo
encrypted_pw := crypt(password, gen_salt('bf', 12));   -- 2. encripta la contraseña

INSERT INTO auth.users (...) VALUES (..., user_id, ..., email, encrypted_pw, ...);       -- 3. el usuario
INSERT INTO auth.identities (...) VALUES (..., user_id, ...);                            -- 4. su identidad (login con email)
INSERT INTO public.user_profiles (id, email, bio, display_name, career)
VALUES (user_id, email, bio, display_name, career);                                      -- 5. su perfil

RETURN user_id;                                        -- 6. devuelve el id
```

- Parte del encanto de PL/pgSQL: las consultas SQL (`INSERT`, `SELECT`...) se escriben **directamente**, y pueden usar las variables y los parámetros.
- `gen_random_uuid()` genera un UUID aleatorio.
- `crypt(password, gen_salt('bf', 12))` **hashea** la contraseña con **bcrypt** (`'bf'` = Blowfish, el algoritmo de bcrypt; `12` = el "costo", cuántas vueltas hace). Es lo mismo que hacías con `bcrypt.hash(password, 12)` en Express.
- Otros detalles que aparecen y no hace falta memorizar: `now() at time zone 'utc'` (fecha actual en UTC), `format('...%s...', valor)` (arma un string reemplazando cada `%s`) y `::jsonb` (convierte el texto al tipo JSON de Postgres; `::` es la forma de Postgres de convertir tipos).

### Ejecutar código suelto: DO $$ ... $$

Crear la función no la ejecuta. Para **llamarla** hace falta estar dentro de un bloque de PL/pgSQL. Para ejecutar código de PL/pgSQL **directamente** (sin crear una función), se usa la cláusula **`DO`** seguida del string con el código:

```sql
DO $$
  DECLARE
    user_id1 uuid;
    user_id2 uuid;
  BEGIN
    user_id1 := public.create_user_with_profile('sara@za.com', 'asdasd', '¡Hola! Me llamo Sara za', 'Saraza', 'Diseño y programación web');
    user_id2 := public.create_user_with_profile('pepe@trueno.com', 'asdasd', NULL, 'Pepe Trueno', NULL);

    INSERT INTO public_chat_messages (sender_id, email, body, created_at)
    VALUES (user_id1, 'sara@za.com', '¡Hola de nuevo, pero desde un seed!', '2026-09-17 10:12:13+00:00'),
        (user_id2, 'pepe@trueno.com', 'holaaaa saraaaa q tal???', '2026-09-17 10:13:54+00:00'),
        (user_id1, 'sara@za.com', '¿Cómo estás, Pepe?', '2026-09-17 10:14:37+00:00');
  END;
$$;
```

| | `CREATE FUNCTION ... AS $$ ... $$` | `DO $$ ... $$` |
|---|---|---|
| Qué hace | **Define** una función con nombre, que queda guardada en la base | **Ejecuta** el código una vez, en el momento |
| ¿Se puede volver a llamar? | Sí, por su nombre | No, no tiene nombre |
| Parámetros y retorno | Sí | No |
| En JS sería | `function f() { ... }` | Un bloque de código que se ejecuta al cargarse el archivo |

### PERFORM vs guardar el retorno

En la clase 09 la función se llamaba con **`PERFORM`**:

```sql
PERFORM public.create_user_with_profile('sara@za.com', ...);
```

`PERFORM` **invoca una función y descarta lo que devuelve**. Alcanzaba porque solo interesaba crear los usuarios.

Ahora los mensajes del seed necesitan el **`sender_id`**, o sea, el id de cada usuario creado. Por eso, en vez de `PERFORM`, el retorno se **guarda en una variable** con `:=` y después se usa en el `INSERT` de los mensajes:

```sql
user_id1 := public.create_user_with_profile('sara@za.com', ...);   -- guardamos el id que devuelve
...
VALUES (user_id1, 'sara@za.com', '¡Hola de nuevo...', ...)          -- y lo usamos como sender_id
```

Por eso el `INSERT` de los mensajes se movió **adentro** del bloque `DO`: las variables `user_id1` y `user_id2` solo existen ahí.

| | `PERFORM funcion(...)` | `variable := funcion(...)` |
|---|---|---|
| ¿Ejecuta la función? | Sí | Sí |
| ¿Qué pasa con lo que devuelve? | Se descarta | Se guarda en la variable |
| En JS sería | `crearUsuario(...);` | `const id = crearUsuario(...);` |

---

## Flujo completo

```
[Editar el perfil]
Mi perfil → click en "Editar" → /mi-perfil/editar (guard: hay usuario → entra)
        ↓
EditProfile mounted() → se suscribe → copia bio, display_name y career a this.profile → form precargado
        ↓
El usuario cambia los campos (v-model) → "Guardar cambios" → @submit.prevent → handleSubmit()
        ↓
await updateAuthUserProfile(this.profile)
   → updateUserProfile(userData.id, data) → UPDATE user_profiles SET ... WHERE id = ...
   → userData = { ...userData, ...data } → notifyAll()
        ↓
Todos los observers reciben los datos nuevos (App, Mi perfil, el chat, el router...)
        ↓
finally → this.loading = false

[Mandar un mensaje]
PublicChat mounted() → se suscribe → this.user = { id, email, ... }
        ↓
El usuario escribe (solo el mensaje) → "Enviar" → sendPublicChatMessages({ sender_id: this.user.id, email: this.user.email, body })
        ↓
INSERT en public_chat_messages → Realtime → todos los navegadores reciben el mensaje con su sender_id

[Ver el perfil de otro]
Click en el email de un mensaje → <RouterLink :to="'/usuario/' + message.sender_id">
        ↓
/usuario/1f0c2a9e-... → guard (requiresAuth) → UserProfile
        ↓
mounted() → getUserProfileById(this.$route.params.id) → SELECT ... WHERE id = '1f0c2a9e-...'
        ↓
this.user = el perfil → "Perfil de sara@za.com"
```

---

## Observaciones sobre el código de la clase

| Dónde | Qué pasa | Cómo se arreglaría |
|---|---|---|
| Migración del chat | Se **editó** una migración ya aplicada: `migration up` no agrega la columna `sender_id` | Correr `supabase db reset`. En un proyecto real: migración nueva con `ALTER TABLE` |
| `UserProfile.vue` | Si el id de la URL no existe, `getUserProfileById` devuelve `undefined` y `this.user` queda `undefined`: el template falla al leer `user.email` | Chequear el resultado (`if (!profile) ...`) y mostrar "Usuario no encontrado" |
| `UserProfile.vue` | Si se navega de `/usuario/A` a `/usuario/B` **sin pasar por otra página**, Vue Router reutiliza el mismo componente y `mounted()` **no se vuelve a ejecutar**: se sigue viendo el perfil de A | Escuchar los cambios de `$route.params.id` con un `watch`, o agregarle `:key="$route.fullPath"` al `<RouterView>` |
| `PublicChat.vue` | Sigue sin `await` en `handleMessageSend` (viene de la clase 07) | `await sendPublicChatMessages({ ... });` |
| `PublicChat.vue`, `EditProfile.vue` | Más componentes que se suscriben al servicio sin poder desuscribirse (el problema de la clase 09 crece) | Que `subscribeToAuthStateChange` devuelva una función para desuscribirse y llamarla en `unmounted()` |
| `EditProfile.vue` | Al guardar no hay ningún aviso de éxito ni redirección; los `catch` siguen vacíos; `loading` no se usa en el template | Mensaje de "Cambios guardados", `this.$router.push('/mi-perfil')`, `:disabled="loading"` en el botón |
| `public_chat_messages` | El `email` está duplicado (también se podría obtener desde el `sender_id`) | Aceptable por simplicidad; si el usuario cambia el email, los mensajes viejos quedan con el anterior |
| Tablas | Siguen sin RLS: cualquiera podría editar cualquier perfil o mandar un mensaje con otro `sender_id` | Las RLS de las próximas clases |
| Comentarios | Quedaron `TODO` ya resueltos: "Perfiles de usuarios" en `App.vue` y "Ver perfiles de otros usuarios" en el seed | — |

**Próximo `TODO` del profe:** chat privado (está en `UserProfile.vue`).

---

## Cómo probarlo

```bash
# Desde clase-10/ (con Docker Desktop abierto)
npm install                 # pnpm install
npx supabase start          # pnpm supabase start
npx supabase db reset       # pnpm supabase db reset   → OBLIGATORIO: la migración del chat cambió
npm run dev                 # pnpm dev
```

1. Ingresar con `sara@za.com` / `asdasd`.
2. **Chat:** el formulario ya no pide el email. Los 3 mensajes del seed aparecen con el email como link azul. Mandar un mensaje: sale con el email de Sara.
3. Click en `pepe@trueno.com` en un mensaje: va a `/usuario/<id de Pepe>` y muestra "Perfil de pepe@trueno.com", con bio y carrera "Sin especificar...".
4. **Mi perfil → Editar:** el formulario aparece precargado. Cambiar la bio y guardar. Volver a Mi perfil: ya se ve la bio nueva (sin recargar).
5. En el Studio (`http://127.0.0.1:54323`) → *Table Editor*:
   - `user_profiles`: la fila de Sara tiene la bio nueva.
   - `public_chat_messages`: cada mensaje tiene su `sender_id`, igual al id de su usuario en *Authentication*.

---

## Resumen para el parcial

- `.update(data).eq('id', id)` ≈ `UPDATE ... SET ... WHERE id = ...`. **Siempre con filtro**.
- `updateAuthUserProfile()` guarda en la base, actualiza `userData` y hace `notifyAll()`: todos los observers se enteran.
- Doble spread `{ ...viejo, ...nuevo }`: las propiedades del último pisan a las del primero.
- `catch (error) { ...; throw error; }` registra el error y lo relanza para que el que llamó también se entere.
- `finally` se ejecuta **siempre** después del `try` / `catch`: ideal para `this.loading = false`.
- Parámetro de ruta: `path: '/usuario/:id'`; se lee con `this.$route.params.id`.
- `$route` = la ruta actual (leer); `$router` = el router (navegar).
- `v-bind:atributo` / `:atributo` = el valor del atributo es una expresión de JS (`:to="'/usuario/' + id"`).
- `sender_id uuid not null references auth.users (id)` = FK → relación **1 a muchos** (un usuario, muchos mensajes).
- Editar una migración ya aplicada obliga a `db reset`; con datos reales, siempre **migración nueva**.
- **PL/pgSQL** = el lenguaje de programación de Postgres (procedural), escrito como string dentro de SQL.
- `CREATE OR REPLACE FUNCTION nombre(params) RETURNS tipo AS $$ ... $$ LANGUAGE plpgsql;` define una función.
- `$$ ... $$` delimita el string del código sin problemas con las comillas.
- `DECLARE` (variables con tipo, separadas con `;`) → `BEGIN` (sin `;`) ... `END;`.
- Asignar con `:=` (no con `=`, que se confunde con la comparación).
- `DO $$ ... $$` ejecuta código suelto; `PERFORM` llama a una función y descarta el retorno; `var := funcion()` lo guarda.
- `crypt(password, gen_salt('bf', 12))` = bcrypt con costo 12.
