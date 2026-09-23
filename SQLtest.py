import sqlite3
conn = sqlite3.connect('practice.db')
cur = conn.cursor()
cur.execute('DROP TABLE IF EXISTS posts')
cur.execute('DROP TABLE IF EXISTS users')
cur.execute('''CREATE TABLE users(
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE
)''')
cur.execute('''CREATE TABLE posts(
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    views INTEGER DEFAULT 0
)''')
cur.executemany('INSERT INTO users(username) VALUES(?)',
    [('walunt',), ('alice',), ('bob',), ('dave',)])
cur.executemany('INSERT INTO posts(user_id, title, views) VALUES(?,?,?)', [
    (1, '我的第一篇',   120),
    (1, 'FastAPI 踩坑', 340),
    (2, 'Hello World',   56),
    (2, 'SQL 入门',     210),
    (3, '只有一篇',      12),
])
conn.commit()
conn.close()
print('数据准备好了')
conn2 = sqlite3.connect('practice.db')
cursor = conn2.cursor()
cursor.execute('''
SELECT users.username , IFNULL(posts.title , '无') AS 文章 , IFNULL(posts.views , 0) AS 浏览量
FROM users
LEFT JOIN posts ON users.id = posts.user_id;
 '''
)
for row in cursor.fetchall():
    print(row)
cursor.execute('''
SELECT users.username , SUM(posts.views) AS total_views
FROM users
LEFT JOIN posts ON users.id = posts.user_id
WHERE posts.views > 300
GROUP BY users.id 
''')
for row in cursor.fetchall():
    print(row)
conn.close()
