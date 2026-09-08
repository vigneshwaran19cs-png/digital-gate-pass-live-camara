import os
import re

def clean_id_card_upload():
    path = "artifacts/hostel-outpass/src/pages/admin/id-card-upload.tsx"
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace each student's unsplash photo with /students/{reg}.jpg
    def repl_student(m):
        block = m.group(0)
        reg_match = re.search(r'reg:\s*"([^"]+)"', block)
        if reg_match:
            reg = reg_match.group(1)
            return re.sub(r'photo:\s*"https://images\.unsplash\.com/[^"]+"', f'photo: "/students/{reg}.jpg"', block)
        return block

    content = re.sub(r'\{\s*name:[^}]+photo:\s*"https://images\.unsplash\.com/[^"]+"[^}]*\}', repl_student, content)

    # Clean preset sample photos
    content = re.sub(
        r'\{\s*label:\s*"Female Student Profile",\s*url:\s*"https://images\.unsplash\.com/[^"]+"\s*\}',
        '{\n    label: "Kaviya A (CSE)",\n    url: "/students/731225CS022.jpg"\n  }',
        content
    )
    content = re.sub(
        r'\{\s*label:\s*"Male Student Profile",\s*url:\s*"https://images\.unsplash\.com/[^"]+"\s*\}',
        '{\n    label: "Sivaharivel T (Mech)",\n    url: "/students/731225ME024.jpg"\n  }',
        content
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Cleaned id-card-upload.tsx")

def clean_seed_service():
    paths = [
        "artifacts/api-server/src/lib/seed_service.ts",
        "scripts/seed_realistic_test_data.ts"
    ]
    for p in paths:
        if not os.path.exists(p):
            continue
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()

        def repl_stu(m):
            block = m.group(0)
            reg_match = re.search(r'registerNumber:\s*"([^"]+)"', block)
            if reg_match:
                reg = reg_match.group(1)
                return re.sub(r'photoUrl:\s*"https://images\.unsplash\.com/[^"]+"', f'photoUrl: "/students/{reg}.jpg"', block)
            return block

        content = re.sub(r'\{\s*name:[^}]+photoUrl:\s*"https://images\.unsplash\.com/[^"]+"[^}]*\}', repl_stu, content)

        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Cleaned {p}")

def clean_api_index():
    path = "artifacts/api-server/src/index.ts"
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove unsplash updater
    content = re.sub(
        r'try\s*\{\s*await pool\.query\(`UPDATE users SET photo_url = \'https://images\.unsplash\.com/[^\']+\', is_face_enrolled = \'true\' WHERE photo_url IS NULL OR photo_url = \'\';`\);\s*\}\s*catch\(e\)\s*\{\}',
        "try { await pool.query(`UPDATE users SET photo_url = CONCAT('/students/', register_number, '.jpg') WHERE (photo_url LIKE '%unsplash%' OR photo_url IS NULL OR photo_url = '') AND register_number IS NOT NULL;`); } catch(e) {}\n    try { await pool.query(`UPDATE users SET photo_url = '/students/vimal_m.jpg' WHERE photo_url LIKE '%unsplash%';`); } catch(e) {}",
        content
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Cleaned index.ts")

def clean_all_other_files():
    files = [
        "artifacts/hostel-outpass/src/components/StudentProfileSetupModal.tsx",
        "artifacts/hostel-outpass/src/pages/users/index.tsx",
        "artifacts/hostel-outpass/src/pages/students/profile.tsx",
        "artifacts/hostel-outpass/src/pages/security/live-scanner.tsx",
        "artifacts/hostel-outpass/src/pages/reports/index.tsx",
        "artifacts/hostel-outpass/src/pages/dashboard/AdminDashboard.tsx",
        "artifacts/api-server/src/routes/enrollment.ts",
        "artifacts/api-server/src/routes/gate_logs.ts"
    ]
    for p in files:
        if not os.path.exists(p):
            continue
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace any unsplash urls with "/students/vimal_m.jpg" or dynamic student photo
        new_content = re.sub(r'https://images\.unsplash\.com/[^\s"\'`)]+', '/students/vimal_m.jpg', content)
        if new_content != content:
            with open(p, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Purged unsplash from {p}")

if __name__ == "__main__":
    clean_id_card_upload()
    clean_seed_service()
    clean_api_index()
    clean_all_other_files()
    print("All unsplash references cleaned successfully!")
