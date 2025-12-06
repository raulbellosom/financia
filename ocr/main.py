import os
import time
import requests
from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
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

tables_db = TablesDB(client)
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
        tables_db.update_row(
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
            print("Buscando recibos pendientes...")
            # Buscar recibos pendientes
            response = tables_db.list_rows(
                DATABASE_ID,
                RECEIPTS_COLLECTION_ID,
                [Query.equal('status', 'uploaded')]
            )

            if response['rows']:
                print(f"Encontrados {len(response['rows'])} recibos pendientes.")
                for receipt in response['rows']:
                    process_receipt(receipt)
            else:
                print("No hay recibos pendientes. Esperando...")

        except Exception as e:
            print(f"Error en el ciclo principal: {e}")

        time.sleep(60) # Esperar 1 minuto antes de buscar de nuevo

if __name__ == "__main__":
    main()
