# Guía de Implementación del Servicio OCR en VPS

Esta guía detalla los pasos para configurar un servicio de "backend" en tu VPS que se encargue de leer los tickets subidos a Appwrite, extraer la información y actualizar la base de datos.

## Arquitectura

1.  **Appwrite (Base de Datos y Storage):** Almacena las imágenes de los tickets y los datos de las transacciones.
2.  **Script OCR (Python):** Se ejecuta en tu VPS.
    - Consulta Appwrite buscando recibos con estado `uploaded`.
    - Descarga la imagen.
    - Usa una librería OCR (como Tesseract) o una API (OpenAI/Google Vision) para leer el texto.
    - Extrae fecha, monto y comercio.
    - Actualiza el documento en Appwrite con los datos y cambia el estado a `processed`.

---

## Opción A: Usando Docker (Recomendada)

Esta opción es la más limpia ya que encapsula todas las dependencias (Python, Tesseract, etc.) en un contenedor.

### 1. Estructura del Proyecto en tu VPS

Crea una carpeta en tu VPS, por ejemplo `financia-ocr`:

```bash
mkdir financia-ocr
cd financia-ocr
```

### 2. Crear el Script Python (`main.py`)

Crea un archivo `main.py` con el siguiente contenido base. **Nota:** Necesitarás ajustar los IDs de tus colecciones y la lógica de extracción según tus necesidades.

```python
import os
import time
import requests
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.query import Query
import pytesseract
from PIL import Image
from io import BytesIO

# Configuración
ENDPOINT = os.getenv('APPWRITE_ENDPOINT')
PROJECT_ID = os.getenv('APPWRITE_PROJECT_ID')
API_KEY = os.getenv('APPWRITE_API_KEY')
DATABASE_ID = os.getenv('APPWRITE_DATABASE_ID')
RECEIPTS_COLLECTION_ID = os.getenv('APPWRITE_RECEIPTS_COLLECTION_ID')
BUCKET_ID = os.getenv('APPWRITE_RECEIPTS_BUCKET_ID')

# Inicializar Appwrite
client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)
storage = Storage(client)

def process_receipt(receipt):
    print(f"Procesando recibo: {receipt['$id']}")

    try:
        # 1. Descargar imagen
        result = storage.get_file_download(BUCKET_ID, receipt['fileId'])
        image = Image.open(BytesIO(result))

        # 2. Aplicar OCR
        text = pytesseract.image_to_string(image)
        print(f"Texto extraído: {text[:50]}...") # Mostrar primeros 50 caracteres

        # 3. Analizar texto (Aquí va tu lógica inteligente o llamada a GPT)
        # Ejemplo simple: buscar un monto con regex
        # amount = extract_amount(text)
        # date = extract_date(text)

        # Por ahora simulamos datos
        extracted_data = {
            'status': 'processed',
            'ocrText': text,
            # 'amount': 100.00, # Descomentar cuando tengas la lógica
        }

        # 4. Actualizar documento
        databases.update_document(
            DATABASE_ID,
            RECEIPTS_COLLECTION_ID,
            receipt['$id'],
            extracted_data
        )
        print(f"Recibo {receipt['$id']} actualizado correctamente.")

    except Exception as e:
        print(f"Error procesando recibo {receipt['$id']}: {e}")
        # Opcional: Marcar como error en la BD
        # databases.update_document(DATABASE_ID, RECEIPTS_COLLECTION_ID, receipt['$id'], {'status': 'error'})

def main():
    print("Iniciando servicio OCR...")
    while True:
        try:
            # Buscar recibos pendientes
            response = databases.list_documents(
                DATABASE_ID,
                RECEIPTS_COLLECTION_ID,
                [Query.equal('status', 'uploaded')]
            )

            if response['documents']:
                for receipt in response['documents']:
                    process_receipt(receipt)
            else:
                print("No hay recibos pendientes. Esperando...")

        except Exception as e:
            print(f"Error en el ciclo principal: {e}")

        time.sleep(60) # Esperar 1 minuto antes de buscar de nuevo

if __name__ == "__main__":
    main()
```

### 3. Crear `Dockerfile`

Crea un archivo llamado `Dockerfile` (sin extensión):

```dockerfile
FROM python:3.9-slim

# Instalar Tesseract OCR y dependencias del sistema
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código
COPY main.py .

# Ejecutar el script
CMD ["python", "main.py"]
```

### 4. Crear `requirements.txt`

```text
appwrite
pytesseract
Pillow
requests
```

### 5. Construir y Correr el Contenedor

1.  Construye la imagen:

    ```bash
    docker build -t financia-ocr .
    ```

2.  Ejecuta el contenedor (asegúrate de pasar las variables de entorno):
    ```bash
    docker run -d \
      --name financia-ocr-service \
      --restart unless-stopped \
      -e APPWRITE_ENDPOINT="https://appwrite.racoondevs.com/v1" \
      -e APPWRITE_PROJECT_ID="TU_PROJECT_ID" \
      -e APPWRITE_API_KEY="TU_API_KEY_SECRETA" \
      -e APPWRITE_DATABASE_ID="TU_DATABASE_ID" \
      -e APPWRITE_RECEIPTS_COLLECTION_ID="TU_COLLECTION_ID" \
      -e APPWRITE_RECEIPTS_BUCKET_ID="TU_BUCKET_ID" \
      financia-ocr
    ```

---

## Opción B: Usando PM2 (Node.js o Python directo)

Si prefieres correrlo directamente en el host y gestionarlo con PM2.

1.  **Instalar dependencias del sistema:**

    ```bash
    sudo apt-get update
    sudo apt-get install tesseract-ocr
    ```

2.  **Preparar entorno Python:**

    ```bash
    cd financia-ocr
    python3 -m venv venv
    source venv/bin/activate
    pip install appwrite pytesseract Pillow requests
    ```

3.  **Crear archivo `ecosystem.config.js` para PM2:**

    ```javascript
    module.exports = {
      apps: [
        {
          name: "financia-ocr",
          script: "./main.py",
          interpreter: "./venv/bin/python",
          env: {
            APPWRITE_ENDPOINT: "https://appwrite.racoondevs.com/v1",
            APPWRITE_PROJECT_ID: "TU_PROJECT_ID",
            APPWRITE_API_KEY: "TU_API_KEY_SECRETA",
            // ... resto de variables
          },
        },
      ],
    };
    ```

4.  **Iniciar con PM2:**
    ```bash
    pm2 start ecosystem.config.js
    pm2 save
    ```

## Notas Importantes

- **API Key:** Necesitas generar una API Key en tu consola de Appwrite con permisos de lectura y escritura sobre la base de datos y el storage.
- **Mejora del OCR:** Tesseract es básico. Para mejores resultados (especialmente con tickets arrugados o complejos), considera usar la API de OpenAI (GPT-4 Vision) enviándole la imagen. El costo es bajo y la precisión es muy superior.
