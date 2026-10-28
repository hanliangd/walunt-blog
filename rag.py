import os, chromadb
from dotenv import load_dotenv
from rag_index import DashScopeEmbedding
from pathlib import Path

CHROMA = Path(__file__).resolve().parent / ".chroma"
load_dotenv()
emb = DashScopeEmbedding(os.getenv("MyDashscopeKey"))
client = chromadb.PersistentClient(path=CHROMA)


def rag_search(question, k=3, min_cos=0.45):
    # 去Chroma里搜相关的资料
    # 每次都拿最新的 collection：索引重建后 UUID 会变，模块级句柄会失效
    col = client.get_or_create_collection("blog", embedding_function=emb)
    r = col.query(
        query_texts=[question],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )
    # 把查到的原文和元数据打包返回
    hits = []
    for doc, meta, dist in zip(r["documents"][0], r["metadatas"][0], r["distances"][0]):
        cos = 1 - dist * dist / 2  # chromadb 默认 L2 + 归一化向量
        if cos < min_cos:
            continue
        hits.append({"doc": doc, "meta": meta, "cos": cos})
    return hits
