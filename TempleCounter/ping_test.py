import os
import sys

def check_ping(hostname):
    print(f"Pinging {hostname}...")
    # Use -n 1 for windows, -c 1 for linux
    response = os.system(f"ping -n 4 {hostname}")
    
    if response == 0:
        print(f"✅ {hostname} is reachable!")
        return True
    else:
        print(f"❌ {hostname} is UNREACHABLE. Check IP and network.")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        check_ping(sys.argv[1])
    else:
        print("Usage: python ping_test.py 192.0.0.2")
