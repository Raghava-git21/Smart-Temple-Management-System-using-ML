import firebase_admin
from firebase_admin import credentials, db
import os
import json

FIREBASE_DB_URL = "https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app"
SERVICE_ACCOUNT_PATH = r"c:\Users\raghu\Videos\Temple parking using cctv\backend\serviceAccount.json"

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred, {'databaseURL': FIREBASE_DB_URL})

ref = db.reference('templeData')
data = ref.get()

with open('firebase_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Data saved to firebase_data.json")
