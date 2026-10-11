from collections import defaultdict, deque
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from models import User
from dependencies import get_current_user
# request_history[user_id] = deque([时间戳1, 时间戳2, ...])
request_history = defaultdict(deque)
# active_streams[user_id] = 当前正在跑的流数量
active_streams = defaultdict(int)
# 2. 滑动窗口检查（每分钟请求数）
def check_rate_limit(user_id: int, max_requests: int = 10, window_seconds: int = 60):
  """
    滑动窗口：只统计最近 window_seconds 秒内的请求。
    超过 max_requests 就抛 429。
  """
  now = datetime.now()
  window_start = now - timedelta(seconds=window_seconds)
  history = request_history[user_id]
  # 1. 删掉窗口外的旧时间戳
  while history and history[0] < window_start:
    history.popleft()
  # 2. 检查窗口内请求数
  if len(history) >= max_requests:
    raise HTTPException(429, "请求过于频繁，请稍后再试")
  # 3. 记录本次请求
  history.append(now)
# 3. 流式接口的依赖：限并发流数
async def rate_limit_stream(current_user: User = Depends(get_current_user)):
  """
    流式接口专用的限流依赖。
    - yield 之前：检查每分钟请求数 + 并发流数
    - yield 之后：减并发数（流结束后才执行）
  """
  user_id = current_user.id
  # 1. 检查每分钟请求数
  check_rate_limit(user_id, max_requests=10, window_seconds=60)
  # 不要加await挂起协程，防止并发请求的流的数量超过系统限制
  if active_streams[user_id] >= 2:
    raise HTTPException(429, "你已经有 2 条流在跑了，请等一条结束")
  active_streams[user_id] += 1
  try:
    yield current_user
  finally:
    active_streams[user_id] -= 1