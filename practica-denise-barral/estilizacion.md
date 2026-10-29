# CLAUDE.md: guía de estilos del proyecto

> Este archivo es contexto para Claude Code. Leelo antes de escribir o modificar estilos en este proyecto.
> Machete visual de referencia (para la alumna, es privado y el agente no puede abrirlo): https://claude.ai/artifact/Hzy3qsh38TomPg6KA93q4F

---

## 1. Contexto: quién escribe este código

- Soy **estudiante junior** de Diseño y Desarrollo Web (Escuela Da Vinci, materia **Clientes Web Mobile**).
- Este proyecto es para un **parcial**. Tengo que poder **entender y explicar cada línea** que quede en el código.
- Stack: **Vite + Vue 3 (API de Options por ahora; más adelante, Composition) + Vue Router (`createWebHistory()`, URLs sin `#`) + Tailwind CSS v4 (`@tailwindcss/vite`) + Supabase** (deploy local con Docker durante el desarrollo). Gestor de paquetes: **pnpm**.
- Estilizar con **Tailwind es requisito de la materia**.

### Cómo quiero que trabajes

- El sitio tiene que quedar **prolijo y lindo, pero simple**. Nada de "magia" de nivel senior.
- Explicame en español y en pocas líneas qué cambiaste y por qué, sobre todo si usás una clase o un patrón que no aparece en este archivo.
- Si hay dos formas de hacer algo, elegí la más fácil de leer, aunque sea un poco más larga.
- Antes de agregar una dependencia nueva, **preguntame**.

### Permitido

- Clases de utilidad de Tailwind directamente en el template.
- Prefijos responsive (`sm:`, `md:`, `lg:`) y de estado (`hover:`, `focus-visible:`, `active:`, `disabled:`).
- `transition` y `duration-*` para hovers suaves.
- Valores arbitrarios simples (`grid-cols-[250px_1fr]`, `h-[100px]`) cuando no existe una clase en la escala.
- Componentes Vue `Base*` con `<slot />` para no repetir combinaciones de clases.
- `@theme` y `@layer base` en `src/style.css` (ver sección 3).

### No hacer (salvo que te lo pida)

- Librerías de UI o de componentes (DaisyUI, Flowbite, Headless UI, PrimeVue, etc.), plugins de Tailwind ni librerías de animación.
- `@apply` para armar "componentes CSS". La reutilización se hace con componentes Vue. (`@apply` solo está permitido dentro de `@layer base`, para tipografía global.)
- Clases armadas dinámicamente con strings (`` `bg-${color}-500` ``): Tailwind no las detecta. Usar objetos o mapas con clases completas.
- Variantes avanzadas: `[&>*]:`, `peer-*`, `group-*` anidados, `has-*`, container queries (`@container`), `supports-*`.
- Animaciones complejas (`@keyframes` propios, efectos parallax, animaciones al hacer scroll).
- Modo oscuro (`dark:`).
- CSS escrito a mano en `<style>` dentro de los componentes, estilos inline (`style="..."`) o `!important`.
- Colores o tipografías que no estén en la sección 3.
- Clases de Tailwind v3 que no existen en v4 (por ejemplo `max-w-screen-lg`) o archivo `tailwind.config.js` (v4 se configura en el CSS).

---

## 2. Reglas de layout (obligatorias)

Tailwind no impone estructura como Bootstrap (container › row › col). Estas son las reglas de este proyecto.

### Los 4 niveles de la app

| Nivel | Qué es | Lleva | No lleva |
|---|---|---|---|
| 1 · Esqueleto | div raíz de `App.vue` | `min-h-dvh grid grid-rows-[auto_1fr_auto]` y nada más | Ancho máximo, padding, colores |
| 2 · Zonas | `<header>`, `<main>`, `<footer>` | Lo que va de lado a lado: fondo, borde, sombra, padding vertical (`py-*`) | Ancho máximo ni padding lateral |
| 3 · Container | componente `BaseContainer` | Siempre `mx-auto max-w-6xl px-4` | Nada más. No se modifica por página |
| 4 · Contenido | nav, páginas, secciones | El layout: `flex` o `grid`, `gap-*`, columnas responsive | Container (ya lo tiene arriba) |
| Componentes | cards, botones, formularios | Su "adentro": padding, fondo, bordes, tipografía | Su propio ancho o margen externo: lo decide el padre |

- El `#app` de `index.html` **no lleva clases**.
- Las **páginas** (`src/pages/*.vue`) **no llevan container**: ya lo pone `App.vue` dentro del `<main>`.

### Las 8 reglas

1. **El layout lo decide el padre.** `flex`, `grid`, `grid-cols-*`, `gap-*`, `justify-*`, `items-*` van en el padre. En los hijos, solo lo excepcional (`col-span-2`, `flex-1`, `self-*`).
2. **Espacio entre hermanos = `gap` (o `space-y`) en el padre.** No poner `mt-*` en cada hijo.
3. **Fondo a lo ancho, contenido en el container.** Lo que toca los bordes de la pantalla va en la zona; el contenido, adentro de `BaseContainer`.
4. **Un solo ancho máximo para toda la app**, definido en `BaseContainer`. No escribir `max-w-6xl` suelto en una página.
5. **Un componente no decide dónde está.** Una card define su padding, fondo y bordes, pero no su ancho ni su margen externo.
6. **Si una combinación de clases se repite 3 veces, se convierte en componente** (`BaseButton`, `BaseCard`, `BaseHeading1`…).
7. **Mobile first.** La clase sin prefijo es para el celular; `md:` y `lg:` solo para lo que cambia.
8. **Usar la escala de Tailwind** (múltiplos de 4px: `p-4`, `gap-6`). Valores arbitrarios solo si no hay otra opción.

### Flex o Grid

- **Flex**: elementos en una sola dirección (una fila o una columna). Navbar, botones en fila, el interior de una card.
- **Grid**: filas y columnas a la vez. El esqueleto de la app y los listados de cards.
- Se pueden anidar sin límite: cualquier item de un grid puede ser a su vez `flex` o `grid`. Las clases del padre solo afectan a los **hijos directos**.

### Breakpoints (mobile first)

| Pantalla | Prefijo | Desde |
|---|---|---|
| Mobile | (sin prefijo) | 0px |
| Tablet | `md:` | 768px |
| Desktop | `lg:` | 1024px |

`sm:` (640px) y `xl:` (1280px) se usan solo si hace falta.

### Estructura de referencia

```vue
<!-- src/App.vue -->
<template>
  <div class="min-h-dvh grid grid-rows-[auto_1fr_auto]">
    <AppNavbar />
    <main class="py-8">
      <BaseContainer>
        <router-view />
      </BaseContainer>
    </main>
    <AppFooter />
  </div>
</template>
```

```vue
<!-- src/components/BaseContainer.vue -->
<template>
  <div class="mx-auto max-w-6xl px-4">
    <slot />
  </div>
</template>
```

```vue
<!-- src/components/AppNavbar.vue (template) -->
<header class="bg-noche text-papel">
  <BaseContainer>
    <nav class="flex h-16 items-center justify-between">
      <router-link to="/" class="font-display text-xl font-semibold">Marca</router-link>
      <ul class="hidden md:flex gap-6">…</ul>
      <button class="md:hidden" aria-label="Abrir menú">☰</button>
    </nav>
  </BaseContainer>
</header>
```

```vue
<!-- src/pages/Productos.vue (template): sin container -->
<section class="space-y-6">
  <BaseHeading1>Productos</BaseHeading1>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <ProductCard v-for="p in productos" :key="p.id" :producto="p" />
  </div>
</section>
```

---

## 3. Marca: tipografías y paleta

### Tipografías

| Uso | Fuente | Peso | Clase |
|---|---|---|---|
| Textos (cuerpo, botones, formularios) | **Inter** | 400 regular · 500 medium | por defecto (`font-sans`) |
| Títulos (h1, h2, h3) | **Poppins** | 600 semibold | `font-display font-semibold` |

En `index.html`, dentro del `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@600&display=swap" rel="stylesheet">
```

### Paleta de colores

Sacada del Figma del proyecto (frame "Paleta de colores"). Hay 5 colores, y cada uno tiene una versión **clara**, una **base** y una **oscura**.

| Color | Clase base | `-claro` | Base | `-oscuro` |
|---|---|---|---|---|
| **Noche** | `bg-noche` | `#2A2652` | `#14122B` | `#0A0917` |
| **Tinta** | `bg-tinta` | `#59509E` | `#241F45` | `#241F45` ⚠️ |
| **Luz** | `bg-luz` | `#FF8F63` | `#FF5A3C` | `#C9331C` |
| **Marquesina** | `bg-marquesina` | `#FFE2A1` | `#FFC65C` | `#E08A1E` |
| **Papel** | `bg-papel` | `#FCFBF8` | `#F5F1E8` | `#E0DACC` |

> ⚠️ En el Figma, `tinta-oscuro` tiene el mismo valor que `tinta`. Por ahora no uses `tinta-oscuro`.
> Los 5 colores base salen de las variables del Figma (`primary-noche`, `primary-tinta`, etc.). Las versiones claras y oscuras se midieron del frame de la paleta: si en Figma se ajustan, actualizarlas acá y en `@theme`.

#### Para qué se usa cada color

| Rol | Color | Ejemplo |
|---|---|---|
| Fondo general de la página | `papel` | `bg-papel` |
| Fondo de cards, inputs y modales | `papel-claro` | `bg-papel-claro` |
| Bordes y separadores | `papel-oscuro` | `border-papel-oscuro` |
| Texto principal sobre fondos claros | `tinta` | `text-tinta` |
| Texto secundario sobre fondos claros | `tinta-claro` | `text-tinta-claro` |
| Fondos oscuros (header, footer, hero) | `noche` | `bg-noche text-papel` |
| Acción principal (botones, CTA) | `luz` | `bg-luz text-noche` |
| Links sobre fondos claros | `luz-oscuro` | `text-luz-oscuro` |
| Destacados (badges, íconos, detalles) | `marquesina` | `bg-marquesina text-noche`, o `text-marquesina` sobre `noche` |

#### Contraste: combinaciones permitidas y prohibidas

Mínimo para texto normal: **4.5:1** (WCAG AA).

| Combinación | Contraste | ¿Se puede? |
|---|---|---|
| `text-tinta` sobre `bg-papel` | 13.7 | ✅ Texto principal |
| `text-papel` sobre `bg-noche` | 16.2 | ✅ |
| `text-marquesina` sobre `bg-noche` | 11.7 | ✅ |
| `text-noche` sobre `bg-luz` | 5.9 | ✅ Texto de botón principal |
| `text-tinta-claro` sobre `bg-papel` | 6.1 | ✅ Texto secundario |
| `text-luz-oscuro` sobre `bg-papel` | 4.7 | ✅ Links |
| `text-white` sobre `bg-luz` | 3.1 | ❌ Solo en títulos grandes (24px o más) |
| `text-luz` sobre `bg-papel` | 2.8 | ❌ Usar `text-luz-oscuro` |
| `text-marquesina` sobre fondos claros | < 2.5 | ❌ Marquesina sobre claro solo como fondo, con `text-noche` |

#### Degradados

En el Figma cada color tiene un degradado que va de su versión oscura a la clara. En Tailwind v4 se escriben así:

| Degradado | Clases |
|---|---|
| Noche | `bg-linear-to-b from-noche-oscuro via-noche to-noche-claro` |
| Tinta | `bg-linear-to-b from-tinta to-tinta-claro` |
| Luz | `bg-linear-to-r from-luz-oscuro via-luz to-luz-claro` |
| Marquesina | `bg-linear-to-b from-marquesina-oscuro via-marquesina to-marquesina-claro` |
| Papel | `bg-linear-to-b from-papel-oscuro via-papel to-papel-claro` |

Usarlos poco: en un hero o una sección destacada, no en cada card.

#### Reglas de color

- **Para la interfaz, usar solo los tokens de esta paleta.** Nada de HEX sueltos en el template (`bg-[#123456]`). Excepción: `text-white` y `bg-white` si hace falta.
- **Colores de estado (éxito, error, advertencia, info): usar la paleta default de Tailwind.** No hace falta inventar colores: elegí de la paleta de Tailwind los tonos que mejor combinen con la marca (que es cálida: violetas oscuros, naranja, amarillo y crema). Solo para mensajes, alertas, validaciones de formularios y badges de estado, nunca para decorar.

#### Colores de estado

Se definen **una sola vez** como alias en `@theme` y se usan siempre con esos nombres. Así, si querés cambiar un tono, lo cambiás en un solo lugar. Punto de partida sugerido (podés ajustar el tono si otro combina mejor):

| Estado | Token | Tono de Tailwind sugerido | Texto / borde | Fondo suave |
|---|---|---|---|---|
| Éxito | `exito` | `emerald` | `text-exito` (emerald-700) | `bg-exito-suave` (emerald-50) |
| Error | `error` | `red` | `text-error` (red-700) | `bg-error-suave` (red-50) |
| Advertencia | `advertencia` | `amber` | `text-advertencia` (amber-800) | `bg-advertencia-suave` (amber-50) |
| Info | `info` | `indigo` | `text-info` (indigo-700) | `bg-info-suave` (indigo-50) |

- Sobre fondos claros, usar los tonos **700 u 800 para texto** (los 400–500 no alcanzan el contraste sobre `papel`) y los **50 o 100 para fondos**.
- Error va en `red` y no en `luz`, para que un mensaje de error no se confunda con un botón de la marca.
- Ejemplo de alerta: `rounded-lg border border-error/30 bg-error-suave p-4 text-sm text-error`.

### `src/style.css`

```css
@import "tailwindcss";

@theme {
  /* Tipografías */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Poppins", ui-sans-serif, system-ui, sans-serif;

  /* Paleta de la marca (Figma: "Paleta de colores") */
  --color-noche-claro: #2A2652;
  --color-noche: #14122B;
  --color-noche-oscuro: #0A0917;

  --color-tinta-claro: #59509E;
  --color-tinta: #241F45;

  --color-luz-claro: #FF8F63;
  --color-luz: #FF5A3C;
  --color-luz-oscuro: #C9331C;

  --color-marquesina-claro: #FFE2A1;
  --color-marquesina: #FFC65C;
  --color-marquesina-oscuro: #E08A1E;

  --color-papel-claro: #FCFBF8;
  --color-papel: #F5F1E8;
  --color-papel-oscuro: #E0DACC;

  /* Colores de estado: alias a la paleta default de Tailwind */
  --color-exito: var(--color-emerald-700);
  --color-exito-suave: var(--color-emerald-50);
  --color-error: var(--color-red-700);
  --color-error-suave: var(--color-red-50);
  --color-advertencia: var(--color-amber-800);
  --color-advertencia-suave: var(--color-amber-50);
  --color-info: var(--color-indigo-700);
  --color-info-suave: var(--color-indigo-50);
}

@layer base {
  body {
    @apply bg-papel text-tinta font-sans;
  }
  h1, h2, h3 {
    @apply font-display font-semibold;
  }
}
```

Con `--font-sans`, Inter queda como fuente por defecto de todo el sitio. Cada `--color-nombre` crea las clases `bg-nombre`, `text-nombre`, `border-nombre`, `from-nombre`, etc. (por ejemplo `bg-noche`, `text-luz-oscuro`, `border-papel-oscuro`).

---

## 4. Componentes base sugeridos

Crear en `src/components/` a medida que hagan falta (regla 6):

| Componente | Clases base sugeridas |
|---|---|
| `BaseContainer` | `mx-auto max-w-6xl px-4` |
| `BaseHeading1` | `font-display text-3xl font-semibold md:text-4xl` |
| `BaseHeading2` | `font-display text-2xl font-semibold` |
| `BaseButton` (principal) | `inline-flex items-center justify-center gap-2 rounded-lg bg-luz px-5 py-2.5 font-semibold text-noche transition hover:bg-luz-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta disabled:opacity-50` |
| `BaseCard` | `rounded-xl border border-papel-oscuro bg-papel-claro p-5 shadow-sm` |
| `BaseInput` | `w-full rounded-lg border border-papel-oscuro bg-papel-claro px-3 py-2 text-tinta focus-visible:outline-2 focus-visible:outline-tinta` |

Si un componente necesita variantes (por ejemplo, un botón secundario), usar una prop y un objeto con las clases **completas**:

```vue
<script setup>
const props = defineProps({ variant: { type: String, default: 'primary' } })
const variants = {
  primary: 'bg-luz text-noche hover:bg-luz-claro',
  secondary: 'border border-tinta text-tinta hover:bg-tinta hover:text-papel',
}
</script>

<template>
  <button :class="['rounded-lg px-5 py-2.5 font-semibold transition', variants[props.variant]]">
    <slot />
  </button>
</template>
```

---

## 5. Checklist antes de dar por terminada una tarea de estilos

- [ ] Se ve bien en **375px, 768px y 1280px**. No hay scroll horizontal.
- [ ] Respeta los 4 niveles: nada de container dentro de una página ni `max-w-*` suelto.
- [ ] Los espacios entre hermanos salen de `gap` o `space-y` en el padre.
- [ ] Solo se usaron colores y tipografías de la sección 3 (marca + colores de estado), y las combinaciones de texto y fondo están en la tabla de contraste permitido.
- [ ] No quedó ninguna combinación de clases repetida 3 o más veces sin su componente.
- [ ] Los elementos interactivos tienen `hover:` y `focus-visible:`, y las imágenes tienen `alt`.
- [ ] Las clases usadas existen en Tailwind v4.
- [ ] Me explicaste lo nuevo en español y en pocas líneas.

---

## 6. Tabla de referencia de clases (Tailwind v4)

Las clases de uso más frecuente. **Padre** = va en el contenedor · **Hijo** = va en un item de flex/grid · **Cualquiera** = sirve en cualquier elemento.

### Escala de espaciado

La mayoría de los números valen **número × 4px** (0.25rem): `p-1` = 4px · `p-2` = 8px · `p-4` = 16px · `p-6` = 24px · `p-8` = 32px · `p-12` = 48px · `p-16` = 64px.

### Escala de `max-w-*`

`max-w-sm` 384px · `max-w-md` 448px · `max-w-lg` 512px · `max-w-xl` 576px · `max-w-2xl` 672px · `max-w-3xl` 768px · `max-w-4xl` 896px · `max-w-5xl` 1024px · `max-w-6xl` 1152px · `max-w-7xl` 1280px · `max-w-prose` 65ch.

### Display

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `block` | `display: block;` | Ocupa todo el ancho disponible y arranca en una línea nueva. | Cualquiera |
| `inline-block` | `display: inline-block;` | Queda en línea con el texto pero acepta ancho, alto y padding vertical. | Cualquiera |
| `hidden` | `display: none;` | Oculta el elemento: no se ve ni ocupa lugar. Con md:block aparece desde tablet. | Cualquiera |
| `flex` | `display: flex;` | Activa flexbox: los hijos se ponen en fila. | Padre |
| `inline-flex` | `display: inline-flex;` | Flex, pero el elemento se comporta como texto en línea. Típico de un botón con ícono. | Padre |
| `grid` | `display: grid;` | Activa grid: los hijos caen en las celdas que definas. | Padre |

### Tamaño

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `w-full` | `width: 100%;` | Ocupa todo el ancho de su padre. | Cualquiera |
| `w-1/2` | `width: 50%;` | Fracciones del padre: w-1/3, w-2/3, w-1/4, w-3/4… | Cualquiera |
| `w-64` | `width: 16rem; /* 256px */` | Ancho fijo con la escala de ×4px (64 × 4 = 256). | Cualquiera |
| `w-fit` | `width: fit-content;` | Mide lo que mide su contenido, ni más ni menos. | Cualquiera |
| `w-screen` | `width: 100vw;` | Ancho de la ventana. Cuidado: si hay scrollbar vertical puede generar scroll horizontal. | Cualquiera |
| `h-full` | `height: 100%;` | Alto de su padre. Solo funciona si el padre tiene un alto definido. | Cualquiera |
| `h-screen` | `height: 100vh;` | Alto de la ventana. En celulares puede quedar más alto que lo visible por la barra del navegador. | Cualquiera |
| `h-dvh` | `height: 100dvh;` | Alto real visible de la pantalla. En celulares descuenta la barra del navegador. | Cualquiera |
| `min-h-screen` | `min-height: 100vh;` | Como mínimo toda la pantalla, pero si el contenido es largo crece. | Cualquiera |
| `min-h-dvh` | `min-height: 100dvh;` | Igual que la anterior pero con el alto real en celulares. La del esqueleto de tu app. | Cualquiera |
| `size-10` | `width: 2.5rem; height: 2.5rem;` | Ancho y alto iguales de una. Ideal para íconos y avatares. | Cualquiera |
| `max-w-6xl` | `max-width: 72rem; /* 1152px */` | Tope de ancho: crece hasta ahí y no más. Ver la escala completa arriba. | Cualquiera |
| `max-w-prose` | `max-width: 65ch;` | Ancho cómodo para leer párrafos (unas 65 letras por línea). | Cualquiera |
| `min-w-0` | `min-width: 0;` | Deja que un hijo de flex o grid se achique. Arregla textos largos que rompen el layout. | Hijo |

### Centrado

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `mx-auto` | `margin-inline: auto;` | Centra en horizontal un bloque que tenga un ancho o max-width definido. | Cualquiera |
| `container` | `width: 100%; max-width: (el breakpoint activo);` | Tope de ancho que salta en cada breakpoint. En v4 no centra ni tiene padding: sumale mx-auto px-4. | Padre |
| `grid place-items-center` | `display: grid; place-items: center;` | Centra a los hijos en vertical y horizontal. Con un solo hijo, lo pone en el medio. | Padre |
| `flex items-center justify-center` | `display: flex; align-items: center; justify-content: center;` | Lo mismo con flexbox: centra en los dos ejes. | Padre |
| `text-center` | `text-align: center;` | Centra el texto y los elementos en línea. No centra bloques. | Cualquiera |

### Espaciado

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `p-4` | `padding: 1rem;` | Relleno interno en los 4 lados (16px). | Cualquiera |
| `px-4` | `padding-inline: 1rem;` | Relleno a izquierda y derecha. | Cualquiera |
| `py-2` | `padding-block: .5rem;` | Relleno arriba y abajo. | Cualquiera |
| `pt-8` | `padding-top: 2rem;` | Solo un lado: pt, pr, pb, pl (top, right, bottom, left). | Cualquiera |
| `m-4` | `margin: 1rem;` | Margen externo en los 4 lados. | Cualquiera |
| `mt-6` | `margin-top: 1.5rem;` | Margen de un solo lado: mt, mr, mb, ml. | Cualquiera |
| `my-8` | `margin-block: 2rem;` | Margen arriba y abajo. | Cualquiera |
| `-mt-2` | `margin-top: -.5rem;` | Margen negativo: el guion adelante lo "tira" para el otro lado. | Cualquiera |
| `gap-4` | `gap: 1rem;` | Espacio entre los hijos de un flex o grid. Preferilo antes que márgenes. | Padre |
| `space-y-4` | `/* a cada hijo menos el último */ margin-bottom: 1rem;` | Separa a los hijos en vertical sin flex ni grid. Si el padre ya es flex o grid, usá gap. | Padre |
| `space-x-4` | `/* a cada hijo menos el último */ margin-right: 1rem;` | Lo mismo en horizontal. | Padre |

### Flex

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `flex-row` | `flex-direction: row;` | Hijos en fila (el default). | Padre |
| `flex-col` | `flex-direction: column;` | Hijos en columna, uno debajo del otro. | Padre |
| `flex-wrap` | `flex-wrap: wrap;` | Si no entran en una línea, pasan a la siguiente. | Padre |
| `justify-between` | `justify-content: space-between;` | Primero al inicio, último al final, el resto repartido en el eje principal. | Padre |
| `justify-center` | `justify-content: center;` | Agrupa a los hijos en el centro del eje principal. | Padre |
| `items-center` | `align-items: center;` | Centra a los hijos en el eje cruzado (en vertical, si están en fila). | Padre |
| `flex-1` | `flex: 1;` | El hijo crece y ocupa todo el espacio que sobra. Ej: un input al lado de un botón. | Hijo |
| `shrink-0` | `flex-shrink: 0;` | El hijo nunca se achica. Ej: un avatar que no querés aplastado. | Hijo |
| `self-end` | `align-self: flex-end;` | Alinea solo a este hijo distinto del resto. | Hijo |

### Grid

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `grid-cols-3` | `grid-template-columns: repeat(3, minmax(0, 1fr));` | 3 columnas iguales que no se desbordan. | Padre |
| `grid-cols-[250px_1fr]` | `grid-template-columns: 250px 1fr;` | Columnas a medida con valor arbitrario (los espacios van con _). | Padre |
| `grid-rows-[auto_1fr_auto]` | `grid-template-rows: auto 1fr auto;` | Header y footer a su medida y el medio con el resto. El esqueleto de tu app. | Padre |
| `auto-rows-fr` | `grid-auto-rows: minmax(0, 1fr);` | Todas las filas que se crean solas miden lo mismo. | Padre |
| `col-span-2` | `grid-column: span 2 / span 2;` | El hijo ocupa 2 columnas. | Hijo |
| `col-span-full` | `grid-column: 1 / -1;` | El hijo ocupa todo el ancho de la grilla. | Hijo |
| `row-span-2` | `grid-row: span 2 / span 2;` | El hijo ocupa 2 filas. | Hijo |

### Texto

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `text-sm` | `font-size: .875rem; line-height: 1.25rem;` | Texto chico (14px). Trae su interlineado. | Cualquiera |
| `text-base` | `font-size: 1rem; line-height: 1.5rem;` | Texto normal (16px). | Cualquiera |
| `text-xl` | `font-size: 1.25rem; line-height: 1.75rem;` | Texto grande (20px). La escala sigue: 2xl, 3xl… hasta 9xl. | Cualquiera |
| `text-3xl` | `font-size: 1.875rem; line-height: 2.25rem;` | Tamaño típico de un h1 (30px). | Cualquiera |
| `font-bold` | `font-weight: 700;` | Negrita. También font-medium (500) y font-semibold (600). | Cualquiera |
| `leading-relaxed` | `line-height: 1.625;` | Más aire entre líneas para párrafos largos. | Cualquiera |
| `tracking-wide` | `letter-spacing: .025em;` | Más espacio entre letras. Queda bien en títulos en mayúsculas. | Cualquiera |
| `uppercase` | `text-transform: uppercase;` | Todo en mayúsculas sin cambiar el HTML. | Cualquiera |
| `underline` | `text-decoration-line: underline;` | Subrayado. no-underline lo saca (útil en links). | Cualquiera |
| `truncate` | `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` | Corta el texto en una línea y agrega "…" si no entra. | Cualquiera |
| `line-clamp-2` | `overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;` | Muestra como máximo 2 líneas y corta con "…". Ideal para descripciones de cards. | Cualquiera |

### Color

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `text-slate-700` | `color: var(--color-slate-700);` | Color del texto. Nombre del color + tono de 50 a 950. | Cualquiera |
| `bg-white` | `background-color: #fff;` | Color de fondo. | Cualquiera |
| `bg-blue-600` | `background-color: var(--color-blue-600);` | Fondo con un color de la paleta. | Cualquiera |
| `bg-black/50` | `background-color: /* negro al 50% */;` | La barra / le baja la opacidad solo al color. Típico de un overlay. | Cualquiera |
| `opacity-50` | `opacity: .5;` | Transparenta el elemento entero, con todo lo que tiene adentro. | Cualquiera |

### Bordes

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `border` | `border-width: 1px;` | Borde de 1px. El color se pone aparte. | Cualquiera |
| `border-b` | `border-bottom-width: 1px;` | Borde de un solo lado: border-t, border-r, border-b, border-l. | Cualquiera |
| `border-slate-200` | `border-color: var(--color-slate-200);` | Color del borde. | Cualquiera |
| `rounded-lg` | `border-radius: .5rem;` | Esquinas redondeadas. Escala: rounded-sm, rounded-md, rounded-lg, rounded-xl… | Cualquiera |
| `rounded-full` | `border-radius: /* máximo */;` | Totalmente redondo: círculos (si es cuadrado) o píldoras. | Cualquiera |
| `shadow-md` | `box-shadow: /* sombra media */;` | Sombra. Escala: shadow-sm, shadow, shadow-md, shadow-lg… | Cualquiera |

### Posición

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `relative` | `position: relative;` | Sirve de referencia para los hijos con absolute. | Cualquiera |
| `absolute` | `position: absolute;` | Se ubica respecto del ancestro relative más cercano. Sale del flujo normal. | Cualquiera |
| `fixed` | `position: fixed;` | Queda fijo en la pantalla aunque scrollees. | Cualquiera |
| `sticky top-0` | `position: sticky; top: 0;` | Se pega arriba cuando llegás scrolleando. La navbar pegajosa. | Cualquiera |
| `inset-0` | `inset: 0; /* top, right, bottom, left: 0 */` | Estira un absolute para que cubra todo el padre relative. | Cualquiera |
| `z-10` | `z-index: 10;` | Qué queda arriba cuando dos elementos se superponen. | Cualquiera |

### Overflow

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `overflow-hidden` | `overflow: hidden;` | Recorta lo que se sale. Útil para que una imagen respete el rounded del padre. | Cualquiera |
| `overflow-auto` | `overflow: auto;` | Muestra scroll solo si el contenido no entra. | Cualquiera |
| `overflow-x-auto` | `overflow-x: auto;` | Scroll horizontal solo en ese bloque (tablas en mobile). | Cualquiera |
| `sr-only` | `/* oculto a la vista, visible para lectores de pantalla */` | Texto para accesibilidad: no se ve pero lo lee un lector de pantalla. | Cualquiera |

### Imágenes

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `object-cover` | `object-fit: cover;` | La imagen llena su caja sin deformarse (recorta lo que sobra). | Cualquiera |
| `aspect-video` | `aspect-ratio: 16 / 9;` | Mantiene la proporción 16:9. También aspect-square (1:1). | Cualquiera |

### Interacción

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `cursor-pointer` | `cursor: pointer;` | Muestra la manito al pasar el mouse. | Cualquiera |
| `transition` | `transition-property: color, background-color, opacity, transform…; transition-duration: 150ms;` | Anima suavemente los cambios (por ejemplo, de hover). | Cualquiera |
| `duration-300` | `transition-duration: 300ms;` | Cuánto dura la transición. | Cualquiera |
| `hover:bg-blue-700` | `&:hover { background-color: … }` | Prefijo de estado: la clase aplica solo con el mouse encima. | Cualquiera |
| `focus-visible:outline-2` | `&:focus-visible { outline-width: 2px; }` | Estilo de foco al navegar con teclado. No lo saques: es accesibilidad. | Cualquiera |
| `disabled:opacity-50` | `&:disabled { opacity: .5; }` | Estilo para botones o inputs deshabilitados. | Cualquiera |
| `select-none` | `user-select: none;` | No se puede seleccionar el texto. | Cualquiera |
| `pointer-events-none` | `pointer-events: none;` | El elemento no recibe clicks: pasan al de abajo. | Cualquiera |

### Responsive

| Clase | CSS | Qué hace | Se aplica en |
|---|---|---|---|
| `md:flex` | `@media (width >= 48rem) {   display: flex; }` | Prefijo de breakpoint: aplica desde 768px. sm 640 · md 768 · lg 1024 · xl 1280. | Cualquiera |
| `lg:grid-cols-3` | `@media (width >= 64rem) {   grid-template-columns: …; }` | Cualquier clase se puede combinar con un prefijo. Sin prefijo = mobile. | Cualquiera |
