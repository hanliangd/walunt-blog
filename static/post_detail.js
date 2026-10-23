// 1. 从 URL 获取文章 ID
const urlParams = new URLSearchParams(window.location.search)
const postId = urlParams.get('id')
// 2. 获取 DOM 元素
const titleEl = document.getElementById('postTitle')
const metaEl = document.getElementById('postMeta')
const contentEl = document.getElementById('postContent')
const crumbEl = document.getElementById('crumb')
const progressBar = document.getElementById('progressBar')
async function loadPostDetail() {
  if(!postId){
    titleEl.textContent = "错误：缺少文章 ID"
    return
  }
  try{
    // 请求后端接口
    const res = await fetch(`/api/post/${postId}`)
    if (!res.ok) throw new Error("文章不存在或加载失败")
    const post = await res.json()
    // 渲染数据
    document.title = `${post.title} - 宝藏之地`
    titleEl.textContent = post.title
    crumbEl.textContent = `我的文章 / ${post.title}`
    metaEl.textContent = `作者：${post.author} | 发布于：${post.created_at ? post.created_at.slice(0, 10) : '刚刚'}`
    //核心：Markdown 转换与防 XSS 清洗
    const rawHtml = marked.parse(post.content)
    const safeHtml = DOMPurify.sanitize(rawHtml)
    // 插入页面
    contentEl.innerHTML = safeHtml;
    contentEl.classList.remove('note-loading'); // 移除加载提示样式
    renderIndex()
    scrollTitle()
  }catch (e) {
    titleEl.textContent = "加载失败";
    contentEl.replaceChildren(); // 清空
    const p = document.createElement('p');
    p.style.color = 'red';
    p.textContent = e.message;   // 👈 纯文本，绝对安全
    contentEl.appendChild(p);
  }
  //此处用innerHTML会造成理论上的XSS，但概率极低，因为e.message内容不可填写，无法植入恶意脚本,但我还是用了textcontent
}
// 简单的滚动进度条逻辑（和笔记页一样）function updateProgress() {
function updateProgress() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.setProperty('--p', `${progress}%`);
    }
    window.addEventListener('scroll', updateProgress, { passive: true });

    // 启动
    loadPostDetail();
function renderIndex() {
  const tocList = document.getElementById('noteToc')   // ←  HTML:25 的 id
  const tocBox  = document.getElementById('tocBox')    // ←  HTML:23 的 id
  const heads   = contentEl.querySelectorAll('h2, h3') // ← 在正文容器里查

  if (!heads.length) { tocBox.hidden = true; return }   // 没标题就藏卡片

  heads.forEach((h, i) => {
    const id = 'sec-' + i
    h.id = id

    const a = document.createElement('a')
    a.href = '#' + id
    a.textContent = h.textContent.trim()
    a.className = 'toc-item'
    if (h.tagName === 'H3') a.classList.add('toc-sub')
    a.addEventListener('click', (e) => {
      e.preventDefault()
      h.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    tocList.appendChild(a)                              // ← 注意是 tocList
  })
}
function scrollTitle(){
  const tocList = document.getElementById('noteToc')
  const heads   = contentEl.querySelectorAll('h2, h3') 
  const links = [...tocList.children]
  const obs = new IntersectionObserver((entries)=>{
    for (const e of entries) {
    if (!e.isIntersecting) continue
    // 每次有一个标题进入视野，先把所有目录的高亮清空
    links.forEach(l => l.classList.remove('is-active'))
    // 找到与当前标题对应的那个目录链接，加高亮
    const cur = links.find(l => l.hash === '#' + e.target.id)
    if (cur) cur.classList.add('is-active')
    }
  }, { rootMargin: '-84px 0px -70% 0px' })// 顶部留出导航条的高度
  heads.forEach(h => obs.observe(h))
}