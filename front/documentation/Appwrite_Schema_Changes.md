# Appwrite — Cambios de esquema necesarios (Tasks.md)

Este documento resume **todo lo que hay que crear/agregar en Appwrite** (collections/campos) para completar las tareas que **sí requieren cambios de BD**.

> Nota: está alineado con [front/documentation/Tasks.md](Tasks.md). Donde Appwrite Console no facilita self-relations, se usan **IDs de agrupación (string)** como se propone en Tasks.

## 1) Cambios en `transactions` (MSI y Traspasos)

### Proposito (MSI)

En lugar de una colección separada, usaremos la misma tabla `transactions` para registrar la "Compra Maestra" (el plan MSI).

### Campos nuevos

- `installments` (integer, **required**, default: 1) — Total de mensualidades. Si es `> 1` es una compra a meses.
- `installmentsPaid` (integer, optional) — Cuantas se han pagado. Default app: 0.
- `originalAmount` (double, optional) — Monto total de la deuda (útil si el `amount` principal solo refleja el pago mensual o si variará). _Recomendación: Usar `amount` como el total de la deuda y crear transacciones hijas para los pagos._

### Campos nuevos (Traspasos)

- `transferGroupId` (string, **required solo si** `type=transfer`) — UUID/ULID para ligar las dos piernas
- `transferSide` (enum string, **required solo si** `type=transfer`) — `out | in`

### Campos nuevos (OCR)

- `ocrDetectedAmount` (double, optional)
- `ocrConfidence` (double, optional)

### Índices sugeridos (`transactions`)

- `(profile, installments)` para filtrar planes MSI activos.
- `(profile, transferGroupId)` para traspasos.

## 3) Nueva colección: `alarms`

**Propósito:** recordatorios/alertas (pagos, cortes, etc.) con (opcional) ejecución programada.

### Campos

- `profile` (relationship -> `users_info`, **required**, onDelete: cascade)
- `title` (string, **required**, max 120)
- `description` (string, optional, max 1500)
- `type` (enum string, **required**) — por ejemplo: `reminder | bill | payment | custom`
- `dueDate` (datetime, **required**)
- `timezone` (string, **required**) — para disparos correctos
- `status` (enum string, **required**) — `pending | fired | cancelled`
- `channel` (enum array, optional ) — `push | email | inApp` (según lo que implementes) puedes agregar más si lo deseas
- `isDeleted` (boolean, **required**)
- `relatedAccount` (relationship -> `accounts`, optional)
- `relatedTransaction` (relationship -> `transactions`, optional)

### Índices sugeridos

- `(profile, status, dueDate)` para cron
- `(profile, dueDate)` para calendario

### Permisos sugeridos

- Document-level: read/write solo al owner

## 4) Cambios opcionales en `users_info` (verificación)

Si quieres tener trazabilidad/anti-spam desde BD:

- `verificationEmailSentAt` (datetime, optional)
- `email` (string, optional) — si quieres duplicarlo del Auth para consultas simples
- `preferredPalette` (enum, optional) — Valores: `'vivid'` (default), `'pastel'`, `'dark'`.
- `darkMode` (enum, optional) — Valores: `'system'` (default), `'light'`, `'dark'`.

## 5) Notas de migración / defaults

- Para campos nuevos en `transactions`:
  - No hagas required global si ya tienes docs históricos.
  - Para traspasos: required “por convención” (validación en app) y opcional en esquema si Appwrite no permite required condicional.
- Para `installment_plans.installmentsPaid`: default `0`.
- Para `isDeleted`: default `false`.
