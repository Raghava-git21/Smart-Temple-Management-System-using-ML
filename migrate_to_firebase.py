import firebase_admin
from firebase_admin import credentials, db
import json
import re
import os

# Configuration
SERVICE_ACCOUNT_PATH = r"c:\Users\raghu\Videos\Temple parking using cctv\backend\serviceAccount.json"
DATABASE_URL = "https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app"
DATA_JS_PATH = r"c:\Users\raghu\Videos\Devotees\data.js"

def migrate():
    # 1. Read data.js
    with open(DATA_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to extract the object
    match = re.search(r'const templeData = (\{.*\});', content, re.DOTALL)
    if not match:
        print("Could not find templeData in data.js")
        return
    
    data_str = match.group(1)
    # The JS object might not be strict JSON (no quotes on keys, etc.)
    # But in this case, it looks fairly standard except for trailing commas maybe.
    # To be safe, we can try to clean it up or use a JS parser if available.
    # Given the content I saw, it looks like standard JSON-like.
    
    # Replace single quotes with double quotes for keys/values if needed, 
    # but the content I saw uses double quotes already mostly.
    # Let's try to just parse it after some basic cleaning.
    
    # Strip trailing commas before closing braces/brackets
    data_str = re.sub(r',\s*([\]\}])', r'\1', data_str)
    
    try:
        temple_data = json.loads(data_str)
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        return

    # 1.5 Add default module URLs for all temples
    temples_list = list(temple_data.keys())
    for i, key in enumerate(temples_list):
        # Using base ports from start_all.bat for the first temple
        temple_data[key]["counter_url"] = f"http://localhost:{8000 + (i * 10)}/stats"
        temple_data[key]["parking_url"] = f"http://localhost:{8002 + (i * 10)}"
        temple_data[key]["camera_manager_url"] = f"http://localhost:{8004 + (i * 10)}"

    # 2. Initialize Firebase
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred, {'databaseURL': DATABASE_URL})
    
    # 3. Push to Firebase
    ref = db.reference('templeData')
    ref.set(temple_data)
    print("✅ Successfully migrated templeData to Firebase /templeData")

if __name__ == "__main__":
    migrate()
