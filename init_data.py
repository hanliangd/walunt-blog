from models import SessionLocal, User, Post
from sqlalchemy import select

with SessionLocal() as session:
    existing_user = session.scalars(select(User)).first()
    if existing_user:
        print("数据库里已经有数据了，跳过初始化。")
    else:
        u1 = User(username="walunt", nickname="小韩", password_hash="hash123")
        u2 = User(username="alice", nickname="爱丽丝", password_hash="hash456")
        p1 = Post(title="我的第一篇", content="Hello World", author=u1)
        p2 = Post(title="FastAPI 踩坑", content="...", author=u1)
        p3 = Post(title="SQL 入门", content="...", author=u2)
        session.add_all([u1, u2, p1, p2, p3])
        session.commit()
        print("测试数据插入成功！")