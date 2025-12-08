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

## (Contenido completo del modelo de datos)
A continuación está el archivo **COMPLETO**, actualizado y combinado con la descripción de los cambios y el nuevo esquema:

------------------------------------------

# Financia — Modelo de datos v2 (Appwrite)
(… aquí iría TODO el contenido que te entregue en la respuesta anterior …)

------------------------------------------

