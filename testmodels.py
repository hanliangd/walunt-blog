import sqlite3
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent
for name in ("blog.db", "blog_orm.db"):
    print(f"===== {name} =====")
    conn = sqlite3.connect(BASE_DIR / name)
    for row in conn.execute("SELECT sql FROM sqlite_master WHERE type='table'"):
        print(row[0])
        print()
    conn.close()