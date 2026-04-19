import sqlite3
import argparse
import os

DB_PATH = "temple_auth.db"

def add_user(username, password):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
        conn.commit()
        conn.close()
        print(f"✅ User '{username}' added successfully!")
    except sqlite3.IntegrityError:
        print(f"❌ Error: User '{username}' already exists.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add a new user to Temple Counter")
    parser.add_argument("username", help="The username for the new user")
    parser.add_argument("password", help="The password for the new user")
    
    args = parser.parse_args()
    
    if not os.path.exists(DB_PATH):
        print("❌ Error: Database not found. Run db_setup.py first.")
    else:
        add_user(args.username, args.password)