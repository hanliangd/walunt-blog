import sqlite3

conn = sqlite3.connect("blog.db")
cursor = conn.cursor()

# 1. 查看所有表名
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
print("数据库里有哪些表:", cursor.fetchall())

# 2. 查看 users 表里所有的数据
cursor.execute("SELECT * FROM users;")
users = cursor.fetchall()
print(f"users 表里共有 {len(users)} 条数据：")
for row in users:
    print(row)

# 3. 查看 posts 表里所有的数据
cursor.execute("SELECT * FROM posts;")
posts = cursor.fetchall()
print(f"posts 表里共有 {len(posts)} 条数据：")
for row in posts:
    print(row)

conn.close()