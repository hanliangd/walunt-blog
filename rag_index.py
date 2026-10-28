import httpx, re, sqlite3, glob, os, chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

BASE = Path(__file__).resolve().parent
DB = BASE / "blog.db"
NOTES = BASE / "static" / "notes"
CHROMA = BASE / ".chroma"


class DashScopeEmbedding(EmbeddingFunction):
    def __init__(self, api_key, model="text-embedding-v3"):
        self.api_key = api_key
        self.model = model

    def __call__(self, input: Documents) -> Embeddings:
        out = []
        for i in range(0, len(input), 10):  # ① 分批，单次 ≤10
            r = httpx.post(
                "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "input": list(input[i : i + 10]),
                    "dimensions": 1024,
                },
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()["data"]
            data.sort(key=lambda d: d["index"])  # 保序
            out += [d["embedding"] for d in data]
        return out


def split_md(text):
    # 按## / ###切块，返回[(heading, chunk_text)]
    pat = re.compile(r"^(#{2,3})\s+(.+)$", re.M)
    marks = list(pat.finditer(text))
    out = []
    if not marks:  # ← 没有标题 → 整篇当一个块
        body = text.strip()
        if len(body) >= 20:
            out.append(("（全文）", body))
        return out
    intro = text[: marks[0].start()]
    intro = re.sub(r"^#\s+.*$", "", intro, count=1, flags=re.M).strip()  # 去掉 md 的 H1
    if len(intro) >= 20:
        out.append(("（前言）", intro))
    for i, m in enumerate(marks):
        start = m.start()
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        heading = m.group(2).strip()
        body = text[m.end() : end].strip()
        if len(body) < 20:  # 太短的丢掉
            continue
        out.append((heading, f"{heading}\n\n{body}"))
    return out


if __name__ == "__main__":
    docs, metas, ids = [], [], []

    # 读posts
    con = sqlite3.connect(
        f"file:{DB.as_posix()}?mode=ro", uri=True
    )  # ← .as_posix() 关键（SQLite URI 要正斜杠）
    for pid, title, content in con.execute(
        "SELECT id, title, content FROM posts WHERE status='published'"
    ):
        for j, (h, chunk) in enumerate(split_md(content)):
            docs.append(chunk)
            metas.append(
                {
                    "source": f"post:{title}",
                    "heading": h,
                    "url": f"/static/post_detail.html?id={pid}",
                }
            )
            ids.append(f"post-{pid}-{j}")
    con.close()

    # 读笔记
    for path in glob.glob(os.path.join(NOTES, "*.md")):
        # 在文件绝对地址中取出文件名
        name = os.path.basename(path)
        # 1. 把 .md 替换成 .html
        html_name = name.replace(".md", ".html")
        # 2. 拼出前端能访问的 URL（/static/notes/踩坑记录.html）
        note_url = f"/static/notes/{html_name}"
        text = open(path, encoding="utf-8").read()
        for j, (h, chunk) in enumerate(split_md(text)):
            docs.append(chunk)
            metas.append({"source": f"notes/{name}", "heading": h, "url": note_url})
            ids.append(f"note-{name}-{j}")

    print("待写入块数:", len(docs))

    emb = DashScopeEmbedding(os.getenv("MyDashscopeKey"))
    client = chromadb.PersistentClient(path=str(CHROMA))
    try:
        client.delete_collection("blog")  # ② 换模型先删库
        print("旧库已删 ✓")
    except Exception as e:
        print("旧库删除跳过:", type(e).__name__)
    col = client.get_or_create_collection("blog", embedding_function=emb)
    col.upsert(documents=docs, metadatas=metas, ids=ids)
    print("写完:", col.count(), "块")
