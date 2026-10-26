import os, chromadb
from dotenv import load_dotenv
from rag_index import DashScopeEmbedding

load_dotenv()
emb = DashScopeEmbedding(os.getenv("MyDashscopeKey"))
client = chromadb.PersistentClient(path=r"E:\测试\FastAPItest\.chroma")


def rag_search(question, k=3):
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
    for doc, meta in zip(r["documents"][0], r["metadatas"][0]):
        hits.append({"doc": doc, "meta": meta})
    return hits
