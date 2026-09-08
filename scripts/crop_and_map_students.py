import os
import glob
import re
import hashlib
from PIL import Image

def get_unique_sheets():
    uploaded_dir = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\76d85780-f4d1-4ce1-8931-637f39959cd2\.user_uploaded"
    files = sorted(glob.glob(os.path.join(uploaded_dir, "*.jpg")))
    hashes = {}
    unique_files = []
    for f in files:
        with open(f, "rb") as fp:
            h = hashlib.md5(fp.read()).hexdigest()
        if h not in hashes:
            hashes[h] = f
            unique_files.append(f)
    return unique_files

def parse_candidate_data():
    tsx_path = "artifacts/hostel-outpass/src/pages/admin/id-card-upload.tsx"
    with open(tsx_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the candidateData array
    start_marker = "const candidateData = ["
    end_marker = "];\n\n    // Groups of 5 students"
    start_pos = content.find(start_marker)
    end_pos = content.find(end_marker, start_pos)
    
    if start_pos == -1 or end_pos == -1:
        # Fallback end marker
        end_marker = "];"
        end_pos = content.find(end_marker, start_pos)

    raw_block = content[start_pos + len(start_marker):end_pos]
    
    # Parse each object { name: "...", reg: "...", barcode: "...", ... }
    pattern = re.compile(
        r'\{\s*name:\s*"([^"]+)",\s*reg:\s*"([^"]+)",\s*barcode:\s*"([^"]+)",\s*dept:\s*"([^"]+)",\s*parent:\s*"([^"]+)",\s*phone:\s*"([^"]+)",\s*bg:\s*"([^"]+)",\s*dob:\s*"([^"]+)",\s*address:\s*"([^"]+)"',
        re.MULTILINE
    )
    
    students = []
    for m in pattern.finditer(raw_block):
        students.append({
            "name": m.group(1),
            "reg": m.group(2),
            "barcode": m.group(3),
            "dept": m.group(4),
            "parent": m.group(5),
            "phone": m.group(6),
            "bg": m.group(7),
            "dob": m.group(8),
            "address": m.group(9),
        })
    return students

def name_to_slug(name):
    # e.g. "VIMAL M" -> "vimal_m", "DINESH KUMAR R" -> "dinesh_kumar_r"
    slug = re.sub(r'[^a-zA-Z0-9]+', '_', name.strip().lower()).strip('_')
    return slug

def main():
    unique_sheets = get_unique_sheets()
    print(f"Loaded {len(unique_sheets)} unique sheet images.")

    students = parse_candidate_data()
    print(f"Parsed {len(students)} students from candidateData.")

    out_dirs = [
        "artifacts/hostel-outpass/public/students",
        "artifacts/hostel-outpass/public/students/sheets",
        "artifacts/api-server/uploads/students"
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    # Process all 45 sheets (up to min(len(unique_sheets), 45))
    num_sheets = min(len(unique_sheets), 45)
    
    total_cropped = 0

    for s_idx in range(num_sheets):
        sheet_path = unique_sheets[s_idx]
        sheet_img = Image.open(sheet_path)
        W, H = sheet_img.size

        # Save sheet image copy
        sheet_save_path = f"artifacts/hostel-outpass/public/students/sheets/sheet_{s_idx+1}.jpg"
        sheet_img.save(sheet_save_path, quality=92)

        # 5 students per sheet
        start_student_idx = s_idx * 5
        sheet_students = students[start_student_idx : start_student_idx + 5]

        # Calculate bounding box for 5 vertical cards
        for card_idx, stu in enumerate(sheet_students):
            y_top = int(card_idx * (H / 5.0))
            y_bottom = int((card_idx + 1) * (H / 5.0))

            # Crop individual ID card
            card_img = sheet_img.crop((0, y_top, W, y_bottom))
            card_save_path = f"artifacts/hostel-outpass/public/students/{stu['reg']}_card.jpg"
            card_img.save(card_save_path, quality=90)
            card_img.save(f"artifacts/api-server/uploads/students/{stu['reg']}_card.jpg", quality=90)

            # Portrait photograph crop
            # Photo is located on the left/center:
            # X: 165 to 265 (width ~100px)
            # Y: y_top + 45 to y_top + 172 (height ~127px)
            photo_x1 = 162
            photo_y1 = y_top + 45
            photo_x2 = 268
            photo_y2 = y_top + 175

            # Ensure inside bounds
            photo_x1 = max(0, min(photo_x1, W))
            photo_x2 = max(0, min(photo_x2, W))
            photo_y1 = max(0, min(photo_y1, H))
            photo_y2 = max(0, min(photo_y2, H))

            photo_crop = sheet_img.crop((photo_x1, photo_y1, photo_x2, photo_y2))
            
            # Target filenames:
            # 1. full reg number: e.g. 731225ME029.jpg
            # 2. short barcode: e.g. 25ME029.jpg
            # 3. name slug: e.g. vimal_m.jpg
            filenames = [
                f"{stu['reg']}.jpg",
                f"{stu['barcode']}.jpg",
                f"{stu['reg'].lower()}.jpg",
                f"{stu['barcode'].lower()}.jpg",
                f"{name_to_slug(stu['name'])}.jpg"
            ]

            for fname in set(filenames):
                p1 = os.path.join("artifacts/hostel-outpass/public/students", fname)
                p2 = os.path.join("artifacts/api-server/uploads/students", fname)
                photo_crop.save(p1, quality=95)
                photo_crop.save(p2, quality=95)

            total_cropped += 1
            print(f"[{total_cropped}/225] Cropped: {stu['name']} ({stu['reg']} / {stu['barcode']}) -> /students/{stu['reg']}.jpg")

    print(f"\nSuccessfully cropped and mapped {total_cropped} student photos to persistent storage!")

if __name__ == "__main__":
    main()
