import os
import time
import re
from datetime import datetime
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.services.storage import Storage
from appwrite.query import Query
from appwrite.id import ID
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
from io import BytesIO

# Configuración
ENDPOINT = os.getenv('APPWRITE_ENDPOINT')
PROJECT_ID = os.getenv('APPWRITE_PROJECT_ID')
API_KEY = os.getenv('APPWRITE_API_KEY')
DATABASE_ID = os.getenv('APPWRITE_DATABASE_ID')
RECEIPTS_COLLECTION_ID = os.getenv('APPWRITE_RECEIPTS_COLLECTION_ID')
TRANSACTIONS_COLLECTION_ID = os.getenv('APPWRITE_TRANSACTIONS_COLLECTION_ID')
BUCKET_ID = os.getenv('APPWRITE_RECEIPTS_BUCKET_ID')

# Inicializar Appwrite
client = Client()
client.set_endpoint(ENDPOINT)
client.set_project(PROJECT_ID)
client.set_key(API_KEY)

databases = Databases(client)
storage = Storage(client)


def preprocess_image(image):
    """
    Preprocess image to improve OCR accuracy.
    """
    # Convert to grayscale
    img = image.convert('L')
    
    # Resize if too small (width < 1500) - larger size for better OCR
    width, height = img.size
    if width < 1500:
        ratio = 1500.0 / width
        new_height = int(height * ratio)
        img = img.resize((1500, new_height), Image.Resampling.LANCZOS)
    
    # Increase contrast more aggressively
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.5)
    
    # Increase sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(2.0)
    
    # Apply adaptive thresholding for better text detection
    # This helps with receipts that have varying lighting
    import numpy as np
    from PIL import ImageOps
    
    # Convert to numpy array for processing
    img_array = np.array(img)
    
    # Apply binary threshold
    threshold = np.mean(img_array)
    img_array = np.where(img_array > threshold, 255, 0).astype(np.uint8)
    
    img = Image.fromarray(img_array)
    
    return img


def extract_amount(text):
    """
    Extract monetary amount from OCR text using regex patterns.
    Returns the detected amount as float or None if not found.
    """
    if not text:
        return None
    
    # Clean text to improve matching (remove excessive whitespace)
    text_cleaned = re.sub(r'\s+', ' ', text)
    
    # Patterns to match common receipt amount formats
    # Priority order: most specific to least specific
    # Made more flexible to handle OCR errors
    patterns = [
        # Total Contado with flexible spacing (handles "Total Cc ., e ontado")
        # Matches: Total Contado, Total C ontado, Total Cc ontado, etc.
        (r'total[\s.,;:]*c+[\s.,;:]*[oe0]*[\s.,;:]*[no]*[\s.,;:]*t+[\s.,;:]*a+[\s.,;:]*d+[\s.,;:]*o+[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'total_contado_fuzzy'),
        # Pago con Tarjeta with flexible spacing
        (r'pago[\s.,;:]*con[\s.,;:]*tarjeta[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'pago_tarjeta'),
        # Total Contado (strict)
        (r'total\s+contado[:\s]*\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'total_contado'),
        # Total: $ 123.45 or Total $ 123.45
        (r'(?:total|tota[l1!|])[:\s]+\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'total'),
        # Neto $ 77.60 or Net $ 123.45
        (r'(?:neto|net)[:\s]+\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'neto'),
        # Importe: $123.45 (Spanish)
        (r'importe[:\s]+\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'importe'),
        # Subtotal: $123.45
        (r'subtotal[:\s]+\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'subtotal'),
        # Amount on its own line after "Total" keyword (more flexible)
        (r'total[\s.,;:]*\n+[\s.,;:]*\$?\s*(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})', 'total_newline'),
        # Large amount at end of text (likely the total) - last resort
        (r'(\d{1,3}[.,]\d{3}[.,]\d{2})\s*$', 'large_amount_end'),
    ]
    
    for pattern, pattern_name in patterns:
        matches = re.findall(pattern, text_cleaned, re.IGNORECASE | re.MULTILINE)
        if matches:
            print(f"Pattern '{pattern_name}' found {len(matches)} match(es): {matches}")
            # Take the last match (usually the total is at the bottom)
            amount_str = matches[-1].strip()
            
            # Parse Spanish/Mexican number format
            # In Spanish: 2,901.00 means two thousand nine hundred one
            # Comma is thousands separator, period is decimal separator
            
            # Determine if comma or period is decimal separator
            # Rule: Last separator is decimal, others are thousands
            amount_str = amount_str.replace(' ', '')
            
            # Find last separator
            last_comma = amount_str.rfind(',')
            last_period = amount_str.rfind('.')
            
            if last_comma > last_period:
                # Comma is decimal separator (European format: 2.901,00)
                amount_str = amount_str.replace('.', '').replace(',', '.')
            else:
                # Period is decimal separator (US/Mexican format: 2,901.00)
                amount_str = amount_str.replace(',', '')
            
            try:
                amount = float(amount_str)
                # Sanity check: amount should be between 0.01 and 999999.99
                if 0.01 <= amount <= 999999.99:
                    print(f"✓ Amount detected: {amount} (pattern: {pattern_name})")
                    return amount
                else:
                    print(f"✗ Amount {amount} out of range (pattern: {pattern_name})")
            except ValueError as e:
                print(f"✗ Error parsing amount '{amount_str}': {e}")
                continue
    
    print("✗ No amount detected with any pattern")
    return None


def extract_date(text):
    """
    Extract date from OCR text using regex patterns.
    Returns ISO format date string or None if not found.
    """
    if not text:
        return None
    
    # Spanish month mapping
    months_es = {
        'ENE': '01', 'FEB': '02', 'MAR': '03', 'ABR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AGO': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DIC': '12'
    }
    
    # Common date patterns
    patterns = [
        # MM/DD/YYYY or DD/MM/YYYY
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})', ['%m/%d/%Y', '%d/%m/%Y']),
        # YYYY-MM-DD or YYYY/MM/DD
        (r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', ['%Y-%m-%d', '%Y/%m/%d']),
        # MM/DD/YY or DD/MM/YY
        (r'(\d{1,2})[/-](\d{1,2})[/-](\d{2})', ['%m/%d/%y', '%d/%m/%y']),
        # DD-MMM-YY (Spanish) e.g. 5-DIC-25
        (r'(\d{1,2})[-.\s]+([A-Z]{3})[-.\s]+(\d{2,4})', 'spanish_month'),
    ]
    
    for pattern, formats in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            # Try the first match
            if formats == 'spanish_month':
                day, month_str, year = matches[0]
                month_str = month_str.upper()
                # Handle OCR errors in month names (e.g. D1C -> DIC)
                if month_str not in months_es:
                    # Simple fuzzy fix for common errors
                    if 'D' in month_str and 'C' in month_str: month_str = 'DIC'
                    elif 'E' in month_str and 'N' in month_str: month_str = 'ENE'
                
                if month_str in months_es:
                    month = months_es[month_str]
                    if len(year) == 2:
                        year = '20' + year
                    try:
                        parsed_date = datetime(int(year), int(month), int(day))
                        if datetime(2000, 1, 1) <= parsed_date <= datetime.now():
                            return parsed_date.isoformat()
                    except ValueError:
                        continue
            else:
                date_str = '/'.join(matches[0]) if isinstance(matches[0], tuple) else matches[0]
                
                for fmt in formats:
                    try:
                        parsed_date = datetime.strptime(date_str, fmt)
                        # Sanity check: date should be within reasonable range
                        if datetime(2000, 1, 1) <= parsed_date <= datetime.now():
                            return parsed_date.isoformat()
                    except ValueError:
                        continue
    
    # If no date found, return current date
    return datetime.now().isoformat()


def extract_merchant(text):
    """
    Extract merchant name from OCR text.
    Usually the first non-empty line is the merchant name.
    Returns merchant name or None if not found.
    """
    if not text:
        return None
    
    lines = text.strip().split('\n')
    for line in lines:
        cleaned = line.strip()
        # Skip very short lines or lines that look like dates/amounts
        if len(cleaned) > 3 and not re.match(r'^\d+[.,/\-\s]*\d*$', cleaned):
            # Return first meaningful line, limited to 200 chars
            return cleaned[:200]
    
    return None


def calculate_confidence(amount, date, merchant, text_length):
    """
    Calculate confidence score based on detected fields.
    Returns a float between 0.0 and 1.0.
    """
    score = 0.0
    
    # Amount is most important (50%)
    if amount is not None:
        score += 0.5
    
    # Date is important (30%)
    if date is not None:
        score += 0.3
    
    # Merchant name (10%)
    if merchant is not None:
        score += 0.1
    
    # Text length indicates OCR quality (10%)
    if text_length > 50:
        score += 0.1
    elif text_length > 20:
        score += 0.05
    
    return min(score, 1.0)


def create_draft_transaction(receipt, amount, date, merchant, profile_id):
    """
    Create a draft transaction from OCR data.
    Returns the created transaction or None if failed.
    """
    if amount is None:
        print("No amount detected, skipping draft transaction creation")
        return None

    if not TRANSACTIONS_COLLECTION_ID:
        print("ERROR: APPWRITE_TRANSACTIONS_COLLECTION_ID is not set. Cannot create transaction.")
        return None
    
    try:
        # Prepare description with merchant and amount
        description = f"Receipt from OCR"
        if merchant:
            description = f"{merchant} - ${amount:.2f}"
        
        transaction_data = {
            'profile': profile_id,
            'receipt': receipt['$id'],
            'amount': amount,
            'date': date or datetime.now().isoformat(),
            'type': 'expense',  # Receipts are typically expenses
            'description': description,
            'isDraft': True,
            'origin': 'ocr',
            'isTransferLeg': False,
            'isPending': False,
            'isDeleted': False,
        }
        
        transaction = databases.create_document(
            DATABASE_ID,
            TRANSACTIONS_COLLECTION_ID,
            ID.unique(),
            transaction_data
        )
        
        print(f"Draft transaction created: {transaction['$id']}")
        return transaction
    
    except Exception as e:
        print(f"Error creating draft transaction: {e}")
        return None


def process_receipt(receipt):
    """
    Process a receipt: extract text, detect fields, create draft transaction.
    """
    print(f"Procesando recibo: {receipt['$id']}")
    
    try:
        # 1. Update status to 'processing'
        databases.update_document(
            DATABASE_ID,
            RECEIPTS_COLLECTION_ID,
            receipt['$id'],
            {'status': 'processing'}
        )
        
        # 2. Download image
        result = storage.get_file_download(BUCKET_ID, receipt['fileId'])
        image = Image.open(BytesIO(result))
        
        # 3. Apply OCR with Spanish language support
        # Preprocess image for better accuracy
        processed_image = preprocess_image(image)
        
        # Configure Tesseract for Spanish and receipt format
        # PSM 6: Assume a single uniform block of text (good for receipts)
        custom_config = r'--oem 3 --psm 6'
        
        # Try with Spanish language first
        text = pytesseract.image_to_string(processed_image, lang='spa', config=custom_config)
        
        # If text is too short, try with both Spanish and English
        if len(text) < 50:
            print("Texto procesado muy corto, intentando con spa+eng...")
            text = pytesseract.image_to_string(processed_image, lang='spa+eng', config=custom_config)
        
        # If still too short, try original image as fallback
        if len(text) < 50:
            print("Texto aún muy corto, intentando con imagen original...")
            text = pytesseract.image_to_string(image, lang='spa+eng', config=custom_config)
            
        print(f"Texto extraído ({len(text)} chars): {text[:200]}...")
        
        # 4. Extract structured data
        amount = extract_amount(text)
        date = extract_date(text)
        merchant = extract_merchant(text)
        confidence = calculate_confidence(amount, date, merchant, len(text))
        
        print(f"Datos extraídos - Amount: {amount}, Date: {date}, Merchant: {merchant}, Confidence: {confidence}")
        
        # 5. Prepare update data
        extracted_data = {
            'status': 'processed',
            'ocrText': text[:10000],  # Limit text length
            # 'confidence': confidence, # Removed because attribute does not exist in Appwrite
        }
        
        # Add optional fields if detected
        if amount is not None:
            extracted_data['detectedAmount'] = amount
        if date is not None:
            extracted_data['detectedDate'] = date
        # if merchant is not None:
        #     extracted_data['detectedMerchant'] = merchant # Removed: Not in schema
        
        # 6. Create draft transaction if amount was detected
        transaction = None
        if amount is not None and confidence >= 0.3:  # Minimum confidence threshold
            transaction = create_draft_transaction(
                receipt, amount, date, merchant, receipt['profile']
            )
            if transaction:
                extracted_data['transaction'] = transaction['$id']
        
        # 7. Update receipt document
        databases.update_document(
            DATABASE_ID,
            RECEIPTS_COLLECTION_ID,
            receipt['$id'],
            extracted_data
        )
        
        print(f"Recibo {receipt['$id']} procesado correctamente (confidence: {confidence})")
        
    except Exception as e:
        print(f"Error procesando recibo {receipt['$id']}: {e}")
        # Mark as failed
        try:
            databases.update_document(
                DATABASE_ID,
                RECEIPTS_COLLECTION_ID,
                receipt['$id'],
                {'status': 'failed'}
            )
        except:
            pass


def main():
    """
    Main loop: continuously check for uploaded receipts and process them.
    """
    print("Iniciando servicio OCR...")
    print(f"Endpoint: {ENDPOINT}")
    print(f"Database: {DATABASE_ID}")
    print(f"Receipts Collection: {RECEIPTS_COLLECTION_ID}")
    print(f"Transactions Collection: {TRANSACTIONS_COLLECTION_ID}")
    
    if not TRANSACTIONS_COLLECTION_ID:
        print("WARNING: APPWRITE_TRANSACTIONS_COLLECTION_ID is missing. Draft transactions will not be created.")

    while True:
        try:
            print("\nBuscando recibos pendientes...")
            
            # Search for pending receipts
            response = databases.list_documents(
                DATABASE_ID,
                RECEIPTS_COLLECTION_ID,
                [Query.equal('status', 'uploaded')]
            )
            
            if response['documents']:
                print(f"Encontrados {len(response['documents'])} recibos pendientes.")
                for receipt in response['documents']:
                    process_receipt(receipt)
            else:
                print("No hay recibos pendientes. Esperando...")
            
        except Exception as e:
            print(f"Error en el ciclo principal: {e}")
        
        # Wait before checking again
        time.sleep(30)  # Check every 30 seconds


if __name__ == "__main__":
    main()

