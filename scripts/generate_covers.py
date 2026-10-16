import fitz  # PyMuPDF
import os

MAGAZINES_DIR = "magazines"
COVERS_DIR = "covers"

# Create the covers folder if it doesn't exist
os.makedirs(COVERS_DIR, exist_ok=True)

for filename in os.listdir(MAGAZINES_DIR):
    if not filename.lower().endswith(".pdf"):
        continue
    
    pdf_path = os.path.join(MAGAZINES_DIR, filename)
    cover_name = os.path.splitext(filename)[0] + ".jpg"
    cover_path = os.path.join(COVERS_DIR, cover_name)
    
    # Only generate if the cover doesn't already exist (saves time)
    if not os.path.exists(cover_path):
        try:
            doc = fitz.open(pdf_path)
            page = doc.load_page(0) # Get first page
            # 2x zoom for high-DPI (Retina) crispness
            mat = fitz.Matrix(2, 2) 
            pix = page.get_pixmap(matrix=mat, alpha=False)
            pix.save(cover_path, output="jpeg", quality=85)
            print(f"Generated cover for {filename}")
        except Exception as e:
            print(f"Failed to generate cover for {filename}: {e}")
