from fastapi import FastAPI, HTTPException, Response, Depends
from pydantic import BaseModel, Field, ConfigDict
from fastapi.staticfiles import StaticFiles
import httpx
import os
from dotenv import load_dotenv
from pathlib import Path
from models import SessionLocal, User, Post, SessionToken
from sqlalchemy import select
from security import hash_password
from security import verify_password
from sqlalchemy.exc import IntegrityError
import secrets
from datetime import datetime, timedelta
from dependencies import get_current_user
from fastapi.responses import StreamingResponse
import json
from rate_limit import rate_limit_stream
from models import Conversation, Message
from generate_title import _fill_title
import asyncio

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "blog.db"
static_dir = Path(__file__).resolve().parent / "static"
load_dotenv()
Mykey = os.getenv("MydeepseekKey")
app = FastAPI()
app.mount("/static", StaticFiles(directory=str(static_dir), html=True), name="static")

_bg_tasks: set = set()  # 关键：不留引用，任务可能被 GC 掉


def _spawn(coro):
    t = asyncio.create_task(coro)
    _bg_tasks.add(t)
    t.add_done_callback(_bg_tasks.discard)  # 完成后自动移除，防止集合无限增长


class UserCreat(BaseModel):
    name: str
    age: int


class chatRequest(BaseModel):
    conversation_id: int
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str


class profile(BaseModel):
    name: str
    bio: str
    avatar: str


class stats(BaseModel):
    articles: int
    talks: int
    photos: int


class music(BaseModel):
    title: str
    artist: str
    cover: str
    lyric: str


class photo(BaseModel):
    src: str
    alt: str


class HomepageResponse(BaseModel):
    profile: profile
    stats: stats
    navLinks: list[str]
    music: music
    motto: list[str]
    photos: list[photo]


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    nickname: str | None = None
    avatar: str | None = None
    bio: str | None = None


class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: str
    author: str


class PostCreat(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str | None


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


@app.get("/")
def read_root():
    return {"message": "Hello FastAPI"}


@app.get("/users/{user_id}")
def get_user(user_id: int):
    return {"id": user_id, "name": f"用户{user_id}"}


@app.post("/users")
def create_user(user: UserCreat):
    return {"message": "用户创建成功", "user": user}


@app.get("/api/homepage", response_model=HomepageResponse)
def get_homepage():
    return {
        "profile": {
            "name": "walunt",
            "bio": "大学就读于安徽理工大学信息安全专业25-1班，目标AI全栈工程师。",
            "avatar": "/static/img/IMG_20260710_155439.png",
        },
        "stats": {"articles": 17, "talks": 23, "photos": 7},
        "music": {
            "title": "不问天",
            "artist": "说说Crystal",
            "cover": "/static/img/Camera_XHS_1783947605015.jpg",
            "lyric": "良缘不问天，好事属人间",
        },
        "navLinks": [
            "首页",
            "项目",
            "照片",
            "音乐",
            "关于",
            "好友",
            "杂谈",
            "设置",
            "简介",
            "成就",
        ],
        "motto": ["不", "坠", "青", "云", "之", "志"],
        "photos": [
            {"src": "/static/img/1775056449011.png", "alt": "博客展示图片1"},
            {"src": "/static/img/pixiv_works_147120403_p0.png", "alt": "博客展示图片2"},
            {"src": "/static/img/1780979159506.jpeg", "alt": "博客展示图片3"},
            {"src": "/static/img/120767239_p0.jpg", "alt": "博客展示图片4"},
            {"src": "/static/img/1781077086728.png", "alt": "博客展示图片5"},
            {"src": "/static/img/pixiv_works_138492961_p0.png", "alt": "博客展示图片6"},
            {"src": "/static/img/1780451009835.jpeg", "alt": "博客展示图片7"},
            {"src": "/static/img/1780589451644.jpeg", "alt": "博客展示图片8"},
            {"src": "/static/img/pixiv_works_147004205_p0.png", "alt": "博客展示图片9"},
        ],
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(data: chatRequest, current_user: User = Depends(get_current_user)):
    if not Mykey:
        raise HTTPException(500, "服务配置错误")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={
                    "Authorization": f"Bearer {Mykey}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [{"role": "user", "content": data.message}],
                },
            )
    except httpx.TimeoutException:
        print("[DeepSeek error] 请求超时")
        raise HTTPException(504, "模型服务响应超时")

    except httpx.RequestError as e:
        print(f"[DeepSeek error] 网络错误：{e}")
        raise HTTPException(502, "无法连接模型服务")
    if response.status_code != 200:
        print(f"[Deepseek error]{response.status_code}{response.text}")
        raise HTTPException(502, "模型服务暂时不可用")
    try:
        result = response.json()
        reply = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError):
        print(f"[DeepSeek error] 返回结构异常：{response.text}")
        raise HTTPException(502, "模型返回数据异常")
    return {"reply": reply}


@app.get("/api/get", response_model=list[UserOut])
def get_users():
    with SessionLocal() as session:
        return session.scalars(select(User)).all()


@app.get("/api/post", response_model=list[PostOut])
def get_posts():
    with SessionLocal() as session:
        posts = session.scalars(select(Post)).all()
        return [{"title": p.title, "author": p.author.username} for p in posts]


@app.get("/api/users/{user_id}/post")
def get_user_posts(user_id: int):
    with SessionLocal() as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(404, "用户不存在")
        else:
            return [p.title for p in user.posts]


@app.post("/api/post", status_code=201)
def create_post(data: PostCreat, current_user: User = Depends(get_current_user)):
    with SessionLocal() as session:
        post = Post(title=data.title, content=data.content, users_id=current_user.id)
        session.add(post)
        session.commit()
        session.refresh(post)
        return {"id": post.id, "title": post.title}


@app.delete("/api/post/{post_id}")
def delete_post(post_id: int, current_user: User = Depends(get_current_user)):
    with SessionLocal() as session:
        post = session.scalars(
            select(Post).where(Post.id == post_id, Post.users_id == current_user.id)
        ).first()
        if not post:
            raise HTTPException(404, "文章不存在")
        session.delete(post)
        session.commit()
        return {"message": "删除成功"}


@app.post("/api/register", status_code=201)
def register(data: UserRegister):
    with SessionLocal() as session:
        existing_user = session.scalars(
            select(User).where(User.username == data.username)
        ).first()
        if existing_user:
            raise HTTPException(status_code=409, detail="用户名已被注册")
        else:
            hashed_pwd = hash_password(data.password)
            new_user = User(username=data.username, password_hash=hashed_pwd)
            try:
                session.add(new_user)
                session.commit()
                session.refresh(new_user)
                return {"message": "注册成功", "user_id": new_user.id}
            except IntegrityError:
                session.rollback()
                raise HTTPException(status_code=409, detail="注册失败，用户名冲突")


@app.post("/api/login")
def login(data: UserLogin, response: Response):
    with SessionLocal() as session:
        user = session.scalars(
            select(User).where(User.username == data.username)
        ).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="用户名或密码错误")
        token = secrets.token_urlsafe(32)
        expires_at = (datetime.now() + timedelta(days=7)).isoformat()
        new_session = SessionToken(token=token, user_id=user.id, expires_at=expires_at)
        session.add(new_session)
        session.commit()
        response.set_cookie(
            key="session_token",
            value=token,
            httponly=True,
            samesite="lax",
            max_age=7 * 24 * 3600,
        )
        return {"message": "登录成功", "username": user.username}


@app.get("/api/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/api/chat/stream")
async def chat_stream(
    data: chatRequest, current_user: User = Depends(rate_limit_stream)
):
    if not Mykey:
        raise HTTPException(500, "服务配置错误")
    # 检查会话是否存在且属于当前用户
    with SessionLocal() as session:
        conversation = session.scalars(
            select(Conversation).where(
                Conversation.id == data.conversation_id,
                Conversation.user_id == current_user.id,
            )
        ).first()
        if not conversation:
            raise HTTPException(404, "会话不存在")
        # 存用户信息
        user_msg = Message(
            conversation_id=data.conversation_id, role="user", content=data.message
        )
        session.add(user_msg)
        # 更新会话时间
        conversation.updated_at = datetime.now()
        # 检查是否需要生成标题
        need_title = (not conversation.title) or (conversation.title == "新会话")
        if need_title:
            conversation.title = data.message[:20]
        session.commit()
        # 获取历史消息
        history = session.scalars(
            select(Message)
            .where(Message.conversation_id == data.conversation_id)
            .order_by(Message.id.desc())
            .limit(20)
        ).all()
        history.reverse()
        while history and history[0].role != "user":
            history.pop(0)
        messages_for_deepseek = [
            {"role": msg.role, "content": msg.content} for msg in history
        ]

    async def gen():
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, read=60.0)
            ) as client:
                async with client.stream(
                    "POST",
                    "https://api.deepseek.com/chat/completions",
                    headers={"Authorization": f"Bearer {Mykey}"},
                    json={
                        "model": "deepseek-chat",
                        "messages": messages_for_deepseek,
                        "stream": True,
                        "max_tokens": 1024,
                    },
                ) as r:
                    if r.status_code != 200:
                        body = await r.aread()  # 👈 读出上游错误体
                        print(
                            f"[DeepSeek error] 上游返回 {r.status_code}: {body.decode()}"
                        )
                        yield f"data: {json.dumps({'error': '模型服务暂时不可用'})}\n\n"
                        yield "data: [DONE]\n\n"
                        return
                    # ai_reply 用于存储完整的 AI 回复内容，最后存入数据库
                    ai_reply = ""
                    async for line in r.aiter_lines():
                        if not line:
                            continue
                        if "[DONE]" in line:
                            yield "data: [DONE]\n\n"
                            break
                        if line.startswith("data:"):
                            json_str = line.removeprefix("data:").strip()
                            try:
                                chunk = json.loads(json_str)
                                content = chunk["choices"][0]["delta"]["content"]
                                if not content:
                                    continue
                                ai_reply += content
                                yield f"data: {json.dumps({'content': content} , ensure_ascii=False)}\n\n"
                            except (json.JSONDecodeError, KeyError, IndexError):
                                print(f"[解析失败] {json_str}")
                                continue
                    # 将 AI 回复存入数据库
                    if ai_reply:
                        with SessionLocal() as session:
                            ai_msg = Message(
                                conversation_id=data.conversation_id,
                                role="assistant",
                                content=ai_reply,
                            )
                            session.add(ai_msg)
                            session.commit()
                    # 异步生成标题
                    if need_title:
                        _spawn(
                            _fill_title(
                                api_key=Mykey,
                                conversation_id=data.conversation_id,
                                user_message=data.message,
                                ai_reply=ai_reply,
                            )
                        )
        except httpx.TimeoutException:
            yield f"data: {json.dumps({'error': '模型服务响应超时'})}\n\n"
            yield "data: [DONE]\n\n"
        except httpx.RequestError as e:
            print(f"[DeepSeek error] 网络错误：{e}")
            yield f"data: {json.dumps({'error': '无法连接模型服务'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.post("/api/conversations", status_code=201)
def create_conversation(current_user: User = Depends(get_current_user)):
    with SessionLocal() as session:
        conversation = Conversation(user_id=current_user.id, title="新会话")
        session.add(conversation)
        session.commit()
        session.refresh(conversation)
        return {
            "id": conversation.id,
            "created_at": conversation.created_at.isoformat(),
            "title": conversation.title,
        }


@app.get("/api/conversations")
def list_conversations(current_user: User = Depends(get_current_user)):
    with SessionLocal() as session:
        convs = session.scalars(
            select(Conversation)
            .where(Conversation.user_id == current_user.id)
            .order_by(Conversation.updated_at.desc())
        ).all()
        return [
            {
                "id": conv.id,
                "title": conv.title,
                "updated_at": conv.updated_at.isoformat(),
            }
            for conv in convs
        ]


@app.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: int, current_user: User = Depends(get_current_user)
):
    with SessionLocal() as session:
        conversation = session.scalars(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == current_user.id,
            )
        ).first()
        if not conversation:
            raise HTTPException(404, "会话不存在")
        messages = session.scalars(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.id.asc())
        ).all()
        return [{"role": msg.role, "content": msg.content} for msg in messages]
