import sqlite3
conn = sqlite3.connect('blog.db')
conn.execute('PRAGMA foreign_keys = ON') 
cursor = conn.cursor()
cursor.execute('DROP TABLE IF EXISTS posts')
cursor.execute('DROP TABLE IF EXISTS tags')
cursor.execute('DROP TABLE IF EXISTS post_tags')
cursor.execute('''CREATE TABLE IF NOT EXISTS users(
id INTEGER PRIMARY KEY,
username TEXT NOT NULL UNIQUE,
nickname TEXT,
password_hash TEXT NOT NULL,
avatar TEXT,
bio TEXT,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
''')
cursor.execute('''CREATE TABLE IF NOT EXISTS posts(
id INTEGER PRIMARY KEY,
users_id INTEGER REFERENCES users(id),
title TEXT NOT NULL,
content TEXT,
status TEXT NOT NULL DEFAULT 'draft',
likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
views INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
published_at TEXT
)
''')
cursor.execute('''CREATE TABLE IF NOT EXISTS tags(
id INTEGER PRIMARY KEY,
name TEXT NOT NULL UNIQUE
)
''')
cursor.execute('''CREATE TABLE IF NOT EXISTS post_tag(
post_id INTEGER NOT NULL REFERENCES posts(id),
tag_id INTEGER NOT NULL REFERENCES tags(id),
PRIMARY KEY (post_id, tag_id)
)
''')
cursor.execute('INSERT INTO users(username,password_hash) VALUES(?,?)',('bOb','hash2'))
cursor.execute('INSERT INTO posts(users_id,title,status,likes,views) VALUES(?,?,?,?,?)',(2,'FastAPI','draft',1,100))
conn.commit()