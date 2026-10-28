from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import func
from sqlalchemy import ForeignKey
from sqlalchemy import CheckConstraint
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import event
from datetime import datetime
from sqlalchemy import DateTime

BASE_DIR = Path(__file__).resolve().parent


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(unique=True)
    nickname: Mapped[str | None]
    password_hash: Mapped[str]
    avatar: Mapped[str | None]
    bio: Mapped[str | None]
    created_at: Mapped[str] = mapped_column(server_default=func.current_timestamp())
    posts: Mapped[list["Post"]] = relationship(back_populates="author")


class Post(Base):
    __tablename__ = "posts"
    id: Mapped[int] = mapped_column(primary_key=True)
    users_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str]
    content: Mapped[str | None]
    status: Mapped[str] = mapped_column(server_default="draft")
    likes: Mapped[int] = mapped_column(server_default=text("0"))
    views: Mapped[int] = mapped_column(server_default=text("0"))
    created_at: Mapped[str] = mapped_column(server_default=func.current_timestamp())
    published_at: Mapped[str | None]
    __table_args__ = (CheckConstraint("likes >= 0", name="ck_likes_non_negative"),)
    author: Mapped["User"] = relationship(back_populates="posts")


class Tags(Base):
    __tablename__ = "tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)


class Post_Tag(Base):
    __tablename__ = "post_tags"
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)


class SessionToken(Base):
    __tablename__ = "sessions"
    token: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[str] = mapped_column(server_default=func.current_timestamp())
    expires_at: Mapped[str]


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(
        CheckConstraint("role IN ('user', 'assistant')", name="ck_role_valid")
    )
    content: Mapped[str]
    citations: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


DB_PATH = BASE_DIR / "blog.db"
engine = create_engine(f"sqlite:///{DB_PATH.as_posix()}")


@event.listens_for(engine, "connect")
def _enable_sqlite_fk(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
print("建好了:", DB_PATH)
