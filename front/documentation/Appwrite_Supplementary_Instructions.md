# Appwrite — Instrucciones Suplementarias

Este documento complementa `Appwrite_Schema_Changes.md` con detalles menores identificados durante el plan de implementación.

## 1. Categories: "Sin Categoría"

Para mejorar el soporte de gastos sin categoría (Task 6):

- **No crear categoría "Uncategorized" en base de datos.**
- Mantenemos la pureza de los datos: si `category` es `null` (o el relationship está vacío), significa que el usuario no asignó categoría.
- **Frontend**: En los reportes y listados, si `category` es `null`, agrupar bajo el label "Sin Categoría" (o "Uncategorized") visualmente. El código de reportes ya maneja esto agrupando nulos bajo un ID local.

## 2. Sync Email (Auth -> Users Info)

Requerimiento: El campo `email` en `users_info` debe mantenerse sincronizado con Appwrite Auth.

- **Frontend**: Al registro (`AuthContext.jsx`), guardamos el email inicial.
- **Backend (Functions)**: Se recomienda una función disparada por eventos de Auth (`users.update.email`) para actualizar `users_info`. Ver `Appwrite_Functions_Instructions.md`.
