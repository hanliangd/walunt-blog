import os, chromadb
from dotenv import load_dotenv
from rag_index import DashScopeEmbedding  # 复用你写的那个类

load_dotenv()
emb = DashScopeEmbedding(os.getenv("MyDashscopeKey"))

client = chromadb.PersistentClient(path=r"E:\测试\FastAPItest\.chroma")
col = client.get_or_create_collection("blog", embedding_function=emb)
print("库里有", col.count(), "块")

queries = [
    "return 后面的代码不执行",
    "字段名拼错导致接口 500",
    "怎么给接口加限流",
    "多轮对话怎么存历史",
]

for q in queries:
    r = col.query(
        query_texts=[q], n_results=3, include=["documents", "metadatas", "distances"]
    )
    print()
    print("==", q)
    for doc, md, d in zip(r["documents"][0], r["metadatas"][0], r["distances"][0]):
        print(
            "   cos=%+.3f  [%s] %s"
            % (1 - d * d / 2, md["source"][:24], md["heading"][:30])
        )
        print("      %s" % doc.replace("\n", " ")[:70])
