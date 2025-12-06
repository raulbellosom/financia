# Financia — App de finanzas personales multiusuario (Appwrite)

Documento de alto nivel + diseño técnico inicial para que cualquier asistente/IA (y nosotros 💚) entienda el proyecto y pueda seguir construyendo.

Esta versión está pensada para **Appwrite self-hosted**, NO Supabase.

---

## 1. Contexto general del proyecto

- Proyecto: **Financia**
- Tipo: **app de finanzas personales** multiusuario
- Backend principal: **Appwrite** self-hosted

### 1.1 Objetivo funcional

Cada usuario podrá:

- Crear y gestionar sus **cuentas** (bancos, tarjetas, efectivo, wallets, etc.).
- Registrar **ingresos**, **gastos** y, más adelante, **movimientos recurrentes** (suscripciones, pagos fijos).
- Ver **saldos**, **historial de movimientos** y **resúmenes por categoría/periodo**.
- (Fase posterior) Tomar foto a **tickets/notas** y que el sistema:
  - Reconozca el texto (OCR).
  - Proponga automáticamente una **transacción borrador** que el usuario pueda confirmar o ajustar.

### 1.2 Requisitos clave

1. **Privacidad fuerte**
   - Cada usuario sólo ve/edita **sus propios datos**.
   - No habrá “admin que ve todos los movimientos de todos” en la primera versión.

2. **Multi-dispositivo e híbrida**
   - Web responsiva.
   - Capaz de compilarse como:
     - **PWA** instalable.
     - **APK** usando Capacitor/Ionic sobre el mismo frontend React.

3. **Escalabilidad por fases**
   - Fase 1: CRUD sólido de cuentas, categorías y transacciones.
   - Fases posteriores: recurrencias, presupuestos, OCR, reportes avanzados, IA, etc.

---

## 2. Stack tecnológico

### 2.1 Backend — Appwrite

- Endpoint: `https://appwrite.racoondevs.com/v1`
- Project ID: `6928fb370000d34abbee`
- Database: `financia_dev` (`id: 6928ffe600036dff06be`)

Servicios Appwrite usados:

- **Auth**: usuarios, sesiones, recuperación de password.
- **Database**: colecciones/atributos con permisos por documento.
- **Storage**: archivos (avatares, fotos de tickets).
- **Functions**: lógica backend (Node/Deno/etc.).
- **Webhooks**: sólo si queremos hablar con servicios externos (OCR, workers).

### 2.2 Frontend

- **ReactJS** + **Vite**
- **TailwindCSS v4**
- **Lucide Icons**
- **Axios**
- **react-hot-toast**
- Pensada desde el inicio como **mobile-first** para envolverse luego con **Capacitor** o **Ionic**.

---

## 3. Modelo de datos — colecciones principales

En Appwrite Database:

1. `users_info` — perfil extendido de cada usuario de Auth.
2. `accounts` — cuentas financieras.
3. `categories` — categorías de ingresos/gastos/transferencias.
4. `transactions` — movimientos de dinero.
5. `recurring_rules` — reglas de recurrencia (suscripciones, pagos fijos).
6. `receipts` — tickets/notas subidos para OCR.

> NOTA: Appwrite ya agrega campos de sistema (`$id`, `$createdAt`, `$updatedAt`, etc.). **NO** los definimos como atributos manuales.

---

## 4. Definición de colecciones, atributos, relaciones e índices

### 4.1 `users_info` (perfil)

Perfil extendido de cada usuario de Auth.

#### Atributos

- `authUserId` — **String**, required, `maxLength: 36`  
  ID del usuario en Auth (`user.$id`). Se llena desde una Function en `users.create`.
- `username` — **String**, optional, `maxLength: 32`
- `firstName` — **String**, optional, `maxLength: 80`
- `lastName` — **String**, optional, `maxLength: 80`
- `country` — **String**, optional, `maxLength: 2` (ISO-2, ej. `MX`)
- `defaultCurrency` — **String**, required, `maxLength: 3`, default `MXN`
- `language` — **String**, required, `maxLength: 5`, default `es-MX`
- `timezone` — **String**, optional, `maxLength: 64`
- `avatarFileId` — **String**, optional, ID de archivo en Storage (bucket avatares)
- `onboardingDone` — **Boolean**, required, default `false`
- `role` — **Enum**, required, valores: `user`, `admin`, default `user`

#### Índices

1. `IDX_users_info_authUserId_unique`
   - Tipo: **unique**
   - Atributos: `[authUserId]`

2. `IDX_users_info_username_unique` (opcional)
   - Tipo: **unique**
   - Atributos: `[username]`

3. `IDX_users_info_role`
   - Tipo: **key**
   - Atributos: `[role]`

#### Borrado

- Cuando se borre un usuario en Auth, una Function borra **físicamente** su `users_info`.

---

### 4.2 `accounts` (cuentas)

Una cuenta pertenece a un perfil (`users_info`).

#### Atributos

- `profile` — **Relationship**, required  
  - Modal: *Create relationship attribute* → **One-way relationship**  
  - Related collection: `users_info`  
  - Many-to-one: muchas cuentas → un perfil. NO crear atributo inverso.
- `name` — **String**, required, `maxLength: 80`
- `type` — **Enum**, required, valores: `cash`, `debit`, `credit`, `savings`, `wallet`, `other`
- `institution` — **String**, optional, `maxLength: 80`
- `currency` — **String**, required, `maxLength: 3`
- `initialBalance` — **Float**, required, default `0`
- `currentBalance` — **Float**, required, default `0`
- `color` — **String**, optional, `maxLength: 9` (`#RRGGBB`/`#RRGGBBAA`)
- `icon` — **String**, optional, `maxLength: 40`
- `isArchived` — **Boolean**, required, default `false`
- `sortOrder` — **Integer**, optional, default `0`

#### Índices

1. `IDX_accounts_profile`
   - Tipo: **key**
   - Atributos: `[profile]`

2. `IDX_accounts_profile_isArchived`
   - Tipo: **key**
   - Atributos: `[profile, isArchived]`

3. `IDX_accounts_profile_name_unique` (opcional)
   - Tipo: **unique**
   - Atributos: `[profile, name]`

#### Borrado

- **Lógico** mediante `isArchived = true`.

---

### 4.3 `categories` (categorías)

Categorías de movimientos; pueden ser globales o por usuario.

#### Atributos

- `profile` — **Relationship**, optional  
  - One-way → `users_info`. Si está vacío, la categoría es **global**.
- `name` — **String**, required, `maxLength: 60`
- `type` — **Enum**, required, valores: `income`, `expense`, `transfer`
- `color` — **String**, optional, hex
- `icon` — **String**, optional, `maxLength: 40`
- `isDefault` — **Boolean**, required, default `false`
- `isEnabled` — **Boolean**, required, default `true`
- `sortOrder` — **Integer**, optional, default `0`

#### Índices

1. `IDX_categories_profile_type_enabled`
   - Tipo: **key**
   - Atributos: `[profile, type, isEnabled]`

2. `IDX_categories_global_defaults`
   - Tipo: **key**
   - Atributos: `[profile, isDefault]` (las globales tendrán `profile = null`)

3. `IDX_categories_profile_name_unique` (opcional)
   - Tipo: **unique**
   - Atributos: `[profile, name, type]`

#### Borrado

- **Lógico** vía `isEnabled = false`.

---

### 4.4 `transactions` (movimientos)

Colección central. Cada documento representa un movimiento de dinero.

#### Atributos

- `profile` — **Relationship**, required  
  - One-way → `users_info` (dueño de la transacción).
- `account` — **Relationship**, required  
  - One-way → `accounts`.
- `category` — **Relationship**, optional  
  - One-way → `categories`.
- `receipt` — **Relationship**, optional  
  - One-way → `receipts` (ticket asociado).
- `type` — **Enum**, required, valores: `income`, `expense`, `transfer`
- `amount` — **Float**, required  
  - Negocio: siempre positivo, el signo se interpreta por `type`.
- `currency` — **String**, optional, `maxLength: 3` (default: moneda de la cuenta)
- `date` — **Datetime**, required
- `description` — **String**, optional, `maxLength: 255`
- `notes` — **String**, optional (para texto más largo)
- `isPending` — **Boolean**, required, default `false`
- `isTransferLeg` — **Boolean**, required, default `false`
- `isDeleted` — **Boolean**, required, default `false` (borrado lógico)

#### Índices

1. `IDX_tx_profile_date`
   - Tipo: **key**
   - Atributos: `[profile, date]`

2. `IDX_tx_profile_account_date`
   - Tipo: **key**
   - Atributos: `[profile, account, date]`

3. `IDX_tx_profile_category_date`
   - Tipo: **key**
   - Atributos: `[profile, category, date]`

4. `IDX_tx_profile_type_date`
   - Tipo: **key**
   - Atributos: `[profile, type, date]`

5. `IDX_tx_receipt`
   - Tipo: **key**
   - Atributos: `[receipt]`

6. `IDX_tx_relatedTransaction`
   - Tipo: **key**
   - Atributos: `[relatedTransaction]`

#### Borrado

- **Lógico** con `isDeleted = true`.  
- Consultas normales siempre filtran `isDeleted = false` desde frontend/SDK.

---

### 4.5 `recurring_rules` (reglas de recurrencia)

Para suscripciones, pagos fijos, etc.

#### Atributos

- `profile` — **Relationship**, required  
  - One-way → `users_info`.
- `account` — **Relationship**, required  
  - One-way → `accounts`.
- `category` — **Relationship**, optional  
  - One-way → `categories`.
- `type` — **Enum**, required, valores: `income`, `expense`
- `amount` — **Float**, required
- `currency` — **String**, optional, `maxLength: 3`
- `frequency` — **Enum**, required  
  - `daily`, `weekly`, `monthly`, `yearly`, `custom`
- `interval` — **Integer**, optional, default `1`
- `startDate` — **Datetime**, required
- `endDate` — **Datetime**, optional
- `nextRun` — **Datetime**, required
- `description` — **String**, optional, `maxLength: 255`
- `isActive` — **Boolean**, required, default `true`

#### Índices

1. `IDX_rr_profile_nextRun_active`
   - Tipo: **key**
   - Atributos: `[profile, isActive, nextRun]`

2. `IDX_rr_account`
   - Tipo: **key**
   - Atributos: `[account]`

#### Borrado

- Normalmente solo **desactivamos** reglas con `isActive = false`.
- Se puede borrar físicamente si hace falta limpieza dura.

---

### 4.6 `receipts` (tickets / notas)

Metadatos de los tickets subidos para OCR.

#### Atributos

- `profile` — **Relationship**, required  
  - One-way → `users_info`.
- `fileId` — **String**, required  
  - ID del archivo en Storage (bucket `receipts`).
- `status` — **Enum**, required  
  - valores: `uploaded`, `processing`, `processed`, `failed`  
  - default: `uploaded`
- `ocrText` — **String**, optional  
  - texto plano extraído.
- `detectedAmount` — **Float**, optional
- `detectedDate` — **Datetime**, optional
- `transaction` — **Relationship**, optional  
  - One-way → `transactions` (movimiento creado/ligado a este ticket).
- `isDeleted` — **Boolean**, optional, default `false` (si queremos borrado lógico).

> Además, en `transactions` existe un campo `receipt` (Relationship one-way) que apunta de vuelta a `receipts`. Es una relación “bidireccional” pero construida con **dos relaciones one-way**, no con `Two-way` automático.

#### Índices

1. `IDX_receipts_profile_status`
   - Tipo: **key**
   - Atributos: `[profile, status]`

2. `IDX_receipts_profile_transaction`
   - Tipo: **key**
   - Atributos: `[profile, transaction]`

3. `IDX_receipts_profile_isDeleted` (si usamos borrado lógico)
   - Tipo: **key**
   - Atributos: `[profile, isDeleted]`

#### Borrado

- Uso normal: **lógico** con `isDeleted = true`.
- Borrado definitivo: Function que borra documento + archivo de Storage (`fileId`).

---

## 5. Seguridad y permisos (visión general)

Principio: cada documento financiero pertenece a un **profile (`users_info`)** y solo puede ser leído/editado por ese usuario.

Al crear documentos en `accounts`, `categories`, `transactions`, `recurring_rules`, `receipts`, se asignan permisos:

- `read`: `user:{authUserId}`
- `write`: `user:{authUserId}`

Las categorías globales (con `profile = null`) se crean con:

- `read`: `role:all`
- `write`: sólo para un usuario de servicio o admin específico.

---

## 6. Functions y webhooks en Appwrite (plan)

### 6.1 Function: `createUserInfoOnAuthCreate`

- Trigger: **Event** → `users.create`
- Acción:
  - Leer `event.user.$id`, `event.user.name`, `event.user.email`.
  - Crear documento en `users_info` con:
    - `authUserId = user.$id`
    - `defaultCurrency = 'MXN'`
    - `language = 'es-MX'`
    - `onboardingDone = false`
    - `role = 'user'`

### 6.2 Function: `processReceiptOnUpload`

- Trigger: **Event** → `storage.files.create` (bucket `receipts`)
- Flujo:
  1. Crear documento en `receipts` con `status = 'uploaded'` y `fileId = file.$id`.
  2. Cambiar `status` a `processing` y mandar el archivo a un servicio de OCR:
     - O bien una Function interna.
     - O bien un microservicio externo vía **webhook**.
  3. Guardar `ocrText`, `detectedAmount`, `detectedDate` y `status = 'processed'`.
  4. Opcional: crear una `transaction` borrador ligada al `receipt`.

### 6.3 Function: `runRecurringRules` (cron)

- Trigger: **Schedule** (ej. cada 5–15 minutos).
- Flujo:
  - Buscar en `recurring_rules` reglas con `isActive = true` y `nextRun <= now()`.
  - Para cada regla:
    - Crear `transaction` correspondiente.
    - Actualizar `nextRun` sumando el intervalo según `frequency`/`interval`.

---

## 7. Frontend — módulos y vistas (resumen)

1. **Auth + Onboarding**
   - Login/registro con Appwrite SDK.
   - Wizard inicial: completar perfil (`users_info`) y crear primera cuenta.

2. **Dashboard**
   - Resumen de saldos, últimos movimientos, gráfico simple.

3. **Cuentas**
   - Listado + CRUD, detalle de cuenta con movimientos filtrados.

4. **Transacciones**
   - Lista/timeline con filtros por fecha, cuenta, categoría, tipo.
   - Form para crear/editar transacciones (+ opción de vincular ticket).

5. **Categorías**
   - CRUD de categorías de usuario + uso de globales.

6. **Recurrencias**
   - CRUD de `recurring_rules`, vista tipo “suscripciones/pagos fijos”.

7. **Tickets/OCR**
   - Subir foto desde cámara/galería (Capacitor).
   - Ver estado de procesamiento + crear movimiento desde ticket.

8. **Perfil/Configuración**
   - Editar datos de `users_info`, moneda, idioma, avatar, etc.

---

## 8. Roadmap rápido

- **Fase 0**: Crear colecciones y atributos según este documento. Configurar índices y permisos.
- **Fase 1**: Auth + `users_info` + onboarding + CRUD de cuentas.
- **Fase 2**: Categorías + transacciones + saldos.
- **Fase 3**: Recurrencias + primeras gráficas.
- **Fase 4**: Tickets + OCR + flujo de borrador de movimiento.
- **Fase 5**: Integración Capacitor/Ionic + PWA.
