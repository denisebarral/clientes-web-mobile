# CLAUDE.md — Instrucciones para este repositorio

## Contexto del proyecto y perfil de la estudiante

Este repositorio contiene las clases y la práctica personal de la materia **Clientes Web Mobile**, de la carrera **Diseño y Programación Web** (terciario) en el **Instituto Da Vinci**.

**Perfil:** estudiante junior, cursando las últimas materias de la carrera. Nunca trabajó en producción; siempre en ambiente local. Está aprendiendo git y GitHub.

**Base previa (usarla como punto de comparación):**
- **Laravel, PHP, MySQL con phpMyAdmin** (materias anteriores).
- **Vue.js básico con la API de Options** (materia anterior, versión vieja).
- **Aplicaciones Híbridas** (cuatrimestre pasado): **Node.js + Express + MongoDB Atlas** con patrón **MVC**, armado de **APIs REST**, prueba de endpoints con **Postman** y documentación con **Swagger**, autenticación con **JWT**, y **React + React Router + Bootstrap** en el front (hooks, Context, capa de servicios).

Las explicaciones tienen que ir **de lo conocido a lo nuevo**: si algo tiene un equivalente en React, Express, MongoDB, MySQL o Laravel, mencionarlo y compararlo. No asumir que conoce un concepto por el solo hecho de que ya pasó por otra materia: **reforzar siempre**.

---

## Stack tecnológico de la materia

| Herramienta | Para qué se usa | Desde |
|---|---|---|
| **Vite** | Bundler y servidor de desarrollo | Clase 02 |
| **Vue 3 — API de Options** | Framework de componentes (`data`, `methods`, `mounted`, etc.) | Clase 02 |
| **Vue 3 — API de Composition** | Se verá más adelante (`setup`, `ref`, `reactive`, etc.) | A confirmar |
| **Vue Router** | Ruteo del lado del cliente (SPA) con `createWebHistory()` | Clase 03 |
| **Tailwind CSS v4** | Estilos con clases de utilidad, vía `@tailwindcss/vite` (sin `tailwind.config.js`) | Clase 03 |
| **Supabase** | BaaS: base de datos Postgres, Data API, Realtime y Auth | Clase 05 |
| **Supabase local (Docker)** | Deploy local de desarrollo con el CLI de Supabase, migraciones y seed | Clases 06–07 |

**Proyecto que se construye clase a clase:** "DV Social", un sitio con chat público global en tiempo real que va sumando funcionalidades (registro, login, perfiles, etc.).

---

## Tipos de carpetas en este repositorio

```
clase-NN/                → Código que trabaja el profe en la clase NN (llega en un .zip).
                           Usa npm (tiene package-lock.json).
practica-denise-barral/  → Práctica personal de la estudiante: aplica lo que se ve en cada clase.
                           Va a ser la base del primer parcial. Usa pnpm.
referencia-readme/       → Material de referencia de otra materia. NO se toca.
```

Cada carpeta de clase tiene en su raíz un archivo **`teoria-clase-NN.md`**: es el **machete** de esa clase (ver Paso 3).

Algunas clases tienen además archivos `.md` sueltos que escribió el profe (`tailwind.md`, `supabase.md`, `migraciones-supabase.md`, `comparacion-tecnologias.md`). Son material de la clase: **leerlos** para armar el machete, pero **no modificarlos**.

**Cómo identificar qué hay en una carpeta antes de empezar:**
- Ver `package.json` para saber qué dependencias hay (¿ya está `vue-router`? ¿`tailwindcss`? ¿`@supabase/supabase-js`?).
- Si tiene carpeta `supabase/` → usa el CLI de Supabase (deploy local). Si además tiene `supabase/migrations/` → las tablas se crean con migraciones.
- Ver `src/services/supabase.js` para saber si apunta al hosting (`https://xxxx.supabase.co`) o al local (`http://127.0.0.1:<puerto>`).

---

## Gestores de paquetes

- El **profe usa npm** (`npm install`, `npx supabase ...`). Las carpetas `clase-NN/` tienen `package-lock.json`.
- La **estudiante usa pnpm** en `practica-denise-barral/` (`pnpm install`, `pnpm supabase ...`).
- **Nunca mezclar** npm y pnpm en el mismo proyecto.
- Cuando se muestre un comando, mostrar **las dos versiones** (npm y pnpm) si aplica:

| npm | pnpm |
|---|---|
| `npm install` | `pnpm install` |
| `npm run dev` | `pnpm dev` |
| `npm install paquete` | `pnpm add paquete` |
| `npm install paquete --save-dev` | `pnpm add -D paquete` |
| `npx supabase start` | `pnpm supabase start` (si `supabase` está instalado en el proyecto) |
| `npx paquete` (sin instalar) | `pnpm dlx paquete` |

- En pnpm v11, los paquetes que necesitan correr scripts de instalación (como `supabase`, que descarga su binario) se habilitan en `pnpm-workspace.yaml` con `allowBuilds:` (así ya está en `practica-denise-barral/`).

---

## Proceso para carpetas de clase

### Paso 1 — Relevar los cambios

Comparar la carpeta de la clase con la **clase anterior** y leer todo lo nuevo o modificado:
- `index.html` (clases de Tailwind sobre `<html>`, `<body>` o `#app`).
- `vite.config.js` (plugins nuevos).
- `src/main.js` (plugins de Vue como el router, imports de CSS).
- `src/App.vue`, `src/pages/*.vue`, `src/components/*.vue`.
- `src/router/router.js` (rutas nuevas).
- `src/services/*.js` (lógica de Supabase).
- `src/style.css` (`@theme`, `@layer`, `@apply`).
- `supabase/migrations/*.sql` y `supabase/seed.sql`.
- Dependencias nuevas en `package.json`.
- Los `.md` del profe que haya en la carpeta.

No tocar: `node_modules/`, `package-lock.json`, `pnpm-lock.yaml`, `supabase/.temp/`, `supabase/.branches/`, `supabase/config.toml`, archivos `.env`, archivos estáticos de `public/` ni `src/bootstrap.min.css`.

**Ojo:** los zips del profe a veces tienen diferencias de redacción en los comentarios entre una clase y otra (son de distintas comisiones o versiones). Lo importante son los **cambios de código y de conceptos**, no las diferencias de redacción.

---

### Paso 2 — Comentar el código nuevo o modificado

#### Criterio general

- Comentar el **PORQUÉ**, no solo el QUÉ: por qué se hace así, qué restricción hay detrás, qué error evita.
- No comentar lo que el nombre del identificador ya dice.
- **El profe ya deja comentarios largos y explicativos. No borrarlos ni reescribirlos.** Sumar comentarios solo donde falten (archivos sin explicación, bloques nuevos, cosas que aparecen por primera vez) o donde haya algo que vale la pena aclarar (por ejemplo, un `await` que falta).
- Se pueden corregir errores de tipeo evidentes en comentarios que haya escrito la estudiante.
- **Nunca cambiar el comportamiento del código** al comentar. Si se detecta un bug, dejarlo señalado con un comentario `// OJO:` y anotarlo en el machete, pero no corregirlo salvo que la estudiante lo pida.

#### Comentarios en componentes Vue (`.vue`, API de Options)

**Comentario de archivo** al inicio de cada `.vue` nuevo o modificado (antes del `<script>` o `<template>`):
```html
<!--
    NombreComponente.vue — Qué es este componente.
    Qué responsabilidad tiene (página, layout, componente reutilizable, etc.).
    Qué NO hace (para dejar claro el límite: por ejemplo, "no habla con Supabase, eso lo hace el servicio").
-->
```

**Comentarios prioritarios en el `<script>`:**
- `name` y `components` la primera vez que aparecen (por qué hay que registrar el componente importado).
- `data()`: por qué es una función, qué representa cada propiedad del state y su valor inicial.
- `methods`: qué dispara cada método (qué evento del template) y su flujo.
- Hooks del ciclo de vida (`mounted`, etc.): por qué esa lógica va en ese hook.
- `this`: de dónde sale y por qué en un arrow function sigue apuntando al componente.
- `async`/`await` y `try`/`catch`: qué promesa se espera y qué pasa si falla.
- Destructuring (`const { data, error } = await ...`): qué objeto se está desestructurando.

**Comentarios prioritarios en el `<template>`** (comentarios HTML `<!-- -->`):
- Directivas la primera vez que aparecen: `v-for`, `:key`, `v-on`/`@`, modificadores (`.prevent`), `v-model`, `v-if`/`v-show`, `v-bind`/`:`.
- Interpolación `{{ }}`.
- `<RouterLink>`, `<RouterView>`, `<slot>`.
- Clases de Tailwind no evidentes: prefijos responsive (`md:`), estados (`hover:`), valores arbitrarios (`grid-rows-[60px_1fr_100px]`), `sr-only`, `container`.

#### Comentarios en servicios y JS (`src/services/*.js`, `router.js`, `main.js`)

**Comentario de archivo** al inicio:
```js
/*
    nombreArchivo.js — Qué es este archivo.
    Qué responsabilidad tiene dentro de la app.
    Qué NO hace.
*/
```

**Docblock JSDoc en funciones exportadas:**
```js
/**
 * nombreFuncion - Descripción de qué hace.
 *
 * Flujo paso a paso si la lógica no es trivial.
 *
 * @param {tipo} nombre - Descripción.
 * @returns {Promise<tipo>} Qué devuelve y cuándo.
 * @throws {Error} En qué condiciones falla.
 */
```

**Comentarios inline prioritarios en Supabase:**
- La cadena del query builder (`.from()`, `.select()`, `.insert()`, `.order()`, `.eq()`, etc.): qué hace cada eslabón y su equivalente en SQL.
- Que la consulta recién se ejecuta con el `await`.
- El objeto de respuesta `{ data, error }` y por qué Supabase **no lanza excepciones** (hay que chequear `error` a mano).
- Realtime: `channel()`, `on()`, `subscribe()`, `payload.new`.
- Auth: `supabase.auth.signUp()`, `signInWithPassword()`, `signOut()`, `onAuthStateChange()`, etc.

#### Comentarios en SQL (`supabase/migrations/*.sql`, `supabase/seed.sql`)

Usar `--`. Explicar cada columna y su tipo de Postgres (`bigint`, `generated always as identity`, `text`, `timestamptz`, `default now()`), comparando con MySQL cuando sirva (por ejemplo, `generated always as identity` ≈ `AUTO_INCREMENT`). Explicar `ALTER PUBLICATION supabase_realtime ...`, las policies de RLS si aparecen, y para qué sirve el seed.

---

### Paso 3 — Escribir (o actualizar) el machete de la clase

El archivo se llama **`teoria-clase-NN.md`** y está en la raíz de la carpeta de la clase. Es el machete de estudio: tiene que servir para repasar para el parcial **sin abrir el código**.

**Estructura base:**

```markdown
# Clase NN — Título descriptivo

## Índice
(links internos a cada sección)

---

## ¿Qué se hizo esta clase?
Resumen en 2 o 3 líneas + tabla de cambios respecto a la clase anterior:
qué archivo cambió o se agregó, qué se hizo y por qué.

---

## Estructura de archivos
Árbol de carpetas marcando NUEVO / MODIFICADO.

---

## (Secciones de contenido según lo que haya en la clase)

---

## Cómo probarlo
Comandos (npm y pnpm), URLs, qué se tiene que ver.

---

## Resumen para el parcial
Lista corta de los conceptos clave de la clase, en una línea cada uno.
```

#### Secciones posibles

- **Conceptos teóricos:** qué es la tecnología o el concepto nuevo, para qué sirve y qué problema resuelve.
- **Comparaciones con lo conocido:** siempre con tabla. Por ejemplo:
  - Vue (Options) vs React (`data` vs `useState`, `mounted` vs `useEffect(..., [])`, `v-for` vs `.map()`, `v-model` vs input controlado, `<slot>` vs `children`).
  - Vue Router vs React Router (`<RouterLink to>` vs `<Link to>`, `<RouterView>` vs `<Outlet>`).
  - Tailwind vs Bootstrap (utilidades vs componentes semánticos).
  - Supabase vs la API propia con Express + MongoDB (BaaS vs backend programado a mano, Data API vs endpoints REST, Supabase Auth vs JWT hecho a mano).
  - Query builder de Supabase vs SQL vs MongoDB (`.select()` ≈ `SELECT *` ≈ `find()`).
  - Migraciones de Supabase vs migraciones de Laravel; `seed.sql` vs seeders de Laravel.
  - Hosting de Supabase vs deploy local con Docker.
- **Desglose de código clave:** las líneas más importantes o confusas, explicadas parte por parte, con valores reales del proyecto (`public_chat_messages`, `email`, `body`, `created_at`, etc.).
- **Flujo completo:** diagrama en texto. Por ejemplo: usuario escribe → `v-model` → `@submit.prevent` → método → servicio → Supabase → Realtime → `payload.new` → `this.messages.push()` → re-render.
- **¿Cuándo usar X vs Y?:** cuando haya dos formas de hacer algo (por ejemplo, `createWebHistory()` vs `createWebHashHistory()`, `@apply` vs componente Vue, `migration up` vs `db reset`), mostrar ambas con tabla y una regla práctica.
- **Observaciones sobre el código de la clase:** bugs, `TODO` del profe, cosas que quedaron a medias, con explicación de qué pasa y cómo se arreglaría.

#### Tono y estilo

- Español rioplatense, estilo **"profe que explica"**: contexto antes del código, de lo abstracto a lo concreto.
- **Nunca dar por sentado que la estudiante conoce un concepto nuevo**, aunque parezca obvio (`rem`, SPA, directiva, reactividad, BaaS, Docker, migración, etc.).
- Tablas comparativas cada vez que algo nuevo tenga un equivalente conocido.
- Ejemplos con **valores reales del proyecto**, no ejemplos genéricos.
- Bloques de código con comentarios en las partes no obvias.
- Al explicar un patrón, mencionar también **sus limitaciones** y la alternativa más profesional (por ejemplo: keys hardcodeadas en `supabase.js` → variables de entorno `import.meta.env.VITE_...`; tabla sin RLS → policies; Options API → Composition API).

---

## Proceso para `practica-denise-barral/`

- Es el proyecto **propio** de la estudiante y la base del parcial: **tiene que poder entender y explicar cada línea**.
- **Salvo que lo pida explícitamente, solo se comenta y se ordena el código** (comentarios, prolijidad de los comentarios). No se agregan funcionalidades, no se refactoriza y no se corrigen bugs por cuenta propia: se señalan con `// OJO:` y se le avisan en el chat.
- Mismo criterio de comentarios que el Paso 2.
- Para estilos, respetar la guía de `practica-denise-barral/estilizacion.md`.
- En `practica-denise-barral/` no se escribe machete: la teoría vive en los `teoria-clase-NN.md` de cada clase.

---

## Manejo de preguntas conceptuales durante la conversación

Es muy frecuente que la estudiante haga preguntas de comprensión mientras trabaja ("¿qué estamos desestructurando acá?", "¿cuál es el comando de pnpm para esto?", "¿por qué me da 404?"). Cuando pase:

1. Responder la pregunta de forma completa y didáctica en el chat.
2. Al terminar, **ofrecer agregar esa explicación** al `teoria-clase-NN.md` de la clase donde se vio ese tema.
3. Si confirma, incorporarla en la sección que corresponda (o crear una sección nueva si el tema lo amerita, por ejemplo "Preguntas frecuentes / errores comunes").

Las conversaciones de comprensión son tan valiosas como el código: tienen que quedar documentadas.

---

## Lo que NO hay que hacer

- No modificar el **comportamiento** del código de las clases del profe (solo comentar).
- No agregar funcionalidades más allá de lo que el código ya tiene.
- No crear archivos de documentación adicionales fuera de los `teoria-clase-NN.md`.
- No modificar los `.md` del profe ni los archivos de `referencia-readme/`.
- No modificar `node_modules/`, lockfiles, `.gitignore`, `.env`, `supabase/config.toml`, `supabase/.temp/` ni `supabase/.branches/`.
- No agregar comentarios que solo repitan lo que el código obviamente hace.
- No mezclar npm y pnpm en el mismo proyecto.
- No trabajar sobre una clase que la estudiante todavía no pidió documentar.

---

## Convenciones del proyecto

### Estructura de `src/`

```
src/
├── main.js             → crea la app de Vue, registra el router, importa el CSS y monta en #app
├── App.vue             → layout general: nav + <main> con <RouterView /> + footer
├── style.css           → @import 'tailwindcss' + @layer components (clase .h1)
├── router/router.js    → lista de rutas + createRouter()
├── pages/              → un componente por ruta (Home, PublicChat, Login, Register)
├── components/         → componentes reutilizables (BaseH1, ...)
└── services/           → toda la lógica de Supabase (supabase.js, public-chat.js, auth.js)
```

### Rutas

| Ruta | Página |
|---|---|
| `/` | `Home.vue` |
| `/chat` | `PublicChat.vue` |
| `/ingresar` | `Login.vue` |
| `/crear-cuenta` | `Register.vue` |

### Supabase

- Tabla principal: `public_chat_messages` (`id`, `email`, `body`, `created_at`), con Realtime habilitado.
- **Los componentes no llaman a Supabase directamente**: lo hacen a través de `src/services/` (desde la clase 07).
- Deploy local: requiere Docker Desktop (en Windows, con WSL2). Comandos: `supabase start`, `supabase stop`, `supabase migration new <nombre>`, `supabase migration up`, `supabase db reset`.
- Puertos por defecto del deploy local: API `54321`, Postgres `54322`, Studio `54323`, Mailpit (emails de prueba) `54324`. El profe en la clase 07 usa `64321`/`64322` (cambió los puertos en su `config.toml`); la práctica de la estudiante usa los puertos por defecto.
- La base local arranca **vacía**: las tablas se crean con migraciones y los datos iniciales con `supabase/seed.sql`.
