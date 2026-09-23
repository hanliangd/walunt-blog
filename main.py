from fastapi import FastAPI , HTTPException
from pydantic import BaseModel , Field ,ConfigDict
from fastapi.staticfiles import StaticFiles
import httpx
import os
from dotenv import load_dotenv
from pathlib import Path
from models import SessionLocal, User,Post
from sqlalchemy import select
BASE_DIR = Path(__file__).resolve().parent
DB_PATH  = BASE_DIR / "blog.db"
static_dir = Path(__file__).resolve().parent / "static"
load_dotenv()
Mykey = os.getenv("MydeepseekKey")
app = FastAPI()
app.mount("/static", StaticFiles(directory=str(static_dir),html=True), name="static")
class UserCreat(BaseModel):
    name: str
    age: int
class chatRequest(BaseModel):
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
    title:str = Field(min_length=1, max_length=100)
    content: str | None
@app.get("/")
def read_root():
    return {"message": "Hello FastAPI"}
@app.get("/users/{user_id}")
def get_user(user_id:int):
    return{"id": user_id, "name": f"用户{user_id}"}
@app.post("/users")
def create_user(user:UserCreat):
    return {"message": "用户创建成功", "user": user}
@app.get("/api/homepage",response_model=HomepageResponse)
def get_homepage():
    return{
        "profile":{
            "name": "walunt",
            "bio": "大学就读于安徽理工大学信息安全专业25-1班，目标AI全栈工程师。",
            "avatar": "/static/img/IMG_20260710_155439.png"
        },
        "stats":{
            "articles": 17,
            "talks": 23,
            "photos": 7
        },
        "music":{
            "title": '不问天',
            "artist": '说说Crystal',
            "cover": "/static/img/Camera_XHS_1783947605015.jpg",
            "lyric": '良缘不问天，好事属人间'
        },
        "navLinks": ["首页", "项目", "照片", "音乐", "关于", "好友", "杂谈", "设置", "简介", "成就"],
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
            {"src": "/static/img/pixiv_works_147004205_p0.png", "alt": "博客展示图片9"}
        ] 
    }
@app.post("/chat",response_model=ChatResponse)
async def chat(data:chatRequest):
    if not Mykey:
        raise HTTPException(500 ,"服务配置错误")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
               "https://api.deepseek.com/chat/completions",
               headers={
                   "Authorization": f"Bearer {Mykey}",
                    "Content-Type": "application/json"
               },
               json={
                   "model":"deepseek-chat",
                   "messages":[
                       {"role": "user", "content": data.message}
                   ]
               }
            )
    except httpx.TimeoutException:
            print("[DeepSeek error] 请求超时")
            raise HTTPException(504, "模型服务响应超时")
    
    except httpx.RequestError as e:
            print(f"[DeepSeek error] 网络错误：{e}")
            raise HTTPException(502, "无法连接模型服务")
    if response.status_code != 200:
        print(f"[Deepseek error]{response.status_code}{response.text}")
        raise HTTPException(502,"模型服务暂时不可用")
    try:
      result = response.json()
      reply = result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError):
        print(f"[DeepSeek error] 返回结构异常：{response.text}")
        raise HTTPException(502, "模型返回数据异常")
    return {"reply": reply}
@app.get("/api/get",response_model=list[UserOut])
def get_users():
    with SessionLocal() as session:
        return session.scalars(select(User)).all()
@app.get("/api/post",response_model=list[PostOut])
def get_posts():
    with SessionLocal() as session:
        posts = session.scalars(select(Post)).all()
        return [{"title": p.title, "author": p.author.username} for p in posts]    
@app.get("/api/users/{user_id}/post")
def get_user_posts(user_id:int):
    with SessionLocal() as session:
        user = session.get(User , user_id)
        if not user:
          raise HTTPException(404,"用户不存在")
        else: 
          return[p.title for p in user.posts]
@app.post("/api/post", status_code=201)
def creat_post(data:PostCreat):
    with SessionLocal() as session:
        post = Post(title=data.title,content=data.content,users_id=1)
        session.add(post)
        session.commit()
        session.refresh(post)
        return{"id": post.id, "title": post.title}
