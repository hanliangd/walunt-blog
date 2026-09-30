from fastapi import Cookie, HTTPException
from datetime import datetime
from models import SessionLocal, SessionToken, User
def get_current_user(session_token:str|None = Cookie(default=None)):
  if not session_token:
    raise HTTPException(401,"未登录")
  with SessionLocal() as session:
    selectsession = session.get(SessionToken ,session_token)
    if not selectsession:
      raise HTTPException(401,"登录已失效")
    if selectsession.expires_at < datetime.now().isoformat():
      raise HTTPException(401,"登录已过期")
    user = session.get(User , selectsession.user_id)
    if not user:
            raise HTTPException(401, "用户不存在")   
    return user
    