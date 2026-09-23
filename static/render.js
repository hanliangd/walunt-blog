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
    const photoItems = document.querySelectorAll('.picture li div')
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
window.addEventListener('scroll',  _.throttle(handleScroll, 200) )
// ===== 深色模式切换 =====
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    
    // 根据当前主题更新按钮文字和图标
    const btnText = document.querySelector('header .picture li:nth-child(4) div button p');
    const btnIcon = document.querySelector('header .picture li:nth-child(4) div button .iconfont');
    
    if (next === 'dark') {
        btnText.textContent = '夜间模式';
        btnIcon.innerHTML = '&#xe6e4;';  // 月亮图标
    } else {
        btnText.textContent = '日间模式';
        btnIcon.innerHTML = '&#xe6eb;';  // 太阳图标（你原来的）
    }
}
document.querySelector('#themeToggle')?.addEventListener('click', toggleTheme);
// 页面加载时恢复用户偏好
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}