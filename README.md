# Ensayo de Obras

Aplicación interna para cargar guiones de teatro y repasarlos desde el celular.

## Qué incluye

- Frente público de solo lectura.
- Panel oculto en `/tramoya`.
- Login hardcodeado:
  - Usuario: `admin`
  - Contraseña: `12345678`
- Editor Markdown con soporte para imágenes y audio.
- Actores por obra.
- Asignación de fragmentos del texto a uno o varios actores.
- Opción de publicar, ocultar y marcar una única `obra activa`.
- Selección pública de actor con persistencia en `localStorage`.
- Persistencia real preparada para Cloudflare D1.
- Archivos multimedia persistentes preparados para Cloudflare R2.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```bash
CLOUDFLARE_ACCOUNT_ID=""
CLOUDFLARE_D1_DATABASE_ID=""
CLOUDFLARE_D1_API_TOKEN=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_BASE_URL=""
# Optional. If omitted, the app uses https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ENDPOINT=""
```

## Desarrollo

1. Instala dependencias:

```bash
bun install
```

2. Crea las tablas en D1:

```bash
bun run db:init
```

3. Levanta el proyecto:

```bash
bun dev
```

## Despliegue

- La app está lista para desplegar en Vercel.
- El contenido editorial vive en Cloudflare D1 vía API segura.
- Imágenes y audios se guardan en Cloudflare R2.

## R2 público

`R2_PUBLIC_BASE_URL` debe apuntar al dominio público desde el que servirás los archivos del bucket.

Ejemplos:

- `https://pub-xxxx.r2.dev`
- `https://media.tudominio.com`

## Nota operativa

Cloudflare recomienda acceder a D1 desde fuera de Workers mediante un proxy Worker propio para tráfico alto. Esta implementación habla con la API HTTPS de D1 directamente desde el servidor de Next, lo cual simplifica la puesta en marcha y funciona bien para una app interna de bajo volumen.
