import os
import glob
from PIL import Image

dirs_to_process = [
    r"artifacts/hostel-outpass/public/students",
    r"artifacts/api-server/uploads/students",
    r"artifacts/hostel-outpass/dist/public/students"
]

def rotate_photos():
    total_rotated = 0
    for d in dirs_to_process:
        if not os.path.exists(d):
            continue
        files = glob.glob(os.path.join(d, "*.jpg"))
        for fpath in files:
            fname = os.path.basename(fpath)
            # Skip full card images and sheet images
            if fname.endswith("_card.jpg") or fname.startswith("id_card_sheet"):
                continue
            
            try:
                with Image.open(fpath) as img:
                    # Rotate 90 degrees clockwise to keep head pointing UP (north)
                    rotated_img = img.transpose(Image.ROTATE_90)
                    rotated_img.save(fpath, quality=95)
                    total_rotated += 1
            except Exception as e:
                print(f"Error processing {fpath}: {e}")

    print(f"Successfully rotated {total_rotated} student photo files 90 degrees clockwise!")

if __name__ == "__main__":
    rotate_photos()
