import httpx, re, sqlite3, glob, os, chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from dotenv import load_dotenv

load_dotenv()

DB = r"E:\测试\FastAPItest\blog.db"
NOTES = r"E:\测试\FastAPItest\static\notes"
CHROMA = r"E:\测试\FastAPItest\.chroma"


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
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    for pid, title, content in con.execute(
        "SELECT id, title, content FROM posts WHERE status='published'"
    ):
        for j, (h, chunk) in enumerate(split_md(content)):
            docs.append(chunk)
            metas.append({"source": f"post:{title}", "heading": h})
            ids.append(f"post-{pid}-{j}")
    con.close()

    # 读笔记
    for path in glob.glob(os.path.join(NOTES, "*.md")):
        name = os.path.basename(path)
        text = open(path, encoding="utf-8").read()
        for j, (h, chunk) in enumerate(split_md(text)):
            docs.append(chunk)
            metas.append({"source": f"notes/{name}", "heading": h})
            ids.append(f"note-{name}-{j}")

    print("待写入块数:", len(docs))

    emb = DashScopeEmbedding(os.getenv("MyDashscopeKey"))
    client = chromadb.PersistentClient(path=CHROMA)
    try:
        client.delete_collection("blog")  # ② 换模型先删库
        print("旧库已删 ✓")
    except Exception as e:
        print("旧库删除跳过:", type(e).__name__)
    col = client.get_or_create_collection("blog", embedding_function=emb)
    col.upsert(documents=docs, metadatas=metas, ids=ids)
    print("写完:", col.count(), "块")
