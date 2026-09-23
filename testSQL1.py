import sqlite3, os
print('当前工作目录:', os.getcwd())
print('数据库绝对路径:', os.path.abspath('blog.db'))
print('文件存在吗:', os.path.exists('blog.db'))
conn = sqlite3.connect('blog.db')
tables = [r[0] for r in conn.execute(
    "SELECT name FROM sqlite_master WHERE type='table'")]
print('里面有哪些表:', tables)
conn.close()