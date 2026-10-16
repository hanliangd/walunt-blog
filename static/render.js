async function loadHomepage() {
  try{ 
    const res = await fetch("/api/homepage")
    if(!res.ok){
      throw new Error(`接口返回 ${res.status}`)
    }
    const data = await res.json()
    document.querySelector('.profile h2').textContent = data.profile.name
    document.querySelector('.profile p').textContent = data.profile.bio
    document.querySelector('.column1 .img img').src = data.profile.avatar
    const statSpans = document.querySelectorAll('.count a span:first-child')
    if(statSpans.length >= 3) {
            statSpans[0].textContent = data.stats.articles
            statSpans[1].textContent = data.stats.talks
            statSpans[2].textContent = data.stats.photos
    }
    const navContainer = document.querySelector('.nav')
    if (navContainer) {
        navContainer.replaceChildren(...data.navLinks.map(text => {
            const a = document.createElement('a')
            a.href = ''
            a.className = 'nav1'
            a.textContent = text
            return a
        }))
        const firstLink = navContainer.querySelector('a')
        if (firstLink) firstLink.style.color = 'var(--color-bule)'
    }
    const musicSrc = document.querySelector('.song img')
        const musicName = document.querySelector('.media-name h2')
        const musicWriter = document.querySelector('.media-name span')
        const musicSong = document.querySelector('.content2 p')
        musicSrc.src = data.music.cover
        musicName.textContent = data.music.title
        musicWriter.textContent = data.music.artist
        musicSong.textContent = data.music.lyric
    const mottoSpans = document.querySelectorAll('.subject span')
        data.motto.forEach((elm, index) => {
          mottoSpans[index].textContent = elm
    })
    // 带 > ：只取「照片格」本身。原来不带 > 会把 render.js 生成的进度点 div 也当成照片格排进来，
    // 照片会被数错格（第 3 格拿不到接口图）
    const photoItems = document.querySelectorAll('.picture li > div')
        let photoIndex = 0
        for (let i = 0; i < Math.min(3, photoItems.length); i++) {
            const div = photoItems[i]
            const imgs = div.querySelectorAll('img')
            for (let j = 0; j < imgs.length && photoIndex < data.photos.length; j++) {
                imgs[j].src = data.photos[photoIndex].src
                imgs[j].alt = data.photos[photoIndex].alt
                photoIndex++
            }
        }
  }
  catch(e){
    console.error('接口失败:', e)
    document.querySelector('.profile h2').textContent = '内容加载失败'
    document.querySelector('.profile p').textContent = '请刷新页面重试'
  }
}
document.addEventListener('DOMContentLoaded',function(){
  loadHomepage()
})
// ===== 背景图交叉淡入（结构同 xhs卡片示例.html：B 层每 8s 切一次 .is-on） =====
// 放在 lodash 那段之前：即使后面的 CDN 没加载成功，背景轮播也不会受影响
const bgB = document.getElementById('bgB')
if (bgB) {
    setInterval(function(){ bgB.classList.toggle('is-on') }, 8000)
}
let lastScrollY = window.scrollY;
const navbar = document.querySelector('header .head')
function handleScroll(){
  const currentScrollY = window.scrollY
   if (currentScrollY > lastScrollY) {
      navbar.classList.add('hidden');
    } else {
      navbar.classList.remove('hidden');
    }
    lastScrollY = currentScrollY;
}
// lodash 是 CDN 引入的：万一没加载成功（断网 / 被拦），下面这行原本会直接抛错，
// 把脚本后面的照片墙（进度点 + .is-active 切图）一起带走 —— 所以加个兜底
const onScroll = (typeof _ !== 'undefined' && typeof _.throttle === 'function')
  ? _.throttle(handleScroll, 200)
  : handleScroll
window.addEventListener('scroll', onScroll)
// ===== 深色模式切换（第 4 格那张原站「翻转圆盘卡」）=====
// 圆盘两层渐变互推、emoji 换位全部由 CSS 负责：给 <html> 挂上 data-theme 之后，
// index修改版.css 里那组覆盖规则会把 ☀️/🌙 和两层渐变一起换过来
//（card.css 第 5 节原样保留，方向由本页覆盖成"卡面 = 当前所处模式"）。
// 所以 JS 只做两件事：翻转主题 + 换卡上那两行文案
//（原来在这里找 <button> 改 iconfont 图标的那段，已随自制按钮一起删掉）。
// 卡面语义 = 此刻正处于哪个模式（不是"点一下会去哪"）：
//   浅色 → 日间模式 / 晨光熹微 + ☀️ ；深色 → 夜间模式 / 更阑人静 + 🌙
const THEME_CARD = {
    light: { title: '日间模式', sub: '晨光熹微' },   // 页面浅色 = 当前处于日间模式
    dark:  { title: '夜间模式', sub: '更阑人静' }    // 页面深色 = 当前处于夜间模式
};
function applyThemeText(theme) {
    const text = THEME_CARD[theme] || THEME_CARD.light;
    const card = document.querySelector('#themeCard');
    if (!card) return;
    card.querySelector('.theme-title').textContent = text.title;
    card.querySelector('.theme-sub').textContent = text.sub;
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    applyThemeText(next);
}
const themeCard = document.querySelector('#themeCard');
themeCard?.addEventListener('click', toggleTheme);
// 原站那张卡是 role="button"，键盘也得能用（Enter / 空格）
themeCard?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
    }
});
// 页面加载时恢复用户偏好，并让卡上文字跟着一起同步
// （不写这句会出现「深色页面 + 晨光熹微」这种错配）
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    applyThemeText(savedTheme);
}
// ===== 照片墙：右下角进度点（手动点 / 自动播放走同一个函数；三格各走各的进度） =====
// 1) 每个格子里 3 张图上下叠着放，"谁有 .is-active 谁就显示"（淡入淡出写在 index修改版.css，原 CSS 的 change 动画已撤掉）
// 2) 每格右下角生成 3 个进度点（= 每格 3 张图），点第 n 个只切"这一格"，别的格子不动，
//    进度点也只高亮这一格的（原站是每格 animation-delay 各自错开，三格从来不会停在同一个进度上）
// 3) 自动播放不另写一套逻辑：定时器到点直接 dot.click()，也就是「自动触发点击函数」，
//    所以手点和自动轮播共用 dot 上的 click 处理函数，不会两套逻辑互相打架
// 4) 自动 / 手动都不再"三格同步"：每格一个 index、每格一个定时器，
//    起始图与第一跳时刻再按格号错开，复刻原站 0s / 1.5s / 3s 的错位效果
function initPhotoWall() {
  const wall = document.querySelector('header .picture')
  if (!wall) return

  // 前 3 格是照片；第 4 格是模式卡（翻转圆盘），不参与
  const cells = Array.from(wall.querySelectorAll('li:nth-child(-n+3) > div'))
    .filter((div) => div.querySelector('img'))
  if (!cells.length) return

  const AUTO_MS = 5000                          // 自动切换间隔（原 CSS 是 15s 轮 3 张 = 5s 一张）
  const STAGGER = true                          // true = 每格起始图/起始时刻都错开（原站那种错位）；
                                                // 改成 false 就是三格都从第 1 张、同一时刻开始
  const canAuto = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const items = []                              // 每格一份：{ div, imgs, dots, index, timer, delay }

  // 切到"这一格"的第 i 张：只动这一格，只亮这一格的进度点
  function showPhoto(item, i) {
    const imgs = item.imgs
    item.index = (i + imgs.length) % imgs.length
    for (let k = 0; k < imgs.length; k++) {
      imgs[k].classList.toggle('is-active', k === item.index)
    }
    item.dots.forEach((dot, k) => {
      dot.classList.toggle('is-on', k === item.index)
    })
  }

  // 自动播放：到点就"点"这一格的下一个进度点，和手点完全同一条路
  // delay = 第一跳等多久（只用来把三格的节奏错开），之后每隔 AUTO_MS 跳一次
  function play(item, delay = 0) {
    clearTimeout(item.delay)
    clearInterval(item.timer)
    if (!canAuto) return                        // 系统开了「减少动态效果」就只保留手动点
    item.delay = setTimeout(() => {
      item.timer = setInterval(() => {
        const next = item.dots[(item.index + 1) % item.dots.length]
        if (next) next.click()
      }, AUTO_MS)
    }, delay)
  }

  // 生成进度点（每格一份，贴在右下角；重复调用不会重复生成）
  cells.forEach((div) => {
    const imgs = Array.from(div.querySelectorAll('img'))
    const item = { div, imgs, dots: [], index: 0, timer: null, delay: null }
    items.push(item)

    // 万一以后再调一次（热重载之类），先把旧进度点清掉，别出现两份
    const old = div.querySelector('.picture-dots')
    if (old) old.remove()

    const box = document.createElement('div')
    box.className = 'picture-dots'
    for (let i = 0; i < imgs.length; i++) {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.className = 'picture-dot'
      dot.dataset.index = i
      dot.setAttribute('aria-label', `第 ${i + 1} / ${imgs.length} 张`)
      // 手动点进度点：只切这一格 → 只给这一格重新计时（自动播放也是走这个函数）
      dot.addEventListener('click', () => {
        showPhoto(item, i)
        play(item)
      })
      box.appendChild(dot)
      item.dots.push(dot)                       // 数组下标 = 这一格里的图片序号
    }
    div.appendChild(box)
  })

  // 初始：每格显示自己那张 —— 错开时第 i 格从第 i 张开始
  //（原站那套 animation-delay 0s / 1.5s / 3s 的错位，效果就是"三格进度不一样"）
  const step = items.length || 1
  items.forEach((item, i) => {
    showPhoto(item, STAGGER ? i % item.imgs.length : 0)
    play(item, STAGGER ? i * (AUTO_MS / step) : 0)   // 第一跳也错开，三格不会在同一秒一起换
  })
}
initPhotoWall()