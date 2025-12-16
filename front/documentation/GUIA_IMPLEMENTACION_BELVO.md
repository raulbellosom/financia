# Guía de Implementación Paso a Paso: Integración Belvo + Appwrite

Esta guía explica qué son los archivos generados, por qué están organizados así y cómo configurar todo paso a paso para que funcione.

## 1. Entendiendo la Arquitectura (¿Por qué `functions` fuera de `front`?)

Actualmente tienes dos carpetas principales:

1.  **`front/`**: Es tu aplicación web (React). Este código se descarga y ejecuta en el navegador de tus usuarios.

    - ⚠️ **Importante**: Todo lo que está aquí es público. **NUNCA** debes guardar contraseñas bancarias o API Keys secretas (como el `SECRET_PASSWORD` de Belvo) aquí, porque cualquier usuario con conocimientos técnicos podría robarlas.

2.  **`functions/`**: Es tu "Backend" seguro (Appwrite Functions).
    - Son pequeños programas que se ejecutan en el servidor de Appwrite, no en el navegador del usuario.
    - Aquí es donde guardaremos tus secretos de Belvo (`SECRET_ID`, `SECRET_PASSWORD`).
    - El `front` le pide a la `function` que hable con Belvo, y la `function` devuelve solo el resultado seguro.

---

## 2. Requisitos Previos

1.  Tener tu proyecto de **Appwrite** funcionando.
2.  Tener tus credenciales de **Belvo Sandbox** (`Secret ID` y `Secret Password`).
3.  Generar una **API Key de Appwrite**:
    - Ve a tu consola de Appwrite > Overview > API Keys > "Create API Key".
    - Nombre: "Belvo Integration".
    - Scopes (Permisos): Selecciona `users.read`, `documents.read`, `documents.write`, `execution.read`, `execution.write`.
    - Guarda el "API Secret" que te genera (ej: `98234...`).

---

## 3. Paso a Paso: Desplegar las Funciones

Tienes 3 carpetas dentro de `functions/`. Debes crear una "Function" en Appwrite para cada una.

### Función A: `belvo-auth`

_Sirve para: Crear un token seguro para que el widget de bancos se abra en el frontend._

1.  **En Appwrite Console**: Ve a "Functions" > "Create Function".
2.  **Nombre**: `belvo-auth`.
3.  **Runtime**: Node.js (versión 16.0 o superior).
4.  **Subir Código**:
    - Entra a la carpeta `d:\RacoonDevs\financia\functions\belvo-auth` en tu computadora.
    - Selecciona los archivos `package.json` y la carpeta `src`.
    - **IMPORTANTE**: No comprimas la carpeta `belvo-auth`. Entra en ella, selecciona los archivos dentro y comprímelos.
    - Comprímelos en un archivo `.tar.gz` (o `.zip`).
    - Sube ese archivo en el paso de "Source Code".
    - En "Entrypoint", escribe: `src/main.js`.
    - **Build Settings**: Déjalo vacío o por defecto. Appwrite instalará las dependencias automáticamente al detectar el `package.json`.
5.  **Variables de Entorno (Settings > Environment Variables)**:
    Agrega estas variables:
    - `BELVO_SECRET_ID`: _(Tu Secret ID de Belvo)_
    - `BELVO_SECRET_PASSWORD`: _(Tu Password de Belvo)_
    - `BELVO_ENV`: `sandbox`
    - `APPWRITE_ENDPOINT`: `https://appwrite.racoondevs.com/v1` (Tu endpoint self-hosted).
    - `APPWRITE_PROJECT_ID`: _(Tu Project ID de Appwrite)_
    - `APPWRITE_API_KEY`: _(La API Key que creaste en el paso 2)_
    - `APPWRITE_SELF_SIGNED`: `true` (Si usas certificados autofirmados o tienes problemas de SSL).
6.  **Permisos (Settings > Execute Access)**:
    - Añade el rol `users` (para que cualquier usuario logueado pueda ejecutarla).
7.  **Obtener ID**:
    - Copia el **Function ID** (ej: `6578a...`).
    - Ve a tu archivo `front/.env` y pégalo en: `VITE_APPWRITE_BELVO_AUTH_FUNCTION_ID=tu_id_aqui`. \* **Nota sobre el Dominio**: Verás un dominio como `xxxx.functions.localhost`. **No te preocupes**, para esta función (`belvo-auth`) NO usaremos ese dominio. Nuestra App (Frontend) se comunicará con ella internamente usando el SDK de Appwrite, así que funcionará perfecto aunque diga localhost.

---

### Función B: `belvo-exchange`

_Sirve para: Guardar la conexión bancaria en tu base de datos cuando el usuario termina el proceso._

1.  **En Appwrite Console**: Crea otra función llamada `belvo-exchange`.
2.  **Runtime**: Node.js.
3.  **Subir Código**: Comprime y sube el contenido de `functions/belvo-exchange`.
4.  **Entrypoint**: `src/main.js`.
5.  **Variables de Entorno**:
    - Copia **EXACTAMENTE LAS MISMAS** variables que en la función anterior.
    - Agrega una extra: `DATABASE_ID`: _(El ID de tu base de datos en Appwrite)_.
6.  **Permisos**: Añade el rol `users`.
7.  **Obtener ID**:
    - Copia el **Function ID**.
    - Pégalo en `front/.env` en: `VITE_APPWRITE_BELVO_EXCHANGE_FUNCTION_ID=tu_id_aqui`.

---

### Función C: `belvo-webhook-handler`

_Sirve para: Que Belvo nos avise cuando haya nuevas transacciones automáticamente._

1.  **En Appwrite Console**: Crea función `belvo-webhook-handler`.
2.  **Runtime**: Node.js.
3.  **Subir Código**: Comprime y sube el contenido de `functions/belvo-webhook-handler`.
4.  **Entrypoint**: `src/main.js`.
5.  **Variables de Entorno**: Las mismas que `belvo-exchange` (incluyendo `DATABASE_ID`).
6.  **Permisos**: Añade el rol `any` (Público).
    - _¿Por qué público?_ Porque Belvo necesita llamar a esta URL desde fuera sin estar logueado como usuario. Nosotros validamos la seguridad internamente (o mediante secretos en la URL si quisieras más seguridad, pero por ahora está bien).
7.  **IMPORTANTE (Self-hosted + Belvo): por qué NO funciona directo** - La API de Appwrite para ejecutar Functions (`/v1/functions/<id>/executions`) requiere identificar el Project. - Normalmente se manda con el header `X-Appwrite-Project: <PROJECT_ID>`. - Belvo NO permite enviar headers arbitrarios (solo URL + Authorization opcional), por eso aparece el error: - `No Appwrite project was specified`.
8.  **Solución recomendada: Subdominio + Reverse Proxy (inyectar headers)** - Vamos a crear un endpoint público que Belvo pueda llamar (sin headers especiales) y que tu servidor reenvíe a Appwrite agregando `X-Appwrite-Project` (y opcionalmente `X-Appwrite-Key`). - Recomendación de dominio: `hooks.racoondevs.com` (evita dominios de 3+ niveles tipo `webhook.appwrite.racoondevs.com` por temas de SSL/wildcards).

---

## 3.1 Webhooks en Self-hosted Appwrite (Belvo) — Paso a paso

Esta sección aplica si Appwrite está self-hosted y Belvo te da `401` por falta de Project.

### A) Crear DNS en IONOS (hooks.racoondevs.com)

Opción recomendada (A record):

1. Entra a IONOS > **Domains & SSL** > selecciona `racoondevs.com`.
2. Ve a **DNS** (o “DNS settings”).
3. Agrega un registro **A**:
   - Host/Nombre: `hooks`
   - Valor/Destino: la IP pública de tu servidor (donde corre Appwrite / tu proxy)
   - TTL: el default

Alternativa (CNAME):

- Crea un **CNAME** `hooks` apuntando a `appwrite.racoondevs.com`.
- Úsalo solo si tu infraestructura ya resuelve y termina SSL correctamente en `appwrite.racoondevs.com`.

### B) SSL para hooks.racoondevs.com

Tienes 2 caminos válidos:

- **Certificado dedicado** para `hooks.racoondevs.com` (Let’s Encrypt).
- **Wildcard** `*.racoondevs.com` (si ya lo usas en producción).

### C) Crear endpoint público /belvo y reenviar a Appwrite

Belvo llamará a:

- `https://hooks.racoondevs.com/belvo`

Tu reverse proxy reenviará a:

- `https://appwrite.racoondevs.com/v1/functions/<BELVO_WEBHOOK_FUNCTION_ID>/executions`

Y debe inyectar headers:

- `X-Appwrite-Project: <APPWRITE_PROJECT_ID>`
- `X-Appwrite-Key: <APPWRITE_API_KEY>` (recomendado para estabilidad; usa una API Key con `execution.write` y los scopes de DB necesarios)

#### Nginx (única opción recomendada)

Ejemplo listo para copiar/pegar (recomendado):

1. Crea un archivo de Nginx (ruta típica):

- `/etc/nginx/sites-available/hooks.racoondevs.com.conf`

2. Pega esto (cambia los placeholders `<>`):

```
# hooks.racoondevs.com

# (Opcional pero recomendado) Permite a Certbot validar y fuerza HTTPS
server {
    listen 80;
    server_name hooks.racoondevs.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name hooks.racoondevs.com;

    # SSL (Let’s Encrypt o wildcard)
    # Wildcard (ejemplo, ajusta a tus rutas reales):
    # ssl_certificate     /etc/ssl/<TU_CERTS_DIR>/wildcard_racoondevs_com_fullchain.pem;
    # ssl_certificate_key /etc/ssl/<TU_CERTS_DIR>/wildcard_racoondevs_com_private_key.key;
    #
    # Let’s Encrypt (ejemplo, por si en el futuro cambias a cert dedicado):
    # ssl_certificate     /etc/letsencrypt/live/hooks.racoondevs.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/hooks.racoondevs.com/privkey.pem;

    # Tamaño y timeouts razonables para webhooks
    client_max_body_size 2m;

    # Usamos ^~ para que funcione tanto /belvo como /belvo/<TOKEN> (si luego agregas secreto en la URL)
    location ^~ /belvo {
        # Belvo normalmente envía POST
        # Nota: `return` NO está permitido dentro de `limit_except` en Nginx.
        # Por eso validamos el método así:
        if ($request_method != POST) { return 405; }

        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_read_timeout 120s;

        # Forward a Appwrite Functions Executions
        proxy_pass https://appwrite.racoondevs.com/v1/functions/<BELVO_WEBHOOK_FUNCTION_ID>/executions;

        # Headers obligatorios para Appwrite
        proxy_set_header Host appwrite.racoondevs.com;
        proxy_set_header X-Appwrite-Project <APPWRITE_PROJECT_ID>;
        proxy_set_header X-Appwrite-Key <APPWRITE_API_KEY>;

        # Mantener el body y los headers originales del webhook
        proxy_pass_request_body on;
        # Si quieres forzar Content-Type, usa el header entrante real:
        proxy_set_header Content-Type $http_content_type;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;

        # (Opcional) Si Appwrite usa certificado no confiable/self-signed
        # proxy_ssl_verify off;
    }
}
```

3. Habilita el sitio y recarga Nginx:

- `sudo ln -s /etc/nginx/sites-available/hooks.racoondevs.com.conf /etc/nginx/sites-enabled/hooks.racoondevs.com.conf`
- `sudo nginx -t && sudo systemctl reload nginx`

4. SSL con Let’s Encrypt (si no tienes wildcard):

- `sudo mkdir -p /var/www/certbot`
- `sudo certbot certonly --webroot -w /var/www/certbot -d hooks.racoondevs.com`

Luego descomenta `ssl_certificate`/`ssl_certificate_key` y recarga Nginx.

### D) Configurar webhook en Belvo

### D0) Checklist rápido (antes de tocar Belvo)

En tu servidor (Linux), valida:

1. DNS resuelve:
   - `dig +short hooks.racoondevs.com` debe devolver tu IP (ej: `66.175.239.181`).
2. HTTPS responde:
   - `curl -I https://hooks.racoondevs.com/belvo` debe responder (probablemente `405` si no es POST; está bien).
3. POST llega y Appwrite contesta:

   - `curl -sS -X POST https://hooks.racoondevs.com/belvo -H "Content-Type: application/json" -d '{"test":true}' | head`
   - Si Appwrite responde con un error de “Function not found” o similar, revisa el `<BELVO_WEBHOOK_FUNCTION_ID>`.
   - Si responde “No Appwrite project was specified”, revisa que estés inyectando `X-Appwrite-Project`.

#### Troubleshooting rápido (errores típicos)

- **Te responde Appwrite `project_not_found` (404)**

  - Ejemplo: `Project with the requested ID could not be found...`
  - Significa: **sí estás llegando a Appwrite**, pero el valor que Appwrite recibió en `X-Appwrite-Project` **no corresponde a ningún Project en esa instancia**.
  - Casi siempre pasa por una de estas razones:
    1.  Dejaste un placeholder (por ejemplo `<APPWRITE_PROJECT_ID>`) en el config de Nginx.
    2.  Estás enviando el Project ID de otro Appwrite (o estás proxyeando a un Appwrite distinto al que crees).

  Pasos para arreglarlo:

  1. En tu Nginx (hooks), revisa el archivo del sitio y asegúrate de tener valores reales:
     - `proxy_set_header X-Appwrite-Project 6928fb370000d34abbee;`
     - `proxy_set_header X-Appwrite-Key <TU_API_KEY_REAL>;`
  2. Confirma que Nginx cargó ese config (muy útil para detectar que recargaste el archivo correcto):
     - `sudo nginx -T | grep -n "X-Appwrite-Project"`
  3. Recarga:
     - `sudo nginx -t && sudo systemctl reload nginx`

4. Belvo Dashboard (Sandbox/Prod) > **Developer Tools** > **Webhooks**.
5. Pega la URL:
   - `https://hooks.racoondevs.com/belvo`
6. Deja **Authorization** vacío (no es necesario con el proxy; si luego agregamos un secreto, se documenta aparte).
7. Selecciona los eventos que necesitas (según producto): por ejemplo `TRANSACTIONS_NEW`, `SYNCHRONIZATION_FINISHED`.

### E) Seguridad mínima recomendada (rápida)

Como `/belvo` quedará público:

- Agrega un secreto en la ruta: `https://hooks.racoondevs.com/belvo/<TOKEN>` y valida ese token en el proxy (o en un forwarder).
- Alternativa: valida firma si Belvo la provee (depende del producto/evento).

---

## 4. Actualizar Base de Datos (Appwrite Database)

Para que las funciones no fallen, necesitas crear los campos en la base de datos.

1.  Ve a Appwrite Console > Databases > Tu Base de Datos.
2.  **Crear Colección**: `belvo_links`

    - Permisos: Document Security habilitado.
    - Atributos:
      - `profile` (Relationship: Many-to-One con `users_info`).
      - `belvoId` (String, 36 chars, required).
      - `institution` (String, 100 chars, required).
      - `status` (Enum: `valid`, `invalid`, `unconfirmed`, `token_required`).
      - `accessMode` (Enum: `recurrent`, `single`).
      - `lastSync` (Datetime).
      - `externalId` (String).
    - Índices:
      - Key: `belvoId_unique`, Type: Unique, Attribute: `belvoId`.

3.  **Actualizar Colección**: `accounts`

    - Agrega atributo: `belvoId` (String, 36 chars).
    - Agrega atributo: `link` (Relationship: Many-to-One con `belvo_links`).
    - Agrega atributo: `lastSync` (Datetime).
    - Agrega atributo: `balanceType` (Enum: `current`, `available`).

4.  **Actualizar Colección**: `transactions`
    - Agrega atributo: `belvoId` (String, 36 chars).
    - Agrega atributo: `merchantName` (String).
    - Agrega atributo: `merchantLogo` (Url).
    - Agrega atributo: `belvoCategory` (String).
    - Agrega atributo: `status` (Enum: `PENDING`, `PROCESSED`, `UNCATEGORIZED`).
    - Actualiza el Enum `origin` para incluir `belvo` (si Appwrite no deja editar enums, tendrás que recrearlo o manejarlo con cuidado).

---

## 5. Resumen Final

1.  Las carpetas `functions/` son tu servidor seguro.
2.  Debes subirlas a Appwrite manualmente (zip) o por CLI.
3.  Las credenciales de Belvo (`SECRET_ID`, `PASSWORD`) van en las "Environment Variables" de Appwrite, **NO** en el código.
4.  Los IDs de las funciones (`657...`) van en el archivo `.env` de `front/` para que la app sepa a quién llamar.

**Nota para Webhooks (Self-hosted):**

- Si Belvo te devuelve `No Appwrite project was specified`, necesitas un endpoint público (`hooks.racoondevs.com`) que reenvíe a Appwrite e inyecte `X-Appwrite-Project`.

¡Con esto tu aplicación podrá abrir el widget bancario, conectar cuentas y recibir transacciones!
