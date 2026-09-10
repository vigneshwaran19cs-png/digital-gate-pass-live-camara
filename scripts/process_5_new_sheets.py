import os
import re
from PIL import Image

uploaded_dir = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\76d85780-f4d1-4ce1-8931-637f39959cd2\.user_uploaded"

sheets_data = [
    {
        "file": "media_1789023157486.jpg",
        "sheet_num": 46,
        "students": [
            {"name": "PRITHIVIVASAN M", "reg": "731225CS040", "barcode": "25CS040", "dept": "CSE", "parent": "M. Manickam", "phone": "9994948567", "bg": "B+VE", "dob": "23-02-2008", "address": "2/64, ERUKKALAKKATTI, KANGEYAM, PUDUKKOTTAI(DT), PIN-614624"},
            {"name": "PUGAZHENDHI C", "reg": "731225CS041", "barcode": "25CS041", "dept": "CSE", "parent": "C. Chinnasamy", "phone": "9952722091", "bg": "O+VE", "dob": "13-05-2008", "address": "97, KANTHAPILLAYAR KOVIL, ALACHAMPALAYAM, IDAPPADY, SALEM(DT), PIN-637101"},
            {"name": "RAGHUL S", "reg": "731225CS042", "barcode": "25CS042", "dept": "CSE", "parent": "S. Sekar", "phone": "9176967139", "bg": "AB+VE", "dob": "17-05-2008", "address": "3/370, BHARATHI NAGAR, GERETTY, KRISHNAGIRI(DT), PIN-635102"},
            {"name": "RAJA ANANTH N", "reg": "731225CS043", "barcode": "25CS043", "dept": "CSE", "parent": "N. Natarajan", "phone": "6374124894", "bg": "O+VE", "dob": "29-01-2008", "address": "415-218, KANNAMUCHI, METTUR, SALEM(DT), PIN-636303"},
            {"name": "SANTHIYA V", "reg": "731225CS044", "barcode": "25CS044", "dept": "CSE", "parent": "V. Viswanathan", "phone": "9789818901", "bg": "B+VE", "dob": "14-01-2008", "address": "301A, NADAR COLONY, KUPPANDAMPALAYAM, ERODE(DT), PIN-638502"}
        ]
    },
    {
        "file": "media_1789023157460.jpg",
        "sheet_num": 47,
        "students": [
            {"name": "SARAVANAN S", "reg": "731225CS045", "barcode": "25CS045", "dept": "CSE", "parent": "S. Soundarapandian", "phone": "7200933997", "bg": "B+VE", "dob": "06-07-2007", "address": "3/257, VIRUTHANKOTTAI, PEDDANAPALLI, KRISHNAGIRI, KRISHNAGIRI(DT), PIN-635001"},
            {"name": "SARAVANAN S", "reg": "731225CS046", "barcode": "25CS046", "dept": "CSE", "parent": "S. Senthil", "phone": "9342113682", "bg": "B+VE", "dob": "04-04-2008", "address": "520, AMMAN NAGAR, ALAMPALAYAM, ERODE(DT), PIN-638501"},
            {"name": "SATHISH KUMAR C", "reg": "731225CS047", "barcode": "25CS047", "dept": "CSE", "parent": "C. Chandrasekar", "phone": "9597818062", "bg": "AB+VE", "dob": "18-06-2007", "address": "40/2 GANDHIJI STREET, THAVITTUPALAYAM, ERODE(DT), PIN-638501"},
            {"name": "SATHISH S", "reg": "731225CS048", "barcode": "25CS048", "dept": "CSE", "parent": "S. Subramani", "phone": "8667522532", "bg": "O+VE", "dob": "25-11-2006", "address": "1/220, KARAIKADU, KARAIKADU, SALEM(DT), PIN-636303"},
            {"name": "SATHYA K", "reg": "731225CS049", "barcode": "25CS049", "dept": "CSE", "parent": "K. Kumar", "phone": "8015969195", "bg": "O+VE", "dob": "24-10-2007", "address": "4/19, KARUVALUR, MARIYAMMAN KOVIL ST, CHINNAPELAMEDU, ERODE(DT), PIN-638452"}
        ]
    },
    {
        "file": "media_1789023157327.jpg",
        "sheet_num": 48,
        "students": [
            {"name": "SATHYA V", "reg": "731225CS050", "barcode": "25CS050", "dept": "CSE", "parent": "V. Velusamy", "phone": "8122755767", "bg": "O+VE", "dob": "20-08-2008", "address": "315/278, NAVAPPATTI, PUDHUR, SALEM(DT), PIN-636452"},
            {"name": "SHOBANA C", "reg": "731225CS051", "barcode": "25CS051", "dept": "CSE", "parent": "C. Chinnasamy", "phone": "8838103590", "bg": "O+VE", "dob": "20-05-2008", "address": "56, MIDDLE STREET, PACHERY, KALLAKURICHI(DT), PIN-606401"},
            {"name": "SUJITHKAVI S", "reg": "731225CS052", "barcode": "25CS052", "dept": "CSE", "parent": "S. Shanmugam", "phone": "9943211505", "bg": "O+VE", "dob": "20-11-2007", "address": "2/351, ARASAN KINARU ST., KORAKKAI, CUDDALORE(DT), PIN-606106"},
            {"name": "THANANJAI P", "reg": "731225CS053", "barcode": "25CS053", "dept": "CSE", "parent": "P. Palani", "phone": "7904961977", "bg": "A+VE", "dob": "29-06-2007", "address": "8/35, SURAPPALLI SCHOOL NEAR, SURAPPALLI, SALEM(DT), PIN-636501"},
            {"name": "THANGAPANDI G", "reg": "731225CS054", "barcode": "25CS054", "dept": "CSE", "parent": "G. Ganesan", "phone": "9655321263", "bg": "O+VE", "dob": "29-05-2008", "address": "4/350, A.SEKKARAPPATTI, ADAGPADI, DHARMAPURI, DHARMAPURI(DT), PIN-636803"}
        ]
    },
    {
        "file": "media_1789023157199.jpg",
        "sheet_num": 49,
        "students": [
            {"name": "THENMOZHI C", "reg": "731225CS055", "barcode": "25CS055", "dept": "CSE", "parent": "C. Chandran", "phone": "7639736577", "bg": "A+VE", "dob": "21-09-2007", "address": "2/252, SOUTH STREET, VALLIMADHURAM, CUDDALORE, CUDDALORE(DT), PIN-606108"},
            {"name": "VENKATESHWARAN L", "reg": "731225CS056", "barcode": "25CS056", "dept": "CSE", "parent": "L. Lakshmanan", "phone": "8754931788", "bg": "A+VE", "dob": "24-09-2007", "address": "20, AVANIIPERUR WEST ST., REDDY THERU, SALEM(DT), PIN-637101"},
            {"name": "VETRIVEL K", "reg": "731225CS057", "barcode": "25CS057", "dept": "CSE", "parent": "K. Krishnan", "phone": "9344638498", "bg": "O-VE", "dob": "10-04-2008", "address": "472, KULIYAN KATTU KOTTAI, MATHUR, ANTHIYUR, ERODE(DT), PIN-638314"},
            {"name": "VISHWA S", "reg": "731225CS058", "barcode": "25CS058", "dept": "CSE", "parent": "S. Subramani", "phone": "9787369040", "bg": "B+VE", "dob": "23-02-2008", "address": "63, SOUTH STREET, MATHUR, KALLAKURICHI(DT), PIN-606207"},
            {"name": "YAMUNA S", "reg": "731225CS059", "barcode": "25CS059", "dept": "CSE", "parent": "S. Sekar", "phone": "8608369393", "bg": "A+VE", "dob": "21-05-2008", "address": "85/METTUVALLASU, BOMMAMALLUR, TIRUPPUR(DT), PIN-638673"}
        ]
    },
    {
        "file": "media_1789023157070.jpg",
        "sheet_num": 50,
        "students": [
            {"name": "YUVARAJ E", "reg": "731225CS060", "barcode": "25CS060", "dept": "CSE", "parent": "E. Elangovan", "phone": "9003847665", "bg": "B+VE", "dob": "01-03-2008", "address": "3/14 WEST PUDHUVADI, KEERANUR, KARUR, PIN-639119"},
            {"name": "AARTHI SRI T", "reg": "731225IT001", "barcode": "25IT001", "dept": "IT", "parent": "T. Thangaraj", "phone": "9843544118", "bg": "A+VE", "dob": "15-02-2007", "address": "27/57, A EXTENSION ST., RANGASAMUTHIRAM, SATHY, ERODE(DT), PIN-638402"},
            {"name": "ABARNA P", "reg": "731225IT002", "barcode": "25IT002", "dept": "IT", "parent": "P. Palanisamy", "phone": "7094773368", "bg": "B+VE", "dob": "13-09-2008", "address": "203, ADHITHIRAVIDAR ST., CHOKKANATHAPURAM, THANJAVUR(DT), PIN-614803"},
            {"name": "AFRINBANU S", "reg": "731225IT003", "barcode": "25IT003", "dept": "IT", "parent": "S. Syed", "phone": "9442663854", "bg": "O+VE", "dob": "23-05-2008", "address": "5/756, SHESHANAGAR, ERODE(DT), PIN-638461"},
            {"name": "ARUNDHATHI V", "reg": "731225IT004", "barcode": "25IT004", "dept": "IT", "parent": "V. Velu", "phone": "9025117445", "bg": "O+VE", "dob": "24-06-2008", "address": "36, DAMBEDKAR STREET, MARANDAHALLI, DHARMAPURI(DT), PIN-636806"}
        ]
    }
]

def slug(name):
    return re.sub(r'[^a-zA-Z0-9]+', '_', name.strip().lower()).strip('_')

def run():
    out_dirs = [
        "artifacts/hostel-outpass/public/students",
        "artifacts/hostel-outpass/public/students/sheets",
        "artifacts/api-server/uploads/students",
        "artifacts/hostel-outpass/dist/public/students"
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    total = 0
    for s in sheets_data:
        p = os.path.join(uploaded_dir, s["file"])
        sheet_img = Image.open(p)
        W, H = sheet_img.size
        print(f"\nProcessing Sheet {s['sheet_num']} ({s['file']}) - {W}x{H}:")
        
        # Save sheet image copy
        sheet_save_path = f"artifacts/hostel-outpass/public/students/sheets/sheet_{s['sheet_num']}.jpg"
        sheet_img.save(sheet_save_path, quality=95)

        for idx, stu in enumerate(s["students"]):
            y_top = int(idx * (H / 5.0))
            photo_x1 = 162
            photo_y1 = y_top + 45
            photo_x2 = 268
            photo_y2 = y_top + 175

            photo_crop = sheet_img.crop((photo_x1, photo_y1, photo_x2, photo_y2))

            # Target filenames
            filenames = [
                f"{stu['reg']}.jpg",
                f"{stu['barcode']}.jpg",
                f"{stu['reg'].lower()}.jpg",
                f"{stu['barcode'].lower()}.jpg",
                f"{slug(stu['name'])}.jpg"
            ]

            for fname in set(filenames):
                p1 = os.path.join("artifacts/hostel-outpass/public/students", fname)
                p2 = os.path.join("artifacts/api-server/uploads/students", fname)
                photo_crop.save(p1, quality=95)
                photo_crop.save(p2, quality=95)
                p3 = os.path.join("artifacts/hostel-outpass/dist/public/students", fname)
                photo_crop.save(p3, quality=95)

            total += 1
            print(f"  [{total}/25] Cropped photo for {stu['name']} ({stu['reg']} / {stu['barcode']}) -> /students/{stu['reg']}.jpg")

    print(f"\nSuccessfully cropped all {total} students from the 5 new sheets!")

if __name__ == "__main__":
    run()
