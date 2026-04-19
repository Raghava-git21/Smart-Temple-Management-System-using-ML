import requests
try:
    r = requests.get("http://localhost:8003/video_feed", stream=True, timeout=5)
    print(f"Status: {r.status_code}")
    for chunk in r.iter_content(chunk_size=1024):
        if chunk:
            print("Received data!")
            break
except Exception as e:
    print(f"Error: {e}")
