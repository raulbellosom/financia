# Financia — Base de datos (Appwrite Console) — v2.1

Fecha: 2025-12-16  
Alcance: **Definición real (tal cual la capturaste a mano en Appwrite)** + notas de compatibilidad con **limitaciones del Console**.

> Este documento está pensado para que puedas **replicar o auditar** la BD **100% desde Appwrite Console** (sin CLI, sin scripts de migración).

---

## Reglas importantes del Appwrite Console (las que estás usando)

1. **Required + Default (limitación práctica)**

   - Si un atributo está marcado como **required**, Appwrite Console normalmente **no deja poner default** en el mismo atributo.
   - Por lo tanto, si algo “debería default”, aquí lo marco como:
     - **Default recomendado (en la app)**: debes setearlo desde el frontend / function al crear el documento.

2. **Índices**

   - Los índices sólo pueden usar **atributos de la misma colección**.
   - **No existen “índices por campos de otras tablas”**.
   - En este documento separo:
     - **Índices actuales** (lo que realmente tengas creado).
     - **Índices sugeridos** (si te deja el Console, porque ayudan mucho).

3. **Relaciones**
   - Usas relaciones **many-to-one** con `cascade` o `set null`.
   - En Appwrite, la relación es un atributo más; **no requiere “join”**, pero sí debes diseñar bien los índices por filtro.

---

## Nombres de colecciones

Colecciones descritas:

1. `users_info`
2. `accounts`
3. `categories`
4. `transactions`
5. `receipts`
6. `recurring_rules`
7. `alarms`

> Nota: En tus apuntes hay menciones de `users_profile`, pero por tu lista real la colección es **`users_info`**.  
> En este documento uso **`users_info`** como referencia en todas las relaciones.

---

# 1) users_info

Colección de perfil extendido del usuario (complementa Appwrite Auth).

## Atributos

| Campo            | Tipo    | Required | Reglas / Tamaño                   | Default (Console) | Notas                                                  |
| ---------------- | ------- | -------: | --------------------------------- | ----------------- | ------------------------------------------------------ |
| authUserId       | String  |       ✅ | size 64                           | —                 | ID del usuario de Appwrite Auth.                       |
| email            | String  |       ❌ | size 255                          | —                 | Copia del email de Auth (Lectura).                     |
| username         | String  |       ❌ | size 36                           | —                 | Alias/username.                                        |
| firstName        | String  |       ❌ | size 80                           | —                 |                                                        |
| lastName         | String  |       ❌ | size 80                           | —                 |                                                        |
| country          | String  |       ❌ | size 2                            | —                 | ISO-2 (MX, US…).                                       |
| defaultCurrency  | String  |       ❌ | size 3                            | —                 | Si quieres default (ej. MXN), setéalo en app al crear. |
| language         | String  |       ❌ | size 10                           | —                 | Idioma (ej. es-MX).                                    |
| timezone         | String  |       ❌ | size 80                           | —                 | Ej. `America/Mexico_City`.                             |
| avatarFileId     | String  |       ❌ | size 36                           | —                 | ID en Storage para avatar.                             |
| verified_email   | Boolean |       ✅ | —                                 | —                 | **Default recomendado (app):** `false`.                |
| verified_phone   | Boolean |       ✅ | —                                 | —                 | **Default recomendado (app):** `false`.                |
| onboardingDone   | Boolean |       ✅ | —                                 | —                 | **Default recomendado (app):** `false`.                |
| role             | Enum    |       ✅ | values: `user`, `main`            | —                 | **Default recomendado (app):** `user`.                 |
| preferredPalette | Enum    |       ❌ | values: `vivid`, `pastel`, `dark` | —                 | **Default recomendado (app):** `vivid`.                |
| darkMode         | Enum    |       ❌ | values: `system`, `light`, `dark` | —                 | **Default recomendado (app):** `system`.               |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `authUserId` (unique) — para evitar perfiles duplicados por usuario Auth.
  - `username` (unique) — si de verdad será único.

---

# 2) accounts

Cuentas del usuario (efectivo, débito, crédito, ahorro, inversión, wallets, etc.).

## Relaciones

- `profile` → `users_info` (**many-to-one**, `cascade`)

## Atributos

| Campo                | Tipo                     | Required | Reglas / Tamaño                                                               | Default (Console)                   | Notas                                                        |
| -------------------- | ------------------------ | -------: | ----------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| profile              | Relationship(users_info) |       ✅ | many-to-one, onDelete: cascade                                                | —                                   | Dueño de la cuenta.                                          |
| name                 | String                   |       ❌ | size 64                                                                       | —                                   | Nombre visible.                                              |
| type                 | Enum                     |       ✅ | values: `cash`, `debit`, `credit`, `savings`, `investment`, `wallet`, `other` | —                                   |                                                              |
| institution          | String                   |       ❌ | size 80                                                                       | —                                   | Banco / proveedor.                                           |
| currency             | String                   |       ✅ | size 3                                                                        | —                                   |                                                              |
| initialBalance       | Double                   |       ✅ | min 0                                                                         | —                                   | Si quieres permitir negativos para tarjetas, quita min 0.    |
| currentBalance       | Double                   |       ✅ | min 0                                                                         | —                                   | Si es calculado, podrías no hacerlo required.                |
| color                | String                   |       ❌ | size 9                                                                        | —                                   | Hex `#RRGGBB` o `#RRGGBBAA`.                                 |
| icon                 | String                   |       ❌ | size 64                                                                       | —                                   | Nombre de ícono (Lucide u otro).                             |
| isArchived           | Boolean                  |       ✅ | —                                                                             | —                                   | **Default recomendado (app):** `false`.                      |
| sortOrder            | Integer                  |       ❌ | min 0                                                                         | —                                   |                                                              |
| cardLast4            | String                   |       ❌ | size 4                                                                        | —                                   | Sólo para tarjetas.                                          |
| billingDay           | Integer                  |       ❌ | min 1, max 31                                                                 | —                                   | Día de corte.                                                |
| dueDay               | Integer                  |       ❌ | min 1, max 31                                                                 | —                                   | Día límite de pago.                                          |
| creditLimit          | Double                   |       ❌ | min 0                                                                         | —                                   |                                                              |
| yieldRate            | Double                   |       ❌ | min 0                                                                         | —                                   | % o tasa (define convención en frontend).                    |
| yieldFrequency       | Enum                     |       ❌ | values: `daily`, `weekly`, `monthly`, `annual`                                | **(tu lista dice default: annual)** | Si lo marcas required, el default no aplica; setéalo en app. |
| yieldCalculationBase | Enum                     |       ❌ | values: `total`, `fixed`                                                      | **(tu lista dice default: total)**  |                                                              |
| lastYieldDate        | Datetime                 |       ❌ | —                                                                             | —                                   |                                                              |
| yieldFixedAmount     | Double                   |       ❌ | min 0                                                                         | —                                   | Usado si `yieldCalculationBase = fixed`.                     |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `profile`
  - `profile + isArchived`
  - `profile + type`
  - `profile + currency`

---

# 3) categories

Categorías de ingresos/egresos/transferencias.

## Relaciones

- `profile` → `users_info` (**many-to-one**, `cascade`)

## Atributos

| Campo     | Tipo                     | Required | Reglas / Tamaño                         | Default (Console)              | Notas                                                       |
| --------- | ------------------------ | -------: | --------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| profile   | Relationship(users_info) |       ✅ | many-to-one, onDelete: cascade          | —                              | Dueño de la categoría.                                      |
| name      | String                   |       ✅ | size 50                                 | —                              |                                                             |
| type      | Enum                     |       ✅ | values: `income`, `expense`, `transfer` | —                              |                                                             |
| color     | String                   |       ❌ | size 9                                  | —                              |                                                             |
| icon      | String                   |       ❌ | size 64                                 | —                              |                                                             |
| isDefault | Boolean                  |       ✅ | —                                       | —                              | Default recomendado (app): `false`.                         |
| isEnabled | Boolean                  |       ✅ | —                                       | —                              | Default recomendado (app): `true`.                          |
| sortOrder | Integer                  |       ❌ | min 0                                   | **(tu lista dice default: 0)** | Si lo pones required, el default no aplica; setéalo en app. |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `profile + type`
  - `profile + isEnabled`
  - `profile + type + isEnabled`

---

# 4) transactions

Movimientos: ingresos, gastos y transferencias.

## Relaciones

- `profile` → `users_info` (**many-to-one**, `cascade`)
- `account` → `accounts` (**many-to-one**, `cascade`)
- `category` → `categories` (**many-to-one**, `set null`)
- `receipt` → `receipts` (**many-to-one**, `set null`)

## Atributos

| Campo             | Tipo                     | Required | Reglas / Tamaño                               | Default (Console)                   | Notas                                                               |
| ----------------- | ------------------------ | -------: | --------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| profile           | Relationship(users_info) |       ✅ | many-to-one, onDelete: cascade                | —                                   | Dueño del movimiento.                                               |
| account           | Relationship(accounts)   |       ✅ | many-to-one, onDelete: cascade                | —                                   | Cuenta afectada.                                                    |
| type              | Enum                     |       ✅ | values: `income`, `expense`, `transfer`       | —                                   |                                                                     |
| amount            | Double                   |       ❌ | min 0.1                                       | —                                   | Si debe ser obligatorio, márcalo required.                          |
| currency          | String                   |       ❌ | size 3                                        | —                                   | Recomiendo llenarlo siempre (desde account.currency).               |
| date              | Datetime                 |       ❌ | —                                             | —                                   | Recomiendo required.                                                |
| description       | String                   |       ❌ | size 1500                                     | —                                   | Si esto es “concepto”, 1500 está OK.                                |
| notes             | String                   |       ❌ | size 1500                                     | —                                   |                                                                     |
| isPending         | Boolean                  |       ✅ | —                                             | —                                   | Default recomendado (app): `false`.                                 |
| isTransferLeg     | Boolean                  |       ✅ | —                                             | —                                   | Default recomendado (app): `false`.                                 |
| isDraft           | Boolean                  |       ✅ | —                                             | —                                   | Default recomendado (app): `false`.                                 |
| origin            | Enum                     |       ❌ | values: `manual`, `recurring`, `ocr`, `yield` | **(tu lista dice default: manual)** | Si quieres default, setéalo en app al crear.                        |
| isDeleted         | Boolean                  |       ✅ | —                                             | —                                   | Default recomendado (app): `false`.                                 |
| category          | Relationship(categories) |       ❌ | many-to-one, onDelete: set null               | —                                   |                                                                     |
| receipt           | Relationship(receipts)   |       ❌ | many-to-one, onDelete: set null               | —                                   |                                                                     |
| installments      | Integer                  |       ✅ | min 1                                         | —                                   | Total meses (1=normal, >1=MSI). Default app: 1.                     |
| installmentsPaid  | Integer                  |       ❌ | min 0                                         | —                                   | Default app: 0.                                                     |
| originalAmount    | Double                   |       ❌ | min 0.1                                       | —                                   | Opcional: monto original (si `amount` representa algo distinto).    |
| transferGroupId   | String                   |       ❌ | size 36                                       | —                                   | Para ligar transferencias (UUID).                                   |
| transferSide      | Enum                     |       ❌ | values: `outgoing`, `incoming`                | —                                   | Lado de la transferencia.                                           |
| ocrDetectedAmount | Double                   |       ❌ | min 0                                         | —                                   | Opcional: monto detectado por OCR (si lo guardas en transacciones). |
| ocrConfidence     | Double                   |       ❌ | min 0                                         | —                                   | Opcional: confianza OCR (0-1 o 0-100, define convención).           |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `profile + date`
  - `profile + account + date`
  - `profile + type + date`
  - `profile + installments` (MSI)
  - `profile + transferGroupId` (traspasos)
  - `profile + isDeleted + date`
  - `profile + isDraft + date`

---

# 5) receipts

Tickets / comprobantes subidos para OCR.

## Relaciones

- `profile` → `users_info` (**many-to-one**, `cascade`)
- `transaction` → `transactions` (**many-to-one**, `cascade`) _(según tu lista)_

> Ojo: si `transaction` es `cascade` y borras la transacción, se borrará el receipt.  
> Si quieres conservar el ticket aunque borres el movimiento, cambia a `set null`.

## Atributos

| Campo          | Tipo                       | Required | Reglas / Tamaño                                         | Default (Console)              | Notas                                                    |
| -------------- | -------------------------- | -------: | ------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| profile        | Relationship(users_info)   |       ✅ | many-to-one, onDelete: cascade                          | —                              |                                                          |
| fileId         | String                     |       ✅ | size 64                                                 | —                              | ID del archivo en Storage.                               |
| status         | Enum                       |       ✅ | values: `uploaded`, `processing`, `processed`, `failed` | —                              | Default recomendado (app): `uploaded`.                   |
| ocrText        | String                     |       ❌ | size 3500                                               | —                              |                                                          |
| detectedAmount | Double                     |       ❌ | min 0                                                   | **(tu lista dice default: 0)** | Si lo haces required, default no aplica; setéalo en app. |
| detectedDate   | Datetime                   |       ❌ | —                                                       | —                              |                                                          |
| transaction    | Relationship(transactions) |       ❌ | many-to-one, onDelete: cascade                          | —                              |                                                          |
| isDeleted      | Boolean                    |       ✅ | —                                                       | —                              | Default recomendado (app): `false`.                      |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `profile + status`
  - `profile + isDeleted`
  - `profile + transaction`

---

# 6) recurring_rules

Reglas para generar transacciones recurrentes (suscripciones/pagos fijos).

## Relaciones

- `profile` → `users_info` (**many-to-one**, `cascade`)
- `account` → `accounts` (**many-to-one**, `cascade`)
- `category` → `categories` (**many-to-one**, `set null`)

## Atributos

| Campo       | Tipo                     | Required | Reglas / Tamaño                                          | Default (Console)              | Notas                                                    |
| ----------- | ------------------------ | -------: | -------------------------------------------------------- | ------------------------------ | -------------------------------------------------------- |
| profile     | Relationship(users_info) |       ✅ | many-to-one, onDelete: cascade                           | —                              |                                                          |
| account     | Relationship(accounts)   |       ✅ | many-to-one, onDelete: cascade                           | —                              |                                                          |
| category    | Relationship(categories) |       ❌ | many-to-one, onDelete: set null                          | —                              |                                                          |
| name        | String                   |       ✅ | size 80                                                  | —                              |                                                          |
| type        | Enum                     |       ✅ | values: `income`, `expense`                              | —                              |                                                          |
| amount      | Double                   |       ✅ | min 0.1                                                  | —                              |                                                          |
| currency    | String                   |       ❌ | size 3                                                   | —                              | Recomiendo setearlo desde la cuenta.                     |
| frequency   | Enum                     |       ✅ | values: `daily`, `weekly`, `monthly`, `yearly`, `custom` | —                              |                                                          |
| interval    | Integer                  |       ❌ | min 1                                                    | **(tu lista dice default: 1)** | Si lo haces required, default no aplica; setéalo en app. |
| startDate   | Datetime                 |       ✅ | —                                                        | —                              |                                                          |
| endDate     | Datetime                 |       ❌ | —                                                        | —                              |                                                          |
| nextRun     | Datetime                 |       ✅ | —                                                        | —                              |                                                          |
| description | String                   |       ❌ | size 255                                                 | —                              |                                                          |
| autoConfirm | Boolean                  |       ✅ | —                                                        | —                              | Default recomendado (app): `false` o `true` según tu UX. |
| isActive    | Boolean                  |       ✅ | —                                                        | —                              | Default recomendado (app): `true`.                       |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `profile + isActive + nextRun` (clave para el cron de recurrencias)
  - `account`
  - `profile + frequency`

---

# 7) alarms

Recordatorios/alertas (pagos, cortes, vencimientos, etc.).

## Relaciones

- `profile` → `users_info` (**many-to-one**, `cascade`)
- `relatedAccount` → `accounts` (**many-to-one**, opcional)
- `relatedTransaction` → `transactions` (**many-to-one**, opcional)

## Atributos

| Campo              | Tipo                       | Required | Reglas / Tamaño                                 | Default (Console) | Notas                                       |
| ------------------ | -------------------------- | -------: | ----------------------------------------------- | ----------------- | ------------------------------------------- |
| profile            | Relationship(users_info)   |       ✅ | many-to-one, onDelete: cascade                  | —                 | Dueño de la alarma.                         |
| title              | String                     |       ✅ | size 120                                        | —                 |                                             |
| description        | String                     |       ❌ | size 1500                                       | —                 |                                             |
| type               | Enum                       |       ✅ | values: `reminder`, `bill`, `payment`, `custom` | —                 | Ajusta valores a tu UX si ya los cambiaste. |
| dueDate            | Datetime                   |       ✅ | —                                               | —                 | Fecha/hora objetivo.                        |
| timezone           | String                     |       ✅ | size 80                                         | —                 | Ej. `America/Mexico_City`.                  |
| status             | Enum                       |       ✅ | values: `pending`, `fired`, `cancelled`         | —                 | Default recomendado (app): `pending`.       |
| channel            | String[]                   |       ❌ | values sugeridos: `push`, `email`, `inApp`      | —                 | En Console usa “String Array” (si aplica).  |
| isDeleted          | Boolean                    |       ✅ | —                                               | —                 | Default recomendado (app): `false`.         |
| relatedAccount     | Relationship(accounts)     |       ❌ | many-to-one, onDelete: set null (recomendado)   | —                 |                                             |
| relatedTransaction | Relationship(transactions) |       ❌ | many-to-one, onDelete: set null (recomendado)   | —                 |                                             |

## Índices

- **Actuales:** _(no especificados)_
- **Sugeridos (Console-friendly):**
  - `profile + status + dueDate` (clave para cron de alarmas)
  - `profile + dueDate` (vista calendario)
  - `profile + isDeleted`

---

## Checklist rápido (para que el doc sea “ejecutable” en Console)

- [ ] Confirmar que todas las relaciones apuntan a `users_info` (no `users_profile`).
- [ ] Revisar si de verdad quieres `min 0` en balances y `min 0.1` en amount.
- [ ] Decidir defaults en frontend/functions para todos los campos required (booleans + enums).
- [ ] Crear al menos estos índices sugeridos:
  - `transactions`: `profile + date`, `profile + account + date`
  - `recurring_rules`: `profile + isActive + nextRun`
  - `receipts`: `profile + status`

---

## Historial de cambios (respecto a tu archivo anterior)

- Documento reescrito para reflejar **tu captura real** de atributos y tamaños.
- Se ajustó el texto para respetar las limitaciones que mencionas del Appwrite Console:
  - required ≠ default
  - índices sólo dentro de la colección (sin “campo externo”)
