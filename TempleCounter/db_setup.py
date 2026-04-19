import sqlite3
import os

DB_PATH = "temple_auth.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    ''')
    
    # Add a default admin user if it doesn't exist
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", ("admin", "admin123"))
        print("✅ Default user 'admin' created with password 'admin123'")
    except sqlite3.IntegrityError:
        print("ℹ️ User 'admin' already exists.")
    
    conn.commit()
    conn.close()
    print(f"✅ Database initialized at {os.path.abspath(DB_PATH)}")

if __name__ == "__main__":
    init_db()
