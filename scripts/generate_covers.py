import os
import json

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf

MAGAZINES_DIR = "magazines"
# Changed to assets/issues so Jekyll guarantees it copies the files
ISSUES_DIR = "assets/issues"

os.makedirs(ISSUES_DIR, exist_ok=True)

for filename in os.listdir(MAGAZINES_DIR):
    if not filename.lower().endswith(".pdf"):
        continue
    
    pdf_name = os.path.splitext(filename)[0]
    pdf_path = os.path.join(MAGAZINES_DIR, filename)
    issue_dir = os.path.join(ISSUES_DIR, pdf_name)
    manifest_path = os.path.join(issue_dir, "manifest.json")
    
    if not os.path.exists(manifest_path):
        os.makedirs(issue_dir, exist_ok=True)
        try:
            doc = pymupdf.open(pdf_path)
            page_count = doc.page_count
            print(f"Processing {filename} ({page_count} pages)...")
            
            for i in range(page_count):
                page = doc.load_page(i)
                mat = pymupdf.Matrix(2, 2) 
                pix = page.get_pixmap(matrix=mat, alpha=False)
                
                img_path = os.path.join(issue_dir, f"{i+1}.jpg")
                
                try:
                    img_bytes = pix.tobytes("jpeg")
                except TypeError:
                    img_bytes = pix.tobytes(output="jpeg")
                    
                with open(img_path, "wb") as f:
                    f.write(img_bytes)
                    
            doc.close()
            
            manifest = {"title": pdf_name, "pages": page_count}
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)
                
            print(f"✅ Generated {page_count} pages for {filename}")
        except Exception as e:
            print(f"❌ Failed to process {filename}: {e}")
