"""
SafeGuard AI - Women's Safety
Database Setup File
This file creates and manages the SQLite database.
SQLite is the simplest database - just a single file, no setup needed!
"""

import sqlite3

# Database file name
DB_NAME = "safeguard.db"


def get_connection():
    """Create a connection to the database"""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # This lets us access columns by name
    return conn


def init_database():
    """
    Create all the tables we need.
    Run this once when setting up the project.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # TABLE 1: Users - stores registered users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # TABLE 2: Emergency Contacts - trusted people to alert
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            contact_name TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            relation TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # TABLE 3: SOS Alerts - records of every emergency triggered
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            latitude REAL,
            longitude REAL,
            address TEXT,
            audio_file TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # TABLE 4: Safety Check-ins - periodic safety confirmations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            latitude REAL,
            longitude REAL,
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()
    print("✅ Database created successfully!")


# Run this file directly to create the database
if __name__ == "__main__":
    init_database()
