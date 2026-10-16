import httpx
import re
from sqlalchemy import select
from models import SessionLocal, Conversation

TITLE_PROMPT = (
    "你是会话标题生成器。读下面的对话，输出一个 4-12 个字的中文标题。"
    "直接输出标题本身：不要引号、不要句号、不要 markdown、不要任何解释。"
    "专业名词保留原文（如 FastAPI、SSE）。\n"
    "示例：\n"
    "对话：用户问怎么给接口加限流，我讲了滑动窗口和并发槽\n"
    "标题：接口限流实现\n"
    "对话：用户说 VS Code 很卡，我建议排除大目录\n"
    "标题：VS Code 性能优化"
)


def _clean_title(t: str) -> str:
    t = t.strip()
    t = re.sub(r"^(标题|Title)\s*[:：]\s*", "", t)  # 去“标题：”前缀
    t = t.splitlines()[0] if t else ""  # 只取第一行
    t = t.strip("\"'“”‘’《》【】()（）.。,，!！?？")  # 去首尾引号标点
    return t[:20]  # 最后再兜底截断


async def generate_title(api_key: str, user_message: str, ai_reply: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            r = await client.post(
                "https://api.deepseek.com/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": TITLE_PROMPT},
                        {
                            "role": "user",
                            "content": f"用户：{user_message}\nAI：{ai_reply[:300]}\n\n请给出标题。",
                        },
                    ],
                    "max_tokens": 24,
                    "stream": False,
                },
            )
            if r.status_code == 200:
                print(
                    f"Title generated successfully: {r.json()['choices'][0]['message']['content'].strip()}"
                )
                return _clean_title(r.json()["choices"][0]["message"]["content"])
            else:
                print(f"Error generating title: {r.status_code} - {r.text}")
                return None
    except Exception as e:
        print(f"Exception occurred while generating title: {e}")


async def _fill_title(
    api_key: str, conversation_id: int, user_message: str, ai_reply: str
):
    try:
        title = await generate_title(
            api_key=api_key, user_message=user_message, ai_reply=ai_reply
        )
        if not title:
            print("No title generated.")
            return
        with SessionLocal() as session:
            result = session.get(Conversation, conversation_id)
            if result:
                result.title = title
                session.commit()
                print(f"Title updated for conversation {conversation_id}: {title}")
            else:
                print(f"Conversation with ID {conversation_id} not found.")
    except Exception as e:
        print(f"[title] 失败: {e}")
