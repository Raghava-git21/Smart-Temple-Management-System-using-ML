import firebase_admin
from firebase_admin import credentials, db
import os

try:
    cred_path = r'c:\Users\raghu\Videos\Temple parking using cctv\backend\serviceAccount.json'
    if not os.path.exists(cred_path):
        print(f"Service account file not found at {cred_path}")
        exit(1)
        
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {'databaseURL': 'https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app'})
    
    # Fetch all temples
    temples_ref = db.reference('templeData')
    temples = temples_ref.get()
    
    if temples:
        for temple_id in temples.keys():
            db.reference(f'templeData/{temple_id}').update({
                'counter_url': 'http://localhost:8010/stats',
                'parking_url': 'http://localhost:8002',
                'camera_manager_url': 'http://localhost:8004'
            })
        print(f"Successfully updated URLs for {len(temples)} temples in Firebase!")
    else:
        print("No temples found in Firebase.")
    
except Exception as e:
    print(f"Error updating Firebase: {e}")
