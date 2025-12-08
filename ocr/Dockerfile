FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1

# Instalar Tesseract OCR y dependencias del sistema
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && sed -i "s/print(f'Warning: {warning}', file=sys.stderr)/pass/" /usr/local/lib/python3.9/site-packages/appwrite/client.py

# Copiar el código
COPY main.py .

# Ejecutar el script
CMD ["python", "main.py"]
