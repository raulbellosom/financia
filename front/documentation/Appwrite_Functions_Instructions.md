# Appwrite — Instrucciones para Funciones

## Resumen de Funciones

Se han creado los archivos de código fuente en la carpeta `functions/`.

## ¿1 package.json para todas o uno por función?

En Appwrite, **cada Function se despliega y corre por separado**, y normalmente se empaqueta como un “mini-proyecto” con su propio `package.json`.

### Estructura (la que usa este repo)

Cada función vive en su propia carpeta con `src/index.js` y `package.json`:

- `functions/check_alarms/src/index.js`
- `functions/check_alarms/package.json`

- `functions/calculate_investments/src/index.js`
- `functions/calculate_investments/package.json`

- `functions/process_msi/src/index.js`
- `functions/process_msi/package.json`

Ventajas:

- Cada Function puede desplegarse como ZIP/carpeta independiente.
- Dependencias aisladas y más claro en Appwrite Console.

## Cómo subirlas a Appwrite (paso a paso)

Para cada carpeta dentro de `functions/`:

1. En Appwrite Console: **Functions → Create function**
2. **Runtime**: Node.js (recomendado: Node 18+)
3. **Entrypoint**: `src/index.js`
4. **Código**: sube la carpeta de la función como ZIP o selecciona la carpeta al desplegar

- Ejemplos: `functions/check_alarms/`, `functions/calculate_investments/`, `functions/process_msi/`

5. Configura las **Variables de entorno** (sección de abajo)
6. Configura los **Triggers**:

- CRON para `check_alarms`, `calculate_investments`, `process_msi`

## Variables de entorno (Appwrite Console)

Estas functions usan **Appwrite REST API** con `axios` (sin SDK). En Appwrite, varias variables vienen “pre-cargadas” (por ejemplo `APPWRITE_FUNCTION_PROJECT_ID` y `APPWRITE_FUNCTION_API_ENDPOINT`), pero **aquí sí necesitas definir algunas a mano**.

### Requeridas (todas las functions)

- `APPWRITE_API_KEY`
  - API Key del proyecto con permisos para:
    - `databases.read` / `databases.write`
    - y si usas push (check_alarms): `messaging.write`
- `DATABASE_ID`
  - El ID de la database donde están tus colecciones (no el nombre).

### Recomendadas

- `APPWRITE_ENDPOINT`
  - Tu endpoint Appwrite.
  - Para tu caso: `https://appwrite.racoondevs.com/v1`
  - Si no la pones, se usa `APPWRITE_FUNCTION_API_ENDPOINT` (si Appwrite la expone) o fallback a `https://cloud.appwrite.io/v1`.

> Nota: el **Project ID** lo toma de `APPWRITE_FUNCTION_PROJECT_ID` (inyectada por Appwrite). Sólo si lo ejecutas fuera de Appwrite (local) deberías setear `APPWRITE_PROJECT_ID`.

### Headers que usan internamente

Las llamadas REST se autentican con:

- `X-Appwrite-Project`: `APPWRITE_FUNCTION_PROJECT_ID` (o `APPWRITE_PROJECT_ID` si corres local)
- `X-Appwrite-Key`: `APPWRITE_API_KEY`

Y se llaman sobre el base URL:

- `${APPWRITE_ENDPOINT}` (o `APPWRITE_FUNCTION_API_ENDPOINT`)

### Opcionales (si tus IDs de colecciones NO son literalmente estos strings)

- `ACCOUNTS_COLLECTION_ID` (default: `accounts`)
- `TRANSACTIONS_COLLECTION_ID` (default: `transactions`)
- `ALARMS_COLLECTION_ID` (default: `alarms`)

Si en Appwrite creaste las colecciones con IDs distintos, define estas variables.

## Variables por function

- `calculate_investments` (functions/calculate_investments/src/index.js)

  - Requiere: `APPWRITE_API_KEY`, `DATABASE_ID`
  - Opcional: `ACCOUNTS_COLLECTION_ID`, `TRANSACTIONS_COLLECTION_ID`

- `process_msi` (functions/process_msi/src/index.js)

  - Requiere: `APPWRITE_API_KEY`, `DATABASE_ID`
  - Opcional: `TRANSACTIONS_COLLECTION_ID`

- `check_alarms` (functions/check_alarms/src/index.js)
  - Requiere: `APPWRITE_API_KEY`, `DATABASE_ID`
  - Opcional: `ALARMS_COLLECTION_ID`
  - Si se usa push: requiere además permisos de Messaging en el API Key

## Endpoints REST utilizados (para troubleshooting)

- Databases (listar docs): `GET /databases/{databaseId}/collections/{collectionId}/documents?queries[]=...`
- Databases (crear doc): `POST /databases/{databaseId}/collections/{collectionId}/documents` con `{ documentId: "unique()", data: {...} }`
- Databases (actualizar doc): `PATCH /databases/{databaseId}/collections/{collectionId}/documents/{documentId}` con `{ data: {...} }`
- Messaging (push): `POST /messaging/messages/push` con `{ messageId: "unique()", title, body, topics, users }`

1. **`calculate_investments.js`**

   - **Propósito**: Calcular rendimientos diarios de cuentas de inversión.
   - **Trigger**: Cron (e.g. `0 1 * * *` - Diario 1 AM).
   - **Lógica**: Itera cuentas `investment`, calcula rendimiento según `yieldRate`/`yieldFrequency` y crea transacción de ingreso (`origin: yield`).

2. **`process_msi.js`**

   - **Propósito**: Generar el cobro mensual (gasto) de los planes a Meses sin Intereses.
   - **Trigger**: Cron (e.g. `0 2 * * *` - Diario 2 AM).
   - **Lógica**: Busca transacciones con `installments > 1`, verifica si hoy toca pago mensual, crea transacción hija y actualiza `installmentsPaid`.

3. **`check_alarms.js`**

   - **Propósito**: Enviar notificaciones push para alarmas vencidas.
   - **Trigger**: Cron frecuente (e.g. `*/5 * * * *` - Cada 5 min).
   - **Lógica**: Busca alarmas `pending` con `dueDate <= now`, envía Push (Appwrite Messaging) y marca como `fired`.

4. **Sync Email (Auth -> Users Info)**
   - **Propósito**: Mantener email sincronizado.
   - **Trigger**: Evento `users.*.update.email`.
   - **Lógica**:
     ```javascript
     module.exports = async function (context) {
       // ... (ver implementación en Appwrite Function Console)
       // Buscar users_info por authUserId y actualizar email + verified_email
     };
     ```
