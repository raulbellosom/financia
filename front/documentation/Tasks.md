1. Dashboard: dinero disponible y crédito total
   Objetivo

Como usuario, quiero ver cuánto dinero tengo disponible (a favor) y cuánto crédito total tengo (límites y/o deuda), para entender mi posición financiera al instante.

Definiciones (reglas de negocio)

Disponible (cash/debit/wallet/savings/investment): suma de currentBalance de cuentas no archivadas y que no son type=credit.

Crédito total:

Opción A (límites): suma de creditLimit de cuentas type=credit.

Opción B (deuda actual): sumar la deuda estimada de tarjetas (si manejas tarjetas como balance “negativo”, entonces deuda = abs(currentBalance) cuando sea < 0; si lo manejas como positivo, deuda = currentBalance).

Debe considerar currency (si mezclas monedas, mostrar por moneda o convertir con tipo de cambio).

UI / UX

Cards en dashboard:

“Disponible”

“Crédito total”

“Deuda total (tarjetas)” (opcional)

“Patrimonio neto” = disponible − deuda (opcional)

Appwrite / Datos

Ya tienes en accounts: type, currentBalance, isArchived, creditLimit, currency.

Financia_DB_Appwrite_Console_v2…

Recomendación (sin cambios de BD): calcular en frontend con queries:

accounts filtrando por profile + isArchived=false.

Financia_DB_Appwrite_Console_v2…

Criterios de aceptación

Debe reflejar cambios inmediatamente al crear/editar transacciones y/o editar saldo inicial.

No debe incluir cuentas archivadas.

2. MSI: progreso de pago por deudas a meses
   Objetivo

Como usuario, quiero ver una pestaña con el progreso de mis compras a MSI, para saber cuánto me falta por pagar, cuánto ya pagué y en qué mes voy.

Problema actual

En tu BD actual solo existe Installments en transactions

Financia_DB_Appwrite_Console_v2…

, pero eso no alcanza para:

identificar una compra MSI como “plan”

controlar pagos parciales

mostrar calendario de mensualidades

relacionar varios pagos a una misma compra

Cambio necesario (Appwrite)

Nueva colección: installment_plans (MSI)

profile (rel a users_info, required, cascade)

account (rel a accounts, required, cascade) → tarjeta donde está el MSI

title (string 120, required) → “TV Samsung”

principalAmount (double, required) → monto total de la compra

currency (string 3, required)

installmentsTotal (int, required) → 3/6/12/18…

installmentsPaid (int, required) → contador (se mantiene por app/function)

monthlyAmount (double, required) → sugerido (principal/installmentsTotal) o editable

startDate (datetime, required)

nextDueDate (datetime, required)

status (enum: active, paid, cancelled, required)

notes (string 1500, optional)

isDeleted (boolean, required)

Cambios en transactions:

Agregar installmentPlan (relationship optional → installment_plans, onDelete set null)

Agregar installmentNumber (int optional) → # de mensualidad pagada (1..N)

(Opcional) isInstallmentPayment (boolean required) si quieres simplificar filtros

Mantén tu campo Installments solo si lo usas para “compra con N meses”, pero el seguimiento real debe vivir en installment_plans.

Financia_DB_Appwrite_Console_v2…

Flujo funcional

Crear “Plan MSI” desde:

una compra (transacción expense origin=manual/ocr)

o directamente desde “MSI”

Generación de pagos:

Opción A: el usuario crea cada pago mensual manualmente y lo liga al plan

Opción B: recurring_rules genera pagos mensuales ligados al plan (si se activa autoConfirm)

UI

Tab “MSI”

Lista de planes activos con:

progreso (barra): installmentsPaid / installmentsTotal

restante ($): principalAmount - sum(pagos)

próximo pago: nextDueDate

Detalle: historial de pagos ligados

Criterios de aceptación

Un plan puede existir aunque aún no tenga pagos.

Al registrar un pago ligado al plan:

incrementa installmentsPaid

recalcula nextDueDate si aplica

si ya pagó todo → status paid

3. Editar saldo inicial
   Objetivo

Como usuario, quiero editar el saldo inicial de una cuenta sin romper mi historial.

Decisión de negocio (importante)

Tienes 2 opciones:

Opción A (recomendada): cambiar initialBalance y recalcular currentBalance

currentBalance = initialBalance + sum(incomes) - sum(expenses) (por cuenta)

Pros: consistente

Contras: requiere recalcular (frontend o function)

Opción B: permitir editar initialBalance y ajustar currentBalance con delta

Pros: rápido

Contras: puedes perder consistencia si hubo errores previos

Appwrite

Sin nuevos campos. Ya existen initialBalance y currentBalance.

Financia_DB_Appwrite_Console_v2…

Criterios de aceptación

Al guardar, el dashboard debe reflejar el cambio.

No debe afectar transacciones históricas (solo el balance total).

4. Filtrar categorías según ingreso/egreso al crear transacción
   Objetivo

Como usuario, cuando selecciono el tipo (income o expense) quiero ver solo categorías compatibles.

Reglas

Si type=income → categorías type=income

Si type=expense → categorías type=expense

Si type=transfer → categorías type=transfer (o ninguna)

Appwrite

Ya existe categories.type enum (income|expense|transfer).

Financia_DB_Appwrite_Console_v2…

Criterios de aceptación

Cambiar el tipo debe limpiar la categoría si ya no es compatible.

El buscador de categorías debe filtrar por profile y isEnabled=true.

5. Nuevo tipo de movimiento: traspaso entre cuentas (doble pierna)
   Objetivo

Como usuario, quiero hacer un traspaso entre dos cuentas y que se creen automáticamente:

un egreso en cuenta origen

un ingreso en cuenta destino
ambos ligados para poder auditarlos.

Situación actual

transactions.type ya tiene transfer

Financia_DB_Appwrite_Console_v2…

, pero necesitas modelo consistente para “dos piernas”.

Cambios necesarios

En transactions:

Agregar transferGroupId (string 36/64) para ligar ambas piernas (porque Appwrite Console no facilita self-relations y tú no quieres eso).

Agregar transferSide (enum: out, in) para saber si es salida o entrada.

(Opcional) fromAccount / toAccount relationships solo si Appwrite te deja y tú lo aceptas; si no, con transferGroupId basta.

Flujo

Form “Traspaso” pide:

cuenta origen

cuenta destino

monto

fecha

nota

Acción: crear 2 documentos transactions:

(out) account=origen, type=transfer, transferSide=out, amount=monto

(in) account=destino, type=transfer, transferSide=in, amount=monto

ambos con mismo transferGroupId

ambos con isTransferLeg=true (ya lo tienes)

Financia_DB_Appwrite_Console_v2…

Criterios de aceptación

En el historial de cuenta origen debe verse como salida.

En cuenta destino como entrada.

Debe poder eliminarse “el traspaso” como conjunto (borrado lógico en ambos).

6. No se calculan egresos si no tienen categoría
   Objetivo

Que los cálculos de egresos/ingresos no dependan de categoría.

Regla

Para totales:

expense suma por type, independiente de si category es null (en tu BD la relación puede ser null)

Financia_DB_Appwrite_Console_v2…

Fix esperado

En los agregados/queries:

filtrar por type

NO filtrar por category salvo que el usuario lo pida

Criterios de aceptación

Un gasto sin categoría aparece en totales del mes.

En reportes por categoría, esos gastos entran en “Sin categoría”.

Cambio opcional de Appwrite

Agregar uncategorized category default (por usuario) y asignarla automáticamente cuando category=null. (No es obligatorio, pero mejora UX.)

7. Inputs de dinero con formato moneda
   Objetivo

Todos los inputs de monto deben:

aceptar números fácil (teclado numérico en móvil)

mostrar formato moneda (MXN, separadores, 2 decimales)

guardar en BD como double limpio (sin comas)

Reglas

Mostrar: 1,234.50

Guardar: 1234.5

Respetar currency (por cuenta)

Criterios de aceptación

Al escribir, no “salta” el cursor.

Valida > 0 donde aplique.

8. Más colores personalizados más básicos
   Objetivo

Mejorar paleta UI para cuentas/categorías (más “básicos”, menos saturados o más consistentes).

Appwrite

Sin cambios obligatorios: ya tienes accounts.color y categories.color.

Financia_DB_Appwrite_Console_v2…

Extra recomendado

Definir theme/uiSettings en users_info:

preferredPalette (enum/string) o accentColor

(Opcional) darkMode (enum: system/light/dark)

9. Continuar con notificaciones + alarmas personalizadas
   Objetivo

Mantener notificaciones actuales

Agregar alarmas personalizadas (recordatorios por cosas como: pago tarjeta, MSI, suscripción, etc.)

Cambios necesarios (Appwrite)

Nueva colección: alarms

profile (rel users_info, required)

title (string 120, required)

description (string 1500, optional)

triggerAt (datetime, required) → cuándo disparar

timezone (string 80, optional; si no, usar users_info.timezone)

Financia_DB_Appwrite_Console_v2…

repeat (enum: none, daily, weekly, monthly, yearly, custom)

repeatInterval (int optional)

channel (enum: push, email, both)

status (enum: active, sent, cancelled)

relatedType (enum optional: installment_plan, recurring_rule, account, transaction)

relatedId (string optional)

isDeleted (boolean required)

Ejecución (sin “backend” tradicional)

Function programada (cron) que consulta alarms por:

status=active y triggerAt <= now

envía notificación (push/email) y marca sent o recalcula siguiente.

Criterios de aceptación

Crear alarma manual con fecha/hora.

Ver lista de alarmas activas.

Que se respete timezone.

10. Login: bloquear si no hay verificación de email / users_info (y reenvío si expiró)
    Objetivo

Evitar que haya sesión “útil” si:

el usuario no verificó email

o no existe users_info

o users_info.verified_email=false

Financia_DB_Appwrite_Console_v2…

Reglas de flujo

Registro

Tras registrarse:

NO redirigir a login

Mostrar pantalla fija: “Revisa tu correo para verificar (incluye No deseados)”

Guardar estado local: “verificationPending”

Login

Si auth OK pero:

no existe users_info → bloquear y disparar reparación (function) para crearlo

verified_email=false → bloquear y mostrar modal:

“¿Reenviar correo de verificación?”

Botón reenviar (y manejar throttling)

Cambios en Appwrite

Ya tienes users_info.verified_email boolean required.

Financia_DB_Appwrite_Console_v2…

Recomendado agregar en users_info:

verificationEmailSentAt (datetime optional) para rate-limit UI

email (string/email optional) si quieres no depender del Auth para mostrarlo

Backend/Functions (clave)

Function ensureUserInfoOnLogin:

si no existe users_info para authUserId, lo crea con defaults (y verified_email=false)

Function resendVerificationEmail:

reenvía correo si:

no verificado

y no ha rebasado límite (ej: 1 cada 2 minutos)

Criterios de aceptación

No existe forma de usar la app (dashboard) si no está verificado.

Si expiró el correo, el modal permite reenviar y confirma éxito/fracaso.

11. Editar el valor y título de una transacción
    Objetivo

Poder editar:

amount

description (tu “título”/concepto)

Financia_DB_Appwrite_Console_v2…

Reglas

Al editar monto:

debe recalcular balances (al menos de la cuenta afectada)

Si la transacción está ligada a MSI, transfer, recurring u OCR:

respetar reglas:

Si es “pierna de transfer”: al editar monto en una pierna, debe sincronizar la otra (por transferGroupId)

Si es pago MSI: puede afectar progreso del plan

Criterios de aceptación

Al guardar edición, totales y dashboard se actualizan.

12. OCR: el monto detectado se reemplaza por el monto real al crear transacción desde OCR
    Objetivo

Cuando un receipt trae detectedAmount, al confirmar la transacción:

el usuario puede ajustar el monto

y el sistema debe guardar el monto final en transactions.amount

y conservar evidencia del detectado

Cambios necesarios

En tu BD actual receipts.detectedAmount existe

Financia_DB_Appwrite_Console_v2…

y transactions.origin incluye ocr

Financia_DB_Appwrite_Console_v2…

, pero te falta trazabilidad.

Agregar en transactions:

ocrDetectedAmount (double optional)

ocrConfidence (double optional) si lo calculas

ocrRawTextSnapshot (string optional, tamaño pequeño) si quieres guardar un extracto

(o alternativamente guardar eso en receipts y solo linkear)

Flujo

Receipt procesado (receipts.status=processed)

UI “Crear transacción desde ticket”:

precarga amount = detectedAmount

al guardar:

transactions.amount = monto_confirmado_usuario

transactions.ocrDetectedAmount = receipts.detectedAmount

link transactions.receipt = receiptId

opcional: actualizar receipt con transaction relación (ya existe)

Financia_DB_Appwrite_Console_v2…

Criterios de aceptación

Siempre se guarda el monto final del usuario.

Se puede ver “Detectado vs Confirmado”.

Resumen de cambios de Appwrite propuestos (para que los anotes)

Nueva colección installment_plans (MSI).

En transactions: installmentPlan, installmentNumber, transferGroupId, transferSide, ocrDetectedAmount (y opcionales).

Nueva colección alarms.

En users_info: opcional verificationEmailSentAt (+ opcional email).

Todo lo anterior es compatible con tu enfoque de solo Console y sin self-relations (usando IDs de agrupación como string).
