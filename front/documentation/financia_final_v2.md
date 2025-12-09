# Documento oficial — Financia Base de Datos v2

Versión consolidada con motivos + modelo completo  
Fecha: 2025-12-08

# Financia — Modelo de datos v2 (Appwrite)

## Razón de la reestructuración (los 5 objetivos principales)

Tu estructura original no permitía cubrir completamente las funciones que deseas implementar.  
Estos son los **5 motivos claros** por los cuales fue necesario rediseñar la base de datos:

---

### 1. Consultar cuentas por usuario, incluyendo banco y últimos 4 dígitos de la tarjeta

Para que un usuario pueda ver TODAS sus cuentas con detalle (banco, tipo, saldo, últimos dígitos), se necesitaba:

- Una relación **users_info → accounts**.
- Campos adicionales en `accounts`: `institution`, `cardLast4`, `type`, `currency`.
- Control de orden, colores e íconos para interfaz.

La versión anterior no soportaba tarjetas correctamente ni permitía identificar la institución bancaria.

---

### 2. Manejar tarjetas de crédito con fecha de corte y fecha límite de pago

Las tarjetas de crédito funcionan con ciclos:  
corte → acumulación → fecha límite de pago.

Para simular esto:

- Se agregaron los campos: `billingDay`, `dueDay`, `creditLimit`.
- Se necesita que Appwrite Functions puedan leer estas fechas y generar **recordatorios y proyecciones**.

Tu estructura anterior no permitía calcular ciclos de facturación.

---

### 3. Consultas financieras estilo “cuenta T” por periodos

Para obtener ingresos, egresos y saldo por:

- rango de fechas,
- por cuenta o todas,
- por categoría,
- por tipo (ingreso/egreso/transfer).

Esto requiere:

- Una colección `transactions` bien normalizada.
- Relaciones: `profile`, `account`, `category`, `receipt`.
- Índices optimizados para filtrar por fecha y cuenta.

Tu estructura previa no soportaba análisis por periodo ni integración profunda con categorías.

---

### 4. Pagos recurrentes (suscripciones, renta, servicios)

Los usuarios deben poder registrar sus pagos fijos:
Netflix, HBO, luz, agua, renta, etc.

Para esto se creó/reestructuró `recurring_rules` con:

- frecuencia: daily, weekly, monthly, yearly, custom
- intervalos: cada 1 mes, cada 2 semanas, etc.
- fecha de siguiente ejecución (`nextRun`)
- opción `autoConfirm` para crear automáticamente las transacciones.

Sin esta tabla no era posible automatizar cargos futuros ni recordatorios.

---

### 5. Tickets escaneados con OCR que generan borradores de transacción

Para leer tickets con Tesseract y convertirlos en gastos preliminares:

- Se rediseñó la colección `receipts`.
- Se agregó el campo `isDraft` a `transactions`.
- Debe existir relación bidireccional: receipt → transaction y transaction → receipt.
- Estados del OCR: `uploaded`, `processing`, `processed`, `failed`.

Antes no había una forma clara de manejar OCR ni borradores aprobables.

---

# Financia — Modelo de datos v2 (Appwrite)

Versión revisada a partir del diseño anterior de la base de datos financia_dev para cubrir:

Cuentas con banco e identificación de tarjeta (últimos 4 dígitos).

Tarjetas de crédito con fecha de corte y fecha límite de pago.

Consultas tipo “cuenta T” por periodo (ingresos, egresos y total).

Pagos recurrentes (servicios, suscripciones, renta, etc.).

Tickets con OCR que generan borradores hasta que el usuario confirma.

## 0. Tipos de datos usados (Appwrite)

String — con maxLength (y en algunos casos semántica adicional: hex, ISO, etc.).

Integer — con min y max cuando aplique.

Float — con min cuando aplique.

Boolean

Datetime

Enum

Relationship — con:

Dirección: one-way o “doble one-way” (equivalente a bidireccional).

Cardinalidad: one-to-one, one-to-many, many-to-one, many-to-many (lógica).

onDelete: cascade, restrict o setNull.

Los campos de sistema $id, $createdAt, $updatedAt no se definen como atributos.

## 1. Colección users_info — Perfil de usuario

### 1.1 Atributos

authUserId — String, required  
maxLength: 36  
ID del usuario de Appwrite Auth (user.$id).

username — String, optional  
maxLength: 32

firstName — String, optional  
maxLength: 80

lastName — String, optional  
maxLength: 80

country — String, optional  
maxLength: 2 (ISO-2, ej. MX)

defaultCurrency — String, required  
maxLength: 3, default MXN

language — String, required  
maxLength: 5, default es-MX

timezone — String, optional  
maxLength: 64

avatarFileId — String, optional  
ID de archivo en bucket de avatares.

onboardingDone — Boolean, required, default false

role — Enum, required  
valores: user, admin — default user

### 1.2 Relaciones y cardinalidad

No tiene Relationship hacia otras colecciones.  
Otras colecciones apuntan a users_info con relaciones many-to-one.

onDelete recomendado: cascade.

### 1.3 Índices

IDX_users_info_authUserId_unique — unique  
IDX_users_info_username_unique — unique  
IDX_users_info_role — key

### 1.4 Borrado

Borrado físico al borrar usuario en Auth.

---

## 2. Colección accounts — Cuentas y tarjetas

### 2.1 Atributos

profile — Relationship (users_info)  
name — String  
type — Enum(cash, debit, credit, savings, wallet, other)  
institution — String  
currency — String  
initialBalance — Float  
currentBalance — Float  
color — String  
icon — String

### Nuevos para tarjetas

cardLast4 — String(4)  
billingDay — Integer (1–31)  
dueDay — Integer (1–31)  
creditLimit — Float

isArchived — Boolean  
sortOrder — Integer

### 2.2 Relaciones

many-to-one → users_info  
onDelete: cascade

### 2.3 Índices

profile  
profile + isArchived  
profile + name (unique)  
profile + type

### 2.4 Borrado

Lógico con isArchived.

---

## 3. Colección categories — Categorías

### 3.1 Atributos

profile — Relationship optional  
name — String  
type — Enum  
color — String  
icon — String  
isDefault — Boolean  
isEnabled — Boolean  
sortOrder — Integer

### 3.2 Relaciones

many-to-one → users_info

### 3.3 Índices

profile + type + isEnabled  
profile + isDefault  
profile + name + type

### 3.4 Borrado

isEnabled = false.

---

## 4. Colección transactions — Movimientos

### 4.1 Atributos

profile — Relationship  
account — Relationship  
category — Relationship  
receipt — Relationship  
relatedTransaction — Relationship

type — Enum  
amount — Float  
currency — String  
date — Datetime  
description — String  
notes — String
installments — Integer (default: 1)

isPending — Boolean  
isTransferLeg — Boolean  
isDraft — Boolean  
origin — Enum(manual, recurring, ocr)  
isDeleted — Boolean

### 4.2 Relaciones

many-to-one hacia: users_info, accounts, categories, receipts.

### 4.3 Índices

profile + date  
profile + account + date  
profile + category + date  
profile + type + date  
receipt  
relatedTransaction  
profile + isDeleted

### 4.4 Borrado

Lógico: isDeleted.

---

## 5. Colección recurring_rules — Reglas de recurrencia

### 5.1 Atributos

profile — Relationship  
account — Relationship  
category — Relationship

name — String  
type — Enum  
amount — Float  
currency — String  
frequency — Enum  
interval — Integer  
startDate — Datetime  
endDate — Datetime  
nextRun — Datetime  
description — String  
autoConfirm — Boolean  
isActive — Boolean

### 5.2 Relaciones

many-to-one hacia perfil, cuenta, categoría

### 5.3 Índices

profile + isActive + nextRun  
account

---

## 6. Colección receipts — Tickets OCR

### 6.1 Atributos

profile — Relationship  
fileId — String  
status — Enum(uploaded, processing, processed, failed)  
ocrText — String  
detectedAmount — Float  
detectedDate — Datetime  
transaction — Relationship  
isDeleted — Boolean

### 6.2 Relaciones

many-to-one → users_info  
many-to-one → transactions

### 6.3 Índices

profile + status  
profile + transaction  
profile + isDeleted

---

## 7. Conclusión: ¿Ya está lista la BD?

Sí. Con esta estructura:

✔ Consultas por cuentas  
✔ Tarjetas con ciclos de facturación  
✔ “Cuenta T” por periodo  
✔ Pagos recurrentes reales  
✔ OCR con borradores confirmables

# 8. Plan de Implementación (Hoja de Ruta)

Este plan define los objetivos tangibles para migrar y completar la aplicación según el modelo v2 descrito anteriormente.

> **Instrucciones**: Marcar con una [x] cada casilla únicamente cuando la funcionalidad haya sido implementada en Appwrite Y verificada en el Frontend/Backend.

## Fase 1: Estructura de Usuarios y Cuentas

### 1.1 Colección `users_info`

- [ ] **Validar Atributos**: Verificar en Appwrite que existan: `authUserId`, `username`, `firstName`, `lastName`, `country`, `defaultCurrency`, `language`, `timezone`, `avatarFileId`, `onboardingDone`, `role`.
- [ ] **Índices**: Confirmar índices únicos para `authUserId` y `username`.

### 1.2 Colección `accounts` (Actualización Crítica)

- [ ] **Nuevos Atributos**: Agregar en Appwrite:
  - `institution` (String)
  - `cardLast4` (String)
  - `billingDay` (Int, 1-31)
  - `dueDay` (Int, 1-31)
  - `creditLimit` (Float)
  - `type` (Actualizar Enum: cash, debit, credit, savings, wallet, other)
- [ ] **Relaciones**: Asegurar Many-to-one con `users_info`.
- [ ] **Validación UI**: El formulario de "Nueva Cuenta" debe pedir datos bancarios si se selecciona "Tarjeta de Crédito".

## Fase 2: Categorización y Reglas

### 2.1 Colección `categories`

- [ ] **Creación**: Implementar colección con `name`, `type` (income/expense), `color`, `icon`, `isDefault`.
- [ ] **Índices**: `profile + type + isEnabled`.
- [ ] **Funcionalidad UI**: Pantalla para crear/editar categorías personalizadas.

### 2.2 Colección `recurring_rules` (Motor de Suscripciones)

- [ ] **Creación**: Implementar colección con `frequency` (daily, weekly, monthly, yearly), `interval`, `startDate`, `nextRun`.
- [ ] **Lógica**: Campo `autoConfirm` (Boolean).
- [ ] **Validación**: Crear una regla de prueba y verificar que se guarde con la fecha `nextRun` correcta.

## Fase 3: Transacciones y Consultas

### 3.1 Colección `transactions`

- [ ] **Atributos de Control**: Agregar `isDraft`, `isTransferLeg`, `origin` (manual, recurring, ocr).
- [ ] **Relaciones Completas**: Verificar conexiones con `account`, `category` y `receipt`.
- [ ] **Índices de Consulta**: Crear índices compuestos `profile + date`, `profile + account + date` para reportes rápidos.

### 3.2 Reportes ("Cuenta T")

- [ ] **Backend**: Verificar consultas para obtener sumas de ingresos/egresos por rango de fechas.
- [ ] **UI**: Vista de "Movimientos" que muestre totales del periodo seleccionado.

## Fase 4: Integración OCR y Tickets

### 4.1 Colección `receipts`

- [ ] **Estados OCR**: Implementar Enum `status` (uploaded, processing, processed, failed).
- [ ] **Detección**: Campos `ocrText`, `detectedAmount`, `detectedDate`.
- [ ] **Enlace**: Relación con `transactions`.
