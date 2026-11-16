# FastAPI 项目核心概念与测试笔记

> 项目：Walunt's Blog  
> 项目路径：`E:\测试\FastAPItest`  
> 整理日期：2026-11-16  
> 目的：把 FastAPI 应用实例、lifespan、ASGI、TestClient、pytest、SQLAlchemy 时间字段等概念，和当前项目代码对应起来。

---

## 1. 先建立整体心智模型

你的项目不是单纯的后端 API，也不是一个前端框架项目。它由几层组成：

```text
浏览器
  ├─ HTML / CSS / 原生 JavaScript
  ├─ fetch 普通 JSON 请求
  └─ fetch + ReadableStream 接收 SSE 流
        ↓
联网协议：HTTP
        ↓
ASGI 服务器：uvicorn
        ↓
ASGI 应用：FastAPI 的 app 对象
        ↓
中间件 → 路由 → 依赖注入 → Pydantic 校验 → 处理函数
        ↓
SQLite / SQLAlchemy / Chroma / DeepSeek / 阿里云百炼
```

在本项目中：

- `main.py` 创建 FastAPI 应用并注册大部分路由。
- `models.py` 定义 SQLAlchemy ORM 模型并创建数据库引擎。
- `dependencies.py` 负责基于 Session Cookie 的登录认证。
- `security.py` 负责 Argon2 密码哈希与验证。
- `rate_limit.py` 负责普通请求限流和流式请求并发限制。
- `rag.py` 在提问时检索 Chroma 向量库。
- `rag_index.py` 离线切分文章和笔记、生成 embedding、重建索引。
- `static/` 是原生前端代码。

---

## 2. FastAPI 应用实例到底是什么

### 2.1 `app = FastAPI()` 是什么

```python
app = FastAPI(
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)
```

这行代码创建的是一个 FastAPI 应用对象，它既：

1. 保存应用配置和路由表。
2. 保存中间件、异常处理器和依赖覆盖关系。
3. 支持 lifespan 生命周期。
4. 实现 ASGI 异步调用接口 `__call__(scope, receive, send)`。

它不是一个普通函数，也不是“一次请求处理函数”，而是整个应用容器。

### 2.2 为什么说它是 ASGI 可调用对象

ASGI 应用的核心约定是：

```python
async def app(scope, receive, send):
    ...
```

`scope` 包含请求元数据，`receive` 用于接收事件，`send` 用于发送响应事件。

uvicorn 不会在启动时只调用一次 `app()`。它的实际行为更接近：

```text
启动：调用 app(lifespan_scope, receive, send)
请求：每个请求调用 app(http_scope, receive, send)
关闭：再次通过 lifespan 发送关闭事件
```

### 2.3 一个 HTTP 请求的 scope 大致包含什么

```python
{
    "type": "http",
    "asgi": {"version": "3.0"},
    "http_version": "1.1",
    "method": "GET",
    "scheme": "http",
    "path": "/api/post",
    "query_string": b"",
    "headers": [...],
    "server": ("127.0.0.1", 8000),
    "client": ("127.0.0.1", 53421),
}
```

FastAPI 根据 scope 里的路径、HTTP 方法和参数决定调用哪个处理函数。

---

## 3. 哪些代码自动执行，哪些必须自己调用

### 3.1 导入 `main.py` 时

Python 会按顺序执行模块顶层代码：

```python
app = FastAPI(...)

@app.get("/api/homepage", response_model=HomepageResponse)
def get_homepage():
    ...
```

装饰器在模块导入时会自动执行，把：

```text
GET /api/homepage → get_homepage
```

登记进 `app.routes`。

类似地，以下代码也会在导入时执行：

```python
load_dotenv(...)
engine = create_engine(...)
Base.metadata.create_all(engine)
```

这里要注意：**路由函数被注册，不等于它被调用**。

### 3.2 uvicorn 请求到来时

请求匹配成功后，FastAPI 会自动完成：

```text
app.__call__
  → 中间件
  → 路由匹配
  → 依赖注入
  → 参数校验
  → 路由处理函数
  → response_model 序列化
  → HTTP 响应
```

例如：

```python
@app.get("/api/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
```

请求 `GET /api/me` 时：

1. 路由被匹配。
2. FastAPI 发现参数依赖 `get_current_user`。
3. 自动调用 `get_current_user()`。
4. 依赖通过后调用 `get_me()`。

### 3.3 哪些动作是自动的

| 对象/动作 | 触发时机 | 是否自动 |
|---|---|---|
| `@app.get` 路由注册 | 导入模块 | 自动执行装饰器 |
| `app.__call__` | 每个 ASGI 请求 | uvicorn 自动调用 |
| 中间件 | 请求经过应用 | 注册后按请求自动调用 |
| 路由函数 | 路径和 HTTP 方法匹配 | 自动调用 |
| `Depends(...)` 依赖 | 某请求声明了依赖 | 按请求自动调用 |
| 异常处理器 | 抛出了匹配的异常 | 自动调用 |
| lifespan 前半段 | 应用启动 | 配置后自动执行一次 |
| lifespan 后半段 | 应用关闭 | 配置后自动执行一次 |
| `/openapi.json` | 被请求且 docs 开启 | 按需生成 OpenAPI |

### 3.4 哪些动作必须自己调用或配置

| 动作 | 说明 |
|---|---|
| `app.add_middleware(...)` | 必须先注册中间件 |
| `app.include_router(...)` | 必须显式包含子路由 |
| `app.dependency_overrides[...] = ...` | 测试中手动替换依赖 |
| `Base.metadata.create_all(engine)` | 建表或 lifespan 中手动执行 |
| `engine.dispose()` | 关闭时手动释放连接池 |
| `rag_index.py` | 手动运行以重建向量索引 |
| `generated_title` 后台任务 | 聊天处理函数主动创建 |
| `app.openapi()` | 文档请求或手动导出时生成 |
| 数据库迁移 | Alembic 或迁移脚本负责 |

---

## 4. lifespan：应用级启动与关闭

### 4.1 它不是 `with FastAPI()` 的语法

FastAPI 不靠下面的写法：

```python
with FastAPI() as app:
    ...
```

lifespan 是一个异步上下文管理函数，作为参数传给构造函数：

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(app: FastAPI):
    # yield 之前：启动时执行一次
    app.state.ready = True

    yield

    # yield 之后：关闭时执行一次
    app.state.ready = False


app = FastAPI(lifespan=lifespan)
```

### 4.2 当前项目的实际状态

当前 `main.py` 创建 `FastAPI(...)` 时没有传 `lifespan`，因此没有自定义应用级启动、关闭逻辑。

当前 `models.py` 在模块顶层执行：

```python
Base.metadata.create_all(engine)
```

所以它是“导入模块时执行”，不是 lifespan：

```python
from main import app
```

即使不启动 uvicorn，这个行为也会发生。

### 4.3 本地开发可考虑的 lifespan 写法

下面只是重构示例，不代表当前代码：

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from models import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 本地开发：创建缺失的表
    Base.metadata.create_all(engine)
    app.state.cache_ready = True

    yield

    app.state.cache_ready = False
    engine.dispose()


app = FastAPI(lifespan=lifespan)
```

生产环境更推荐 Alembic，不应依赖 `create_all` 自动改表。

### 4.4 lifespan 和请求依赖的区别

| 机制 | 生命周期 |
|---|---|
| lifespan | 整个应用启动到关闭，执行一次 |
| `Depends(...)` | 每个请求执行 |
| `Depends` 中 `yield` | 请求进入前执行，响应结束后执行清理 |
| WebSocket | 每个连接执行 |

当前 `rate_limit_stream` 就是请求级 yield 依赖：

```python
async def rate_limit_stream(current_user: User = Depends(get_current_user)):
    active_streams[user_id] += 1
    try:
        yield current_user
    finally:
        active_streams[user_id] -= 1
```

它会在流结束时自动减少并发计数，不是应用关闭时执行。

---

## 5. 异步传输机制：从 uvicorn 到 FastAPI

### 5.1 异步不是把同步代码自动放进后台

在 `async def` 函数中，同步阻塞操作仍会阻塞事件循环。

例如同步数据库查询、同步文件读取、同步网络请求，都会占用当前事件循环线程。

### 5.2 当前项目的异步边界

聊天路由定义成异步函数：

```python
@app.post("/api/chat/stream")
async def chat_stream(...):
    ...
```

调用 DeepSeek 时使用异步客户端：

```python
async with httpx.AsyncClient(...) as client:
    async with client.stream(
        "POST",
        "https://api.deepseek.com/chat/completions",
        json={...},
    ) as response:
        async for line in response.aiter_lines():
            ...
```

这里的关键点：

1. `AsyncClient` 不阻塞事件循环地等待网络。
2. `client.stream(...)` 不会立即把完整响应读完。
3. `aiter_lines()` 逐行接收上游 SSE 数据。
4. 每个内容块通过 `yield` 继续包装成自己的 SSE 响应。

### 5.3 SSE 流式链路

```text
浏览器 fetch
  ↓
POST /api/chat/stream
  ↓
FastAPI 路由完成认证、限流、RAG 检索
  ↓
返回 StreamingResponse(gen(), media_type="text/event-stream")
  ↓
gen() 内部打开 DeepSeek 流
  ↓
收到一块 content
  ↓
yield 一个 data: JSON
  ↓
浏览器 ReadableStream 解码并逐块显示
```

### 5.4 为什么流内错误必须写成事件

一旦返回了：

```python
return StreamingResponse(gen(), media_type="text/event-stream")
```

HTTP 状态通常已经确定为 200。

如果 DeepSeek 在传输中途超时，不能再把响应改成 500，只能向流中写入：

```text
data: {"error": "模型服务响应超时"}
data: [DONE]
```

这是当前代码中 `httpx.TimeoutException` 和 `httpx.RequestError` 分支存在的原因。

### 5.5 为什么要用 `asyncio.to_thread`

当前 RAG 查询：

```python
hits = await asyncio.to_thread(rag_search, data.message, 3)
```

`rag_search` 内部使用同步 Chroma 客户端。放入线程池后，事件循环可以继续处理其他请求。

但当前 `chat_stream` 里也有同步 SQLAlchemy 查询。在轻量个人项目里通常能用，但高并发时同样可能阻塞事件循环。长期可考虑：

- 同步路由交给线程池；
- 使用异步数据库驱动；
- 或显式用 `asyncio.to_thread` 包装明确的同步数据库操作。

---

## 6. TestClient 是什么

### 6.1 进程内 ASGI 客户端

```python
from fastapi.testclient import TestClient
from main import app


with TestClient(app) as client:
    response = client.get("/api/homepage")
    assert response.status_code == 200
```

TestClient 底层通过 httpx 的进程内 ASGI 传输调用 FastAPI：

```text
测试代码
  ↓
TestClient / httpx
  ↓
ASGI scope、receive、send
  ↓
FastAPI app
```

它不经过真实 TCP 端口、DNS、防火墙、nginx 或 TLS。

### 6.2 和真实 httpx 请求的区别

| 使用方式 | 是否需要 uvicorn | 是否走网络 |
|---|---|---|
| `TestClient(app).get(...)` | 不需要 | 不走 |
| `httpx.get("http://127.0.0.1:8000/...")` | 需要 | 走 |

### 6.3 为什么用 `with TestClient(app)`

```python
with TestClient(app) as client:
    ...
```

进入 with 时会发送 ASGI lifespan 启动事件，离开时会发送关闭事件。

如果项目以后配置了 lifespan，测试中又需要启动和关闭资源，就必须使用上下文管理器。

### 6.4 TestClient 存 Cookie

```python
def test_login_and_me(client, test_user):
    login = client.post(
        "/api/login",
        json={"username": test_user.username, "password": "correct-password"},
    )
    assert login.status_code == 200

    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.json()["username"] == test_user.username
```

同一个 TestClient 会保存服务端设置的 `session_token` Cookie。

### 6.5 TestClient 不能替代什么

它不能完整验证：

- uvicorn 是否能启动；
- 80 或 8000 端口是否开放；
- 系统防火墙和云安全组；
- nginx 缓冲与 SSE 转发；
- HTTPS 证书；
- 浏览器 JavaScript 和页面布局；
- 真实公网延迟；
- systemd 自动重启。

这些仍要通过浏览器、`curl.exe` 和线上环境验证。

---

## 7. pytest：把“手动试一次”变成可重复测试

### 7.1 当前项目测试现状

项目内目前有：

- `test.py`：异常类型演示脚本；
- `testmodels.py`：打印数据库表结构；
- `testmodeldata.py`：查看数据库数据；

这些不是正式的 pytest 测试套件：

- 没有 `test_` 开头的测试函数；
- 没有 `tests/` 目录；
- 没有 `conftest.py`；
- `requirements.txt` 还没有 pytest；
- 测试脚本会直接操作或查看真实数据库。

### 7.2 安装和运行

```powershell
cd E:\测试\FastAPItest
.\.venv\Scripts\python.exe -m pip install pytest
.\.venv\Scripts\python.exe -m pytest -q
```

### 7.3 最基本的测试

```python
from rag_index import split_md


def test_split_md_without_heading():
    result = split_md("# 标题\n\n这是一段超过二十个字符的正文内容。")
    assert result
```

pytest 使用普通 `assert`。失败时会输出表达式两边的值。

`assert` 适合测试和内部不变量，不适合正式权限校验。Python 使用 `-O` 运行时，assert 会被移除。

### 7.4 fixture 不是必需的

纯函数测试不需要 fixture：

```python
def test_split_md():
    assert split_md("普通正文") == []
```

需要共享资源或清理逻辑时才用 fixture：

```python
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
```

fixture 负责准备，assert 负责判断。

### 7.5 parametrize

```python
import pytest
from rag_index import split_md


@pytest.mark.parametrize(
    "text, minimum_chunks",
    [
        ("普通正文内容足够长，应该形成一个全文块。", 1),
        ("## 标题\n\n这是超过二十个字符的正文内容。", 1),
        ("太短", 0),
    ],
)
def test_split_md_cases(text, minimum_chunks):
    assert len(split_md(text)) >= minimum_chunks
```

### 7.6 测试异常

```python
import pytest
from dependencies import get_current_user
from fastapi import HTTPException


def test_missing_cookie():
    with pytest.raises(HTTPException) as error:
        get_current_user(None)

    assert error.value.status_code == 401
```

### 7.7 monkeypatch 避免真实外部请求

```python
def test_rag_without_network(monkeypatch):
    import main

    monkeypatch.setattr(main, "rag_search", lambda question, k: [])
    assert main.rag_search("测试", 3) == []
```

这只能验证替换行为。真正测试聊天流时，还需要替换 `httpx.AsyncClient`，或把上游客户端做成可注入依赖。

---

## 8. 测试数据库隔离

### 8.1 不能直接使用真实 `blog.db`

当前 `models.py` 在导入时连接 `blog.db` 并执行 `create_all`。

如果接口测试直接使用它，可能导致：

- 真实文章被修改；
- 登录会话被删除；
- 测试用户混入开发数据库；
- 测试顺序影响结果。

### 8.2 当前代码可先采用的测试夹具思路

下面示例用于说明，不是当前代码的现成实现：

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import main
import dependencies
from models import Base


@pytest.fixture
def test_client(tmp_path, monkeypatch):
    db_file = tmp_path / "test.db"
    test_engine = create_engine(f"sqlite:///{db_file.as_posix()}")
    TestingSession = sessionmaker(bind=test_engine)

    Base.metadata.create_all(test_engine)

    monkeypatch.setattr(main, "SessionLocal", TestingSession)
    monkeypatch.setattr(dependencies, "SessionLocal", TestingSession)

    with TestClient(main.app) as client:
        yield client

    test_engine.dispose()
```

这能避免测试请求查询真实数据库，但导入 `main` 时，`models.py` 顶层仍会先连接真实 `blog.db` 并执行 `create_all`。

因此更长期的方案是把数据库配置改成可注入的环境变量或应用工厂，并把 `create_all` 移出模块导入阶段。

### 8.3 推荐的正式结构

```text
tests/
├─ conftest.py
├─ test_homepage.py
├─ test_posts.py
├─ test_auth.py
├─ test_conversations.py
└─ test_rag.py
```

---

## 9. 适合当前项目的测试清单

### 文章公开性

- `GET /api/post` 只返回 `status="published"` 的文章。
- `GET /api/post/{id}` 对草稿返回 404。
- 不存在的文章返回 404。

### 认证

- 没有 Cookie 请求 `/api/me` 返回 401。
- 不存在 token 返回 401。
- 过期 token 返回 401。
- 正确登录后，同一 TestClient 可以访问 `/api/me`。

### 越权

- 用户 A 删除用户 B 的文章返回 404。
- 用户 A 读取用户 B 的会话消息返回 404。

### 纯函数

- `split_md` 对普通全文返回一个块。
- `split_md` 对有 `##`、`###` 的文本正确切块。
- 过短的块被过滤。

### RAG

- 低于相似度阈值的检索结果被过滤。
- `rag_search` 返回 `doc`、`meta`、`cos`。

### 流式接口

- 未登录请求在进入生成器之前返回普通 401 JSON。
- 不存在的会话返回 404。
- 用假上游客户端模拟正常内容块和 `[DONE]`。
- 用假上游客户端模拟超时、断网和非 200。

### 当前环境变量

- `ALLOW_REGISTER=0` 时注册接口返回 404。
- `ENABLE_DOCS=0` 时 `/docs`、`/redoc`、`/openapi.json` 不存在。
- `ENABLE_DOCS=1` 时才开放文档。

---

## 10. SQLAlchemy：`Mapped[datetime]` 与 `mapped_column`

当前 `models.py` 已经完成时间类型改造：

```python
expires_at: Mapped[datetime] = mapped_column(DateTime)
```

### 10.1 两种写法

```python
expires_at: Mapped[datetime]
```

SQLAlchemy 会根据注解自动创建隐式 `mapped_column`，推断：

- 数据库类型：DATETIME；
- `Mapped[datetime]`：NOT NULL；
- `Mapped[datetime | None]`：允许 NULL。

```python
expires_at: Mapped[datetime] = mapped_column(DateTime)
```

显式指定数据库类型，但简单场景下最终 DDL 与上一种相同。

### 10.2 什么时候必须显式 `mapped_column`

需要配置额外选项时：

```python
expires_at: Mapped[datetime] = mapped_column(
    DateTime,
    default=datetime.now,
    index=True,
)
```

### 10.3 `create_all` 不会修改已有表

SQLite 已有 `sessions` 表时，只修改 ORM 注解，不会把数据库列自动从 TEXT 改成 DATETIME。

真实迁移还需要：

1. 备份 `blog.db`；
2. 使用 Alembic 或重建表；
3. 转换旧数据；
4. 重新测试查询和写入。

### 10.4 时间基要一致

当前项目存在两种时间来源：

- `server_default=func.current_timestamp()`：SQLite 通常按 UTC；
- `datetime.now()`：本地时间，且不带时区。

两者混用可能出现 8 小时偏移。

长期建议统一使用带时区的 UTC：

```python
from datetime import datetime, timezone

now = datetime.now(timezone.utc)
```

但 SQLite 对时区保存能力有限，改之前必须做完整数据迁移和测试。

---

## 11. 回环地址、内网地址和 HTTP

### 回环地址

`127.0.0.1`：

- 请求不离开本机；
- 同一台电脑上的浏览器可以访问；
- 手机和其他电脑不能访问。

### 内网地址

常见形式：

- `192.168.x.x`
- `10.x.x.x`
- `172.16.x.x`

同一 Wi-Fi 下的设备可能访问，但仍不是公网地址。

### `0.0.0.0`

它是监听所有网卡的绑定地址，不是浏览器访问地址。

```powershell
uvicorn main:app --host 127.0.0.1 --port 8000
```

只有本机能访问。

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```

同一局域网设备可能通过电脑内网 IP 访问。

### 本地 HTTP 与 HTTPS

本地面板使用：

```text
http://127.0.0.1:8765/
```

回环流量不出本机，不需要 TLS 证书。

公网博客则应该使用 HTTPS，避免密码、Cookie 和聊天内容在互联网上明文传输。

---

## 12. 本地用量工具与 FastAPI 的对比

为 Codex 排查每次回答用量时使用的 `live_usage.py` 没有 FastAPI 框架，而是：

```python
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
```

它的路由不是装饰器，而是手动判断：

```python
if parsed.path == "/":
    ...
if parsed.path == "/api/sessions":
    ...
if parsed.path == "/api/usage":
    ...
```

前端 HTML、CSS、JavaScript 内嵌在 Python 字符串中，浏览器通过 fetch 请求 JSON。

与 FastAPI 的对应关系：

| FastAPI | 标准库 HTTP 服务 |
|---|---|
| `@app.get("/api/post")` | 手动比较 `parsed.path` |
| uvicorn | `ThreadingHTTPServer` |
| Pydantic 校验 | 自己检查 JSON |
| 自动文档 | 无 |
| `StreamingResponse` | 手动写响应体 |

这个工具使用标准库是为了：

- 不增加依赖；
- 不上传日志；
- 本机只读；
- 代码规模较小。

它不适合直接替代生产 Web 框架。

---

## 12.1 补充：Codex、DeepSeek 与 ChatGPT Work

### Codex 与模型不是同一层

- **Codex**：桌面应用和编码智能体框架，负责工具调用、读写文件、运行命令、管理技能与会话。
- **DeepSeek**：当前配置中的模型提供商，负责理解问题和生成回答。

本机 Codex 配置大致是：

```toml
model = "deepseek-flash"
model_provider = "deepseek"

[model_providers.deepseek]
base_url = "https://api.deepseek.com/"
```

因此：

- 模型推理请求主要发往 DeepSeek；
- Codex 应用自身的登录、更新、模型目录等仍可能访问其他服务；
- 如果本机网络需要代理，应该按域名分流，不要把 DeepSeek 和 Codex 的服务混成同一类流量。

### ChatGPT Work 与 Codex 的选择

| 入口 | 主要定位 |
|---|---|
| ChatGPT Work | 通用工作、调研、简报、文档、演示文稿、表格和可交付成果 |
| Codex | 直接进入代码工作区，修改代码、运行命令、测试、调试和验证 |

两者能力有重叠。当前项目中的代码修改、TestClient 测试和本地调试优先使用 Codex；PPT、正式报告、通用调研可用 ChatGPT Work。

### Codex 生命周期钩子

Codex 的 Hooks 是在特定生命周期自动运行本地命令的机制：

- `SessionStart`：会话开始；
- `SessionEnd`：主会话结束；
- `PreToolUse`、`PostToolUse`：工具调用前后；
- `Stop`：一轮回答停止时。

本项目用量面板使用：

- 开始钩子执行 `lifecycle.py start`；
- 结束钩子执行 `lifecycle.py schedule-stop`；
- supervisor 负责监视 Codex 程序是否退出。

Codex 首次遇到新的、非受管理的钩子时会弹出“审查钩子”，这是要求用户确认是否信任会执行的本机命令，不是代码测试或病毒扫描。钩子记录会和当前定义绑定，定义变化后可能需要重新审查。

### 本地用量数据从哪里来

Codex 会把会话事件写入本地 JSONL：

```text
%USERPROFILE%\.codex\sessions\
```

其中的事件可能包含：

- 用户消息；
- 助手过程说明和最终回答；
- 每次模型调用的 token usage；
- 缓存输入 token；
- 上下文窗口信息。

`live_usage.py` 根据这些事件计算：

```text
缓存命中率 = cached_input_tokens / input_tokens
```

它只读取本机文件，面板绑定到 `127.0.0.1`，不会把会话上传到外部服务器。

---

## 13. 常见误区

| 误区 | 正确理解 |
|---|---|
| `app = FastAPI()` 会自动执行启动初始化 | 没有配置 lifespan 就没有自定义启动逻辑 |
| 装饰器定义后，处理函数马上运行 | 装饰器只注册路由，请求到来时才运行 |
| `async def` 里的所有代码都不会阻塞 | 同步数据库、文件、网络操作仍会阻塞事件循环 |
| TestClient 会启动真实服务器 | 它在进程内通过 ASGI 调用应用 |
| TestClient 自动执行 lifespan | 需要使用 `with TestClient(app)` |
| fixture 是每个测试必需的 | 只有需要准备或清理资源时才需要 |
| assert 可以用来做权限校验 | assert 可能被 `python -O` 移除，正式校验应显式 `raise` |
| `create_all` 会迁移已有表 | 它只创建缺失的表，不负责修改已有列 |
| 日志只保存当前上下文 | Codex 会话 JSONL 会持续增长，本地面板需要增量读取 |
| `127.0.0.1` 是内网 IP | 它是本机回环地址，局域网设备不能访问 |

---

## 14. 建议的下一步

### 第一步：先写纯函数测试

- `split_md`
- 缓存命中率计算
- token 百分比计算
- 其他无数据库、无网络的函数

### 第二步：建立临时数据库 fixture

- 使用 `tmp_path`
- 统一替换 `SessionLocal`
- 每个测试独立数据库
- 测试结束释放 engine

### 第三步：测试认证和权限

- 未登录 401
- 已登录 200
- 越权 404
- 草稿 404

### 第四步：最后测试流式接口

流式测试成本最高，应先把认证、数据库和纯逻辑测试稳定下来。

不要一开始就测试真实 DeepSeek 网络请求，因为测试会：

- 消耗额度；
- 受网络波动影响；
- 结果不稳定；
- 失败时难以区分是代码还是上游服务。

---

## 15. 官方参考资料

- [FastAPI Lifespan Events](https://fastapi.tiangolo.com/advanced/events/)
- [FastAPI Testing Events: lifespan](https://fastapi.tiangolo.com/advanced/testing-events/)
- [Starlette TestClient](https://www.starlette.io/testclient/)
- [SQLAlchemy Declarative Table Configuration](https://docs.sqlalchemy.org/en/20/orm/declarative_tables.html)
- [pytest Getting Started](https://docs.pytest.org/en/stable/getting-started.html)
- [pytest Fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- [ASGI Specification](https://asgi.readthedocs.io/en/latest/specs/main.html)

---

## 16. 一句话总结

**FastAPI 应用是被 uvicorn 按 ASGI 协议调用的应用容器；路由和依赖负责单次请求，lifespan 负责整个应用的启动与关闭；TestClient 在进程内模拟 ASGI 请求，pytest 则把这些手动验证固化成可重复、可隔离的测试。**
