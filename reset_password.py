# 用法: python reset_password.py <用户名> <新密码>
import sys
from sqlalchemy import select
from models import SessionLocal, User
from security import hash_password

if len(sys.argv) != 3:
    print("用法: python reset_password.py <用户名> <新密码>")
    sys.exit(1)

username, new_password = sys.argv[1], sys.argv[2]

with SessionLocal() as session:
    user = session.scalars(select(User).where(User.username == username)).first()
    if not user:
        print("没有这个用户:", username)
        sys.exit(1)
    user.password_hash = hash_password(new_password)
    session.commit()
    print("已重置:", username)
