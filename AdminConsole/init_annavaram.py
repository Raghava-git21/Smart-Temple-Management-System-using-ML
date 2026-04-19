import firebase_admin
from firebase_admin import credentials, db

try:
    cred = credentials.Certificate(r'c:\Users\raghu\Videos\Temple parking using cctv\backend\serviceAccount.json')
    firebase_admin.initialize_app(cred, {'databaseURL': 'https://temple-cctv-default-rtdb.asia-southeast1.firebasedatabase.app'})
    
    # Check if annavaram config exists
    ref = db.reference('temples/annavaram/config')
    if not ref.get():
        ref.set({'counter_sources': ['0']})
        print('Created temples/annavaram config')
    else:
        print('config already exists')
        
    # Check templeData
    td_ref = db.reference('templeData/annavaram')
    if not td_ref.get():
        td_ref.set({
            'name': 'Sri Veera Venkata Satyanarayana Swamy',
            'location': 'Annavaram, Andhra Pradesh',
            'coords': [17.2789, 82.4043],
            'image': './images/placeholder.png',
            'timings': {'Darshan': '6:00 AM - 9:00 PM'},
            'routes': [{'name': 'Main Entrance', 'wait_time': '15 mins', 'description': 'General queue'}],
            'facilities': ['Prasadam', 'Wait Area'],
            'counter_url': 'http://localhost:8010/stats',
            'parking_url': 'http://localhost:8002',
            'camera_manager_url': 'http://localhost:8004'
        })
        print('Created templeData/annavaram profile')
    else:
        print('templeData already exists')
    print('done')
except Exception as e:
    print(e)
