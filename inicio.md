# Financia — App de finanzas personales multiusuario (Appwrite)

Documento de alto nivel para que cualquier asistente/IA (y nosotros 💚) entienda **el contexto completo del proyecto** antes de pasar a la especificación técnica detallada.

Este documento está pensado para la versión que usa **Appwrite self‑hosted**, NO Supabase.

Más adelante haremos documentos separados para:
- Definir **colecciones y atributos** uno por uno (nivel ultra técnico).
- Especificar **reglas de seguridad**, **funciones** y **webhooks** paso a paso.
- Definir la integración con **Capacitor / Ionic** y el build de APK + PWA.

---

## 1. Contexto general del proyecto

- Proyecto: **Financia**.
- Tipo: **app de finanzas personales** multiusuario.
- Backend principal: **Appwrite** self‑hosted.

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
   - Los datos financieros son personales y privados.
   - Cada usuario sólo ve/edita **sus propios datos**.
   - Nada de “modo admin que ve todas las cuentas de todos” en la primera versión.

2. **Multi‑dispositivo e híbrida**
   - App usable desde navegador de escritorio y móvil.
   - Capaz de compilarse como:
     - **PWA** instalable.
     - **APK** usando Capacitor o Ionic (wrapper sobre el mismo frontend React).

3. **Escalabilidad en fases**
   - Primera versión: CRUD sólido de cuentas, categorías y transacciones.
   - Segunda/tercera fase: recurrencias, presupuestos, OCR de tickets, reportes avanzados.

---

## 2. Stack tecnológico

### 2.1 Backend — Appwrite

- **Instancia self‑hosted** en: `https://appwrite.racoondevs.com/v1`
- **Project ID**: `6928fb370000d34abbee`
- **Database**: `financia_dev` (`id: 6928ffe600036dff06be`)
- Appwrite nos da de fábrica:
  - **Auth**: usuarios, sesiones, recuperación de contraseña, etc.
  - **Database**: colecciones/atributos con RLS basada en permisos.
  - **Storage**: archivos (fotos de tickets, avatares, etc.).
  - **Functions**: lógica backend serverless (Node/deno/etc.).
  - **Webhooks**: llamadas HTTP a endpoints externos cuando suceden eventos.

No habrá un backend Express “monolítico” al inicio. La lógica se reparte entre:

- Reglas de permisos y validaciones básicas en Appwrite.
- Functions para tareas específicas (ej. crear perfiles, procesar tickets, recurrencias).
- Opcionalmente un **worker externo** (pequeño servicio Node/Python) para OCR si hace falta.

### 2.2 Frontend

Base:

- **ReactJS** con **Vite**.
- **TailwindCSS v4** (nueva sintaxis).
- **Lucide Icons** (iconografía).
- **Axios** (requests HTTP cuando se necesiten; Appwrite también tiene SDK propio).
- **react-hot-toast** (notificaciones amigables).

Híbrida:

- Diseño desde el inicio pensado como **app móvil primero** (mobile‑first).
- Posteriormente se envolverá con **Capacitor** o **Ionic** para generar:
  - APK Android.
  - PWA con manifest, service worker, etc.

---

## 3. Modelo de datos (visión general en Appwrite)

> Nota: aquí describimos las colecciones y campos a nivel conceptual.  
> En otro documento haremos la definición detallada en “modo Appwrite”: tipo exacto, longitudes, required, índices, etc.

### 3.1 Colecciones principales

1. `users_info` — perfil extendido del usuario de Auth.
2. `accounts` — cuentas financieras del usuario.
3. `categories` — categorías de ingresos y gastos.
4. `transactions` — movimientos de dinero.
5. `recurring_rules` — reglas para cargos/abonos recurrentes (suscripciones, rentas, etc.).
6. `receipts` — metadatos de tickets/facturas subidas (para OCR y vinculación con transacciones).

Más adelante (no obligatorio en la primera versión) podríamos agregar:

- `budgets` — presupuestos por categoría/periodo.
- `goals` — metas de ahorro.
- `shared_accounts` — cuentas compartidas entre varios usuarios.

A continuación, un diseño general de cada colección con los **tipos de atributo de Appwrite** disponibles (String, Integer, Float, Boolean, Datetime, Email, URL, Enum, Relationship, etc.).

---

### 3.2 `users_info` (colección: `users_info`, id: `69290002003c672b2102`)

**Propósito:** guardar los datos extra del usuario autenticado de Appwrite.

> Appwrite Auth ya maneja: **Name, Email, Phone, Password y User ID**.  
> `users_info` complementa esa información sin duplicar lo que ya existe en Auth.

Campos sugeridos (personalizables después si hace falta):

| Campo             | Tipo Appwrite | Requerido | Notas / restricciones aproximadas                                  |
|-------------------|--------------|-----------|---------------------------------------------------------------------|
| `userId`          | String       | ✅        | `maxLength: 36`. Guarda `user.$id` de Appwrite Auth.               |
| `username`        | String       | ❌        | `maxLength: 32`. Alias único opcional.                             |
| `firstName`       | String       | ❌        | `maxLength: 80`.                                                    |
| `lastName`        | String       | ❌        | `maxLength: 80`.                                                    |
| `country`         | String       | ❌        | `maxLength: 2` (código ISO, ej. `MX`).                              |
| `defaultCurrency` | String       | ✅        | `maxLength: 3`, ej. `MXN`, `USD`. Default: `MXN`.                  |
| `language`        | String       | ✅        | `maxLength: 5`, ej. `es-MX`. Default: `es-MX`.                     |
| `timezone`        | String       | ❌        | `maxLength: 64`. Ej. `America/Mexico_City`.                        |
| `avatarFileId`    | String       | ❌        | ID de archivo en bucket de Storage (foto de perfil).               |
| `onboardingDone`  | Boolean      | ✅        | Default: `false`. Marca si ya terminó el onboarding inicial.       |
| `role`            | Enum         | ✅        | Valores: `user`, `admin`. Default: `user`.                         |
| `createdAt`       | Datetime     | ✅        | Default: now (se puede usar `$createdAt` del documento).           |
| `updatedAt`       | Datetime     | ✅        | Se actualiza en updates (o se usa `$updatedAt`).                   |

> En muchos casos podemos confiar en los campos del sistema `$createdAt` y `$updatedAt`; `createdAt`/`updatedAt` se listan aquí solo como referencia conceptual.

---

### 3.3 `accounts` — cuentas del usuario

**Ejemplos:** “Efectivo”, “BBVA Nómina”, “Tarjeta Crédito Santander”, “Wallet MercadoPago”.

Campos sugeridos:

| Campo            | Tipo   | Req | Notas / restricciones                                               |
|------------------|--------|-----|----------------------------------------------------------------------|
| `userId`         | String | ✅  | `maxLength: 36`. Relaciona con Auth / `users_info`.                 |
| `name`           | String | ✅  | `maxLength: 80`. Nombre visible de la cuenta.                       |
| `type`           | Enum   | ✅  | Valores: `cash`, `debit`, `credit`, `savings`, `wallet`, `other`.   |
| `institution`    | String | ❌  | `maxLength: 80`. Banco o proveedor (BBVA, Santander, etc.).         |
| `currency`       | String | ✅  | `maxLength: 3`. Default igual a `users_info.defaultCurrency`.      |
| `initialBalance` | Float  | ✅  | Default: `0`. Puede ser negativo (si es tarjeta con adeudo).        |
| `currentBalance` | Float  | ✅  | Default: `0`. Se puede recalcular en el frontend o vía función.     |
| `color`          | String | ❌  | `maxLength: 9`. Hex opcional (`#RRGGBB` o con alpha).               |
| `icon`           | String | ❌  | `maxLength: 40`. Nombre de ícono (ej. `wallet`, `credit-card`).     |
| `isArchived`     | Bool   | ✅  | Default: `false`. Ocultar cuentas que ya no se usan.                |
| `sortOrder`      | Int    | ❌  | Default: `0`. Para ordenar cuentas manualmente.                     |
| `createdAt`      | Datetime | ✅| Usar `$createdAt`.                                                  |
| `updatedAt`      | Datetime | ✅| Usar `$updatedAt`.                                                  |

---

### 3.4 `categories` — categorías de ingresos/gastos

Permiten agrupar los movimientos.

Campos sugeridos:

| Campo        | Tipo   | Req | Notas / restricciones                                   |
|--------------|--------|-----|----------------------------------------------------------|
| `userId`     | String | ❌  | Si es `null`/vacío ⇒ categoría global por defecto.      |
| `name`       | String | ✅  | `maxLength: 60`.                                        |
| `type`       | Enum   | ✅  | `income`, `expense`, `transfer`.                        |
| `color`      | String | ❌  | Hex opcional para UI.                                   |
| `icon`       | String | ❌  | `maxLength: 40`. Nombre de icono lucide o similar.      |
| `isDefault`  | Bool   | ✅  | Default: `false`. Para marcar plantillas globales.      |
| `isEnabled`  | Bool   | ✅  | Default: `true`. Borrado lógico de categorías.          |
| `sortOrder`  | Int    | ❌  | Para ordenar categorías en listas.                      |
| `createdAt`  | Datetime | ✅| Usar `$createdAt`.                                      |
| `updatedAt`  | Datetime | ✅| Usar `$updatedAt`.                                      |

Regla conceptual:

- Cada usuario ve:
  - Sus propias categorías (`userId = su id`).
  - Las categorías globales (`userId` vacío) como plantillas.

---

### 3.5 `transactions` — movimientos de dinero

Esta es la tabla/colección central de la app.

Campos sugeridos:

| Campo           | Tipo   | Req | Notas / restricciones                                                 |
|-----------------|--------|-----|------------------------------------------------------------------------|
| `userId`        | String | ✅  | Referencia al usuario dueño del movimiento.                           |
| `accountId`     | String | ✅  | ID de documento en `accounts`.                                       |
| `categoryId`    | String | ❌  | ID de documento en `categories` (puede ser `null`).                   |
| `type`          | Enum   | ✅  | `income`, `expense`, `transfer`.                                      |
| `amount`        | Float  | ✅  | `min: 0.01`. El signo se deriva del `type` (`expense` resta, etc.).   |
| `currency`      | String | ❌  | Default: moneda de la cuenta; `maxLength: 3`.                          |
| `date`          | Datetime | ✅| Fecha efectiva de la transacción.                                     |
| `description`   | String | ❌  | `maxLength: 255`. Concepto breve visible en la lista.                  |
| `notes`         | String | ❌  | Puede ser texto más largo (si hace falta se parte en otra colec.).    |
| `isPending`     | Bool   | ✅  | Default: `false`. Para pagos aún no confirmados.                      |
| `isTransferLeg` | Bool   | ✅  | Default: `false`. Marca si es parte de una transferencia entre cuentas.|
| `relatedId`     | String | ❌  | Para enlazar las dos “piernas” de una transferencia.                  |
| `receiptId`     | String | ❌  | Referencia a documento en `receipts` (ticket escaneado).              |
| `createdAt`     | Datetime | ✅| `$createdAt`.                                                          |
| `updatedAt`     | Datetime | ✅| `$updatedAt`.                                                          |

Más adelante se pueden añadir campos como etiquetas (tags) o metadata en JSON usando Strings codificados o una colección auxiliar.

---

### 3.6 `recurring_rules` — reglas de recurrencia

Pensado para suscripciones, rentas, pagos fijos, etc.

| Campo          | Tipo   | Req | Notas / restricciones                                           |
|----------------|--------|-----|------------------------------------------------------------------|
| `userId`       | String | ✅  | Propietario de la regla.                                       |
| `accountId`    | String | ✅  | Cuenta sobre la cual se aplica.                                |
| `categoryId`   | String | ❌  | Categoría asociada.                                             |
| `type`         | Enum   | ✅  | `income` o `expense`.                                           |
| `amount`       | Float  | ✅  | Monto de cada evento.                                          |
| `currency`     | String | ❌  | Default: moneda de la cuenta.                                  |
| `frequency`    | Enum   | ✅  | `daily`, `weekly`, `monthly`, `yearly`, `custom`.              |
| `interval`     | Int    | ❌  | Default: 1 (ej. cada 1 mes, cada 2 semanas).                   |
| `startDate`    | Datetime | ✅| Primer día en que aplica.                                      |
| `endDate`      | Datetime | ❌| Si está vacío, se asume indefinido.                            |
| `nextRun`      | Datetime | ✅| Próxima fecha/hora en la que debe generarse una transacción.   |
| `description`  | String | ❌  | `maxLength: 255`.                                               |
| `isActive`     | Bool   | ✅  | Default: `true`.                                                |
| `createdAt`    | Datetime | ✅| `$createdAt`.                                                   |
| `updatedAt`    | Datetime | ✅| `$updatedAt`.                                                   |

Una función programada (cron) revisará estas reglas y generará transacciones cuando toque.

---

### 3.7 `receipts` — tickets / comprobantes

Relacionado con el upload de fotos de tickets/facturas y el OCR.

| Campo          | Tipo   | Req | Notas / restricciones                                                 |
|----------------|--------|-----|------------------------------------------------------------------------|
| `userId`       | String | ✅  | Dueño del ticket.                                                     |
| `fileId`       | String | ✅  | ID de archivo en Storage (bucket especial para tickets).             |
| `status`       | Enum   | ✅  | `uploaded`, `processing`, `processed`, `failed`. Default: `uploaded`.|
| `ocrText`      | String | ❌  | Texto plano extraído del ticket (resultado del OCR).                 |
| `detectedAmount` | Float| ❌  | Monto detectado automáticamente (si se encuentra).                   |
| `detectedDate` | Datetime | ❌| Fecha detectada en el ticket.                                        |
| `transactionId`| String | ❌  | ID de transacción creada/relacionada (si el usuario la confirma).    |
| `createdAt`    | Datetime | ✅| `$createdAt`.                                                         |
| `updatedAt`    | Datetime | ✅| `$updatedAt`.                                                         |

---

## 4. Seguridad y permisos (visión general)

En Appwrite la seguridad se maneja principalmente con:

- Permisos de documento (`read`, `write`, `update`, `delete`).
- Roles (`user:{userId}`, `role:all`, `role:admin`, etc.).

### 4.1 Principio base

- Todo documento financiero (`users_info`, `accounts`, `categories` propias, `transactions`, `recurring_rules`, `receipts`) se crea con permisos:
  - `read`: `user:{userId}`
  - `write`: `user:{userId}`
  - Opcional: `update`: `user:{userId}`
  - Opcional: `delete`: `user:{userId}`

Así garantizamos que:

- Un usuario **no puede leer ni tocar** documentos de otro.
- Los admins tendrán herramientas separadas (por ejemplo, panel interno o scripts) para hacer tareas globales, pero no habrá vistas directas de datos personales por defecto.

### 4.2 Categorías y catálogos globales

- Las categorías globales (`userId` vacío en `categories`) se crean con permisos de solo lectura `role:all`.
- Sólo el rol `admin` (definido en `users_info.role`) o un usuario específico de servicio podrá crearlas o editarlas.

---

## 5. Webhooks y Functions en Appwrite (plan general)

La combinación será:

- **Functions** para lógica que puede vivir dentro de Appwrite.
- **Webhooks** sólo cuando necesitemos avisar a un servicio externo (por ejemplo, un microservicio de OCR propio).

### 5.1 Casos previstos

1. **Creación de usuario (Auth → users_info)**  
   - Evento: `users.create` (Appwrite Auth).  
   - Acción: Function `createUserInfo`:
     - Crea un documento en `users_info` con `userId` y defaults (moneda base, idioma, rol `user`, `onboardingDone = false`).  
   - Esto se puede hacer como Function disparada por evento interno (no hace falta webhook externo).

2. **Upload de ticket (Storage → receipts + OCR)**  
   - Evento: `storage.files.create` en bucket `receipts`.  
   - Flujo:
     1. Function `onReceiptUploaded` crea un documento en `receipts` con `status = uploaded` y `fileId`.  
     2. La misma función (o un worker externo llamado por webhook) ejecuta OCR sobre la imagen:  
        - Si usamos un servicio externo (propio o de terceros), la Function envía el archivo a ese servicio vía HTTP.  
        - El servicio externo devuelve `ocrText` y, si puede, `detectedAmount` y `detectedDate`.  
     3. Function actualiza el documento `receipts` a `status = processed` con los datos obtenidos.  
     4. Opcional: crea una **transacción borrador** en `transactions` vinculada al `receiptId` para que el usuario la confirme.

3. **Recurrencias (recurring_rules)**  
   - Se usa una Function con programación tipo cron (Appwrite) que corre cada X minutos.  
   - La función:
     - Busca reglas donde `nextRun <= now()` y `isActive = true`.
     - Genera transacciones en `transactions` según la regla.
     - Actualiza `nextRun` sumando la frecuencia/intervalo correspondiente.

4. **Notificaciones / recordatorios (futuro)**  
   - Functions disparadas por cambios o por cron que envíen correos o notificaciones push (cuando integremos FCM/Capacitor).

### 5.2 Webhooks externos puros

En caso de que quieras manejar OCR o lógica compleja fuera de Appwrite:

- Se define un webhook con una URL tipo:  
  `https://financia-worker.racoondevs.com/webhooks/appwrite`
- Eventos que le pueden llegar:
  - `storage.files.create` para bucket `receipts`.
  - Opcional: `databases.*.collections.*.documents.create` en `transactions` o `recurring_rules` para auditoría.
- Ese servicio externo responde 2xx si todo ok y hace su trabajo de fondo.

---

## 6. Frontend — módulos y vistas principales

### 6.1 Módulos

1. **Auth & Onboarding**
   - Pantallas:
     - Login / registro.
     - Recuperación de contraseña.
   - Onboarding:
     - Completar `users_info` (nombre, moneda, país).
     - Crear primera cuenta (ej. “Efectivo” o “Cuenta principal”).

2. **Dashboard**
   - Resumen por defecto al entrar:
     - Saldo total.
     - Lista de cuentas con saldo.
     - Vista rápida de últimos movimientos.
     - Gráfico simple de ingresos vs gastos del periodo actual.

3. **Cuentas**
   - Listado de cuentas con acciones CRUD.
   - Detalle de una cuenta:
     - Historial de transacciones filtradas por esa cuenta.
     - Totales por periodo.

4. **Transacciones**
   - Vista en tabla o lista tipo timeline.
   - Filtros:
     - Por rango de fechas, cuenta, categoría, tipo.
   - Formulario de creación/edición:
     - Tipo, cuenta, categoría, fecha, monto, descripción, ticket opcional.

5. **Categorías**
   - Listado de categorías propias + globales.
   - CRUD de categorías del usuario.
   - Cambio de color/icono para interfaz.

6. **Recurrencias (Suscripciones/Pagos fijos)**
   - Lista de reglas recurrentes.
   - Formulario: frecuencia, cuenta, categoría, monto, fechas.

7. **Tickets / OCR (fase posterior)**
   - Pantalla para ver tickets subidos:
     - Estado del procesamiento.
     - Resultado de OCR.
     - Link a la transacción asociada o botón para “Crear movimiento desde ticket”.

8. **Perfil / Configuración**
   - Editar datos de `users_info` (nombre, avatar, moneda, idioma).
   - Ajustes de la app (tema, notificaciones, etc.).

### 6.2 Consideraciones de diseño

- **Mobile‑first**:
  - Navegación tipo bottom‑tab o drawer para experiencia tipo app.
- **Componentes reusables** con Tailwind + Lucide.
- **Manejo de estado** inicialmente con hooks + contexto; si luego hace falta, se puede sumar React Query / Zustand.

---

## 7. Roadmap por fases

### Fase 0 — Setup base

- Confirmar proyecto en Appwrite: `financia` (IDs ya definidos).
- Crear colecciones:
  - `users_info`
  - `accounts`
  - `categories`
  - `transactions`
  - `recurring_rules`
  - `receipts`
- Configurar roles y permisos básicos (plantilla para que todo se cree con `user:{userId}`).

### Fase 1 — Auth + Perfil

- Integrar SDK de Appwrite en el frontend (login/registro).
- Implementar Function para poblar automáticamente `users_info` en `users.create`.
- Onboarding inicial (wizard de perfil + primera cuenta).

### Fase 2 — Cuentas, Categorías y Transacciones

- CRUD completo de cuentas.
- CRUD de categorías propias (y consumo de categorías globales).
- CRUD de transacciones con filtros básicos.
- Cálculo de saldos de forma consistente.

### Fase 3 — Recurrencias y primeras analíticas

- Implementar `recurring_rules` + Function programada.
- Sección de “Suscripciones/Pagos fijos” en el frontend.
- Gráficas básicas de resumen mensual.

### Fase 4 — Tickets y OCR

- Integración de upload de tickets (usando cámara o galería en móvil):
  - Subida a bucket `receipts`.
  - Creación de documentos `receipts` y procesamiento OCR.
  - Generación de transacciones borrador a partir del OCR.
- UI para revisar/confirmar esas transacciones.

### Fase 5 — Híbrida completa (Capacitor/Ionic + PWA)

- Configurar proyecto para build con Capacitor o Ionic:
  - Permisos de cámara.
  - Almacenamiento offline básico.
  - Notificaciones push (más adelante).
- Ajustar PWA (manifest, service worker, iconos).

### Fase 6 — Extras futuros

- Presupuestos y alertas.
- Metas de ahorro.
- Modo de cuentas compartidas.
- Integraciones con IA para hacer consultas tipo “¿en qué gasté más este mes?”.

---

## 8. Qué sigue

1. Crear un documento técnico separado con:
   - Definición exacta de cada colección de Appwrite (atributos, tipos, longitudes, defaults).
   - Ejemplos de payloads JSON para crear documentos desde el frontend.
   - Definición de las Functions de Appwrite (nombre, runtime, disparadores).

2. Montar el esqueleto del frontend con:
   - Rutas básicas.
   - Layout móvil‑first.
   - Integración inicial con Appwrite Auth.

3. A partir de ahí, iterar pantalla por pantalla y función por función.


---

## 9. Relaciones, índices e impacto en borrados (modo Appwrite)

Esta sección detalla, para cada colección:

- **Relaciones** (one-way vs two-way) tal como se configuran en Appwrite.
- **Índices** recomendados.
- **Tipo de eliminación** (lógica vs física) que usaremos a nivel de app.

> Nota: donde se menciona “String simple” en vez de `Relationship`, es porque Appwrite no permite relacionar directamente con usuarios de Auth, sólo entre colecciones de Database.

### 9.1 `users_info`

**Relaciones**

- `userId` → usuario de Auth
  - Tipo: **String**, no `Relationship`.
  - Lógica: 1:1 entre `user.$id` (Auth) y documento `users_info`.
  - Se usará una Function en `users.create` para crear el `users_info` correspondiente.

**Índices** (pestaña *Indexes* de la colección)

1. `IDX_users_info_userId_unique`
   - Tipo: **unique**
   - Atributos: `userId`
   - Propósito: asegurar que cada usuario de Auth tenga sólo un `users_info`.

2. `IDX_users_info_username_unique` (opcional si quieres usernames únicos)
   - Tipo: **unique**
   - Atributos: `username`

3. `IDX_users_info_role`
   - Tipo: **key**
   - Atributos: `role`
   - Para listados/filtrados por rol (`admin` vs `user`).

**Eliminación**

- No hay `isDeleted`. Si se elimina el usuario de Auth definitivamente, una Function puede borrar físicamente el `users_info` correspondiente.
- Para “desactivar” un usuario, se hará a nivel Auth o cambiando su `role` a algo como `disabled` (si lo llegamos a necesitar).

---

### 9.2 `accounts`

**Relaciones**

- `userId` → usuario dueño
  - Tipo: **String**.
  - No se crea `Relationship` porque el usuario está en Auth.

No hay relaciones directas vía `Relationship` con otras colecciones (las transacciones referencian a las cuentas, no al revés).

**Índices**

1. `IDX_accounts_userId`
   - Tipo: **key**
   - Atributos: `userId`
   - Para listar rápidamente cuentas de un usuario.

2. `IDX_accounts_userId_isArchived`
   - Tipo: **key**
   - Atributos: `userId`, `isArchived`
   - Para traer sólo cuentas activas de un usuario.

3. `IDX_accounts_userId_name_unique` (opcional)
   - Tipo: **unique**
   - Atributos: `userId`, `name`
   - Evita que un usuario tenga dos cuentas exactamente con el mismo nombre.

**Eliminación**

- Eliminación **lógica** usando el campo `isArchived` (`true` = cuenta archivada).
- No se borra físicamente la cuenta si tiene transacciones; sólo se oculta de la UI normal.

---

### 9.3 `categories`

**Relaciones**

- `userId` → usuario dueño (o vacío para categorías globales)
  - Tipo: **String**.
  - Sin `Relationship`.

**Índices**

1. `IDX_categories_userId`
   - Tipo: **key**
   - Atributos: `userId`

2. `IDX_categories_userId_type`
   - Tipo: **key**
   - Atributos: `userId`, `type`
   - Útil para listar categorías de ingresos/gastos por usuario.

3. `IDX_categories_global_defaults`
   - Tipo: **key**
   - Atributos: `userId`, `isDefault`
   - Pensado para filtrar plantillas globales (`userId` vacío y `isDefault = true`).

4. `IDX_categories_userId_isEnabled`
   - Tipo: **key**
   - Atributos: `userId`, `isEnabled`
   - Para traer sólo categorías activas del usuario.

**Eliminación**

- Eliminación **lógica** vía `isEnabled` (`false` = categoría “borrada”/deshabilitada).
- No se elimina físicamente si hay transacciones que referencian esta categoría.

---

### 9.4 `transactions`

**Relaciones**

Aquí sí conviene usar **Relationship attributes** en Appwrite para aprovechar joins y validación:

- `accountId` → colección `accounts`
  - Tipo: **Relationship**
  - Dirección: **One-way relationship**
  - Esta relación se crea **dentro de `transactions`** apuntando a `accounts`.
  - No se necesita atributo en `accounts` del otro lado (no usamos two-way).  

- `categoryId` → colección `categories` (opcional)
  - Tipo: **Relationship**
  - Dirección: **One-way relationship**
  - Relación 1:N (muchas transacciones pueden usar la misma categoría).

- `receiptId` → colección `receipts` (opcional)
  - Tipo: **Relationship**
  - Dirección: **One-way relationship**
  - No es obligatorio crear relación inversa en `receipts`, porque allí también tendremos un campo `transactionId`.

> En todos los casos anteriores, cuando la UI pregunte “One-way” o “Two-way”, usar **One-way** y NO generar un atributo extra en la colección relacionada.

Adicionalmente:

- `userId` seguirá siendo un **String** (dueño de la transacción). No usamos Relationship porque el usuario está en Auth.

**Índices**

1. `IDX_transactions_userId_date`
   - Tipo: **key**
   - Atributos: `userId`, `date`
   - Para listar movimientos de un usuario en orden de fecha.

2. `IDX_transactions_userId_accountId_date`
   - Tipo: **key**
   - Atributos: `userId`, `accountId`, `date`
   - Para filtros de “movimientos por cuenta + rango de fechas”.

3. `IDX_transactions_userId_categoryId_date`
   - Tipo: **key**
   - Atributos: `userId`, `categoryId`, `date`

4. `IDX_transactions_userId_type_date`
   - Tipo: **key**
   - Atributos: `userId`, `type`, `date`
   - Útil para reportes de ingresos vs gastos.

5. `IDX_transactions_receiptId`
   - Tipo: **key**
   - Atributos: `receiptId`

**Eliminación**

- Recomendado: eliminación **lógica** con un campo nuevo `isDeleted: Boolean` (default: `false`).  
  - La UI normal filtra solo `isDeleted = false`.
  - Un futuro módulo de auditoría podría ver también los “borrados”.

---

### 9.5 `recurring_rules`

**Relaciones**

- `accountId` → colección `accounts`
  - Tipo: **Relationship**
  - Dirección: **One-way**
  - Desde `recurring_rules` hacia `accounts`. No crear atributo inverso.

- `categoryId` → colección `categories` (opcional)
  - Tipo: **Relationship**
  - Dirección: **One-way**

- `userId` → usuario dueño
  - Tipo: **String**.

**Índices**

1. `IDX_recurring_rules_userId`
   - Tipo: **key**
   - Atributos: `userId`

2. `IDX_recurring_rules_userId_nextRun_isActive`
   - Tipo: **key**
   - Atributos: `userId`, `nextRun`, `isActive`
   - Para que la Function de cron pueda encontrar rápido las reglas activas a ejecutar.

3. `IDX_recurring_rules_accountId`
   - Tipo: **key**
   - Atributos: `accountId`

**Eliminación**

- Usaremos principalmente `isActive` (`false` = regla desactivada).  
- Si quieres una eliminación más fuerte, se puede añadir `isDeleted: Boolean` pero en principio con `isActive` es suficiente.

---

### 9.6 `receipts`

**Relaciones**

- `transactionId` → colección `transactions` (opcional)
  - Tipo: **Relationship**
  - Dirección: **One-way relationship**
  - Desde `receipts` hacia `transactions`.

- `userId` → usuario dueño
  - Tipo: **String**.

- `fileId` → archivo en Storage
  - NO es `Relationship` de Database; se usa el ID del archivo en el bucket de Appwrite Storage.

> Como también definimos en `transactions` una relación `receiptId` → `receipts`, tendremos en la práctica una relación “bidireccional”, pero construida con **dos one-way** en colecciones diferentes, en lugar de un sólo two-way. Así hay más control y evitamos atributos automáticos que no vamos a usar.

**Índices**

1. `IDX_receipts_userId`
   - Tipo: **key**
   - Atributos: `userId`

2. `IDX_receipts_status`
   - Tipo: **key**
   - Atributos: `status`
   - Para dashboards de procesamiento OCR.

3. `IDX_receipts_userId_status`
   - Tipo: **key**
   - Atributos: `userId`, `status`

4. `IDX_receipts_transactionId`
   - Tipo: **key**
   - Atributos: `transactionId`

**Eliminación**

- Se pueden manejar dos niveles:
  1. **Lógica** (opcional): campo `isDeleted: Boolean` en `receipts`.  
  2. **Física**: cuando se borra definitivamente un ticket desde la UI avanzada, una Function puede:
     - Borrar el documento `receipts`.
     - Borrar el archivo de Storage asociado (`fileId`).

Para la primera versión podemos dejar solo borrado **físico** (menos campos), sabiendo que en Appwrite igual queda un historial de logs, pero si prefieres coherencia con `transactions`, añadimos también `isDeleted`.

---

### 9.7 Resumen rápido de relaciones (para ayudarte en la UI de Appwrite)

- **Usar Relationship en Appwrite (One-way):**
  - `transactions.accountId` → `accounts`
  - `transactions.categoryId` → `categories`
  - `transactions.receiptId` → `receipts`
  - `recurring_rules.accountId` → `accounts`
  - `recurring_rules.categoryId` → `categories`
  - `receipts.transactionId` → `transactions`

- **NO usar Relationship (String simple):**
  - Todos los `userId` (porque apuntan a Auth, no a Database).
  - `fileId` en `receipts` (porque apunta a Storage).
  - Cualquier otra referencia donde Appwrite no permita Relationship directo.

- **Two-way relationships:**  
  - No son necesarias en esta versión. Preferimos dos one-way explícitas (`transactions.receiptId` y `receipts.transactionId`) cuando queremos navegación en ambos sentidos.

---

Con esto ya tienes una guía clara para:

- En la pestaña **Attributes**, crear Relationships como **One-way** y elegir la colección target.
- En la pestaña **Indexes**, crear índices `key` o `unique` según lo listado.
- Decidir en cada pantalla si el borrado será lógico (marcar boolean) o físico (delete document / file).
