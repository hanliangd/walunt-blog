// static/status-bar.js —— 两个独立块：当前时间 / 运行天数
const START = new Date('2026-09-13T00:00:00+08:00').getTime();  // ⚠️ 必须带时区，写 '2026-09-13' 会按 UTC 算，差 8 小时
const clockEl  = document.getElementById('clock');
const uptimeEl = document.getElementById('uptime');
const pad = n => String(n).padStart(2, '0');

function tick() {
  const now = new Date();
  clockEl.textContent  = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  uptimeEl.textContent = Math.floor((now.getTime() - START) / 86400000) + ' 天';
}
tick();                                                                    // 先填一次，别让人看到 00:00:00 闪一下
setInterval(() => { if (!document.hidden) tick(); }, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });