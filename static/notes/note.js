/* =========================================================
   note.js · 学习笔记阅读页
   ---------------------------------------------------------
   四个笔记页共用这一个脚本，差异全写在 <body> 的 data-* 上：
     data-md       Markdown 文件（相对当前页）
     data-title    页头标题
     data-kicker   小标题（PROGRESS / WORK LOG …）
     data-meta     日期 · 时长 · 数量

   它做四件事：
     1) fetch 同目录的 .md → marked 渲染进 .note-body
     2) 去掉 md 里重复的 H1（页头已经显示过一次）
     3) 表格包一层 .note-table（窄屏横向滚动）+ 修 .md 内部链接
     4) 生成左侧目录 + 顶部阅读进度条

   注意：fetch 需要 http(s)，双击 file:// 打开会被浏览器拦。
   ========================================================= */
(function () {
  'use strict'

  var body = document.body
  var mdUrl = body.getAttribute('data-md')
  var explicitTitle = body.getAttribute('data-title') || ''
  var kicker = body.getAttribute('data-kicker') || ''
  var meta = body.getAttribute('data-meta') || ''

  var article = document.getElementById('noteBody')
  var pageTitle = document.getElementById('noteTitle')
  var kickerEl = document.querySelector('.note-kicker')
  var metaEl = document.querySelector('.note-meta')
  var crumbEl = document.querySelector('.note-crumb')
  var tocList = document.getElementById('noteToc')
  var tocBox = tocList ? tocList.closest('.note-toc') : null
  var bar = document.querySelector('.note-progress')

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* 这四篇之间互相引用时，把 .md 链接改成 .html 入口页 */
  var NOTE_PAGES = {
    '进度.md': '进度.html',
    '工作日志.md': '工作日志.html',
    '踩坑记录.md': '踩坑记录.html',
    '反思-业务逻辑分层.md': '反思-业务逻辑分层.html'
  }

  /* ---------- 1. 页头文案 ---------- */
  if (kickerEl && kicker) kickerEl.textContent = kicker
  if (metaEl && meta) metaEl.textContent = meta
  if (explicitTitle && pageTitle) {
    pageTitle.textContent = explicitTitle
    document.title = explicitTitle + ' · 学习笔记'
  }
  if (crumbEl) crumbEl.textContent = '学习笔记 / ' + (explicitTitle || '笔记')

  /* ---------- 2. 顶部阅读进度 ---------- */
  var progressFrame = 0
  function updateProgress() {
    if (!bar) return
    var doc = document.documentElement
    var max = doc.scrollHeight - doc.clientHeight
    var progress = max > 0 ? (window.scrollY || doc.scrollTop) / max : 0
    bar.style.setProperty('--p', (Math.max(0, Math.min(1, progress)) * 100).toFixed(2) + '%')
  }
  function onScroll() {
    if (progressFrame) return
    progressFrame = window.requestAnimationFrame(function () {
      progressFrame = 0
      updateProgress()
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  updateProgress()

  /* ---------- 3. 加载 Markdown ---------- */
  function fail(html) {
    if (!article) return
    article.innerHTML = '<p class="note-error">' + html + '</p>'
  }

  if (!article || !mdUrl) return
  if (!window.marked) {
    fail('Markdown 渲染库没加载出来：检查 <code>../vendor/marked.min.js</code> 是否存在。')
    return
  }

  fetch(encodeURI(mdUrl), { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return res.text()
    })
    .then(function (md) {
      var rawHtml = window.marked.parse(md, { gfm: true, breaks: false })
      if (window.DOMPurify) {
        article.innerHTML = window.DOMPurify.sanitize(rawHtml)
      } else {
        // 万一 HTML 里忘了引入 DOMPurify，降级为纯文本显示，防止被黑
        article.textContent = md 
      }
      enhance()
      updateProgress()
    })
    .catch(function (error) {
      fail(
        '笔记没加载出来：' + error.message + '<br>' +
        '确认 <code>' + mdUrl + '</code> 存在，' +
        '并且页面是通过本地服务器（FastAPI 或 <code>python -m http.server</code>）打开，而不是双击 file://。'
      )
    })

  /* ---------- 4. 渲染后的加工 ---------- */
  function enhance() {
    // md 的第一行 H1 与页头重复，删掉（没有 data-title 时用它兜底）
    var firstH1 = article.querySelector('h1')
    if (firstH1) {
      if (!explicitTitle && pageTitle) {
        pageTitle.textContent = firstH1.textContent.trim()
        document.title = pageTitle.textContent + ' · 学习笔记'
        if (crumbEl) crumbEl.textContent = '学习笔记 / ' + pageTitle.textContent
      }
      firstH1.remove()
    }

    // 表格：包一层，窄屏可以横向滚动而不是撑破纸片
    Array.prototype.forEach.call(article.querySelectorAll('table'), function (table) {
      var wrap = document.createElement('div')
      wrap.className = 'note-table'
      table.parentNode.insertBefore(wrap, table)
      wrap.appendChild(table)
    })

    // 链接：站外新窗口；四篇之间互链的 .md → .html
    Array.prototype.forEach.call(article.querySelectorAll('a[href]'), function (link) {
      var href = link.getAttribute('href') || ''
      if (/^https?:\/\//i.test(href)) {
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
      }
      if (!/\.md(?:#.*)?$/i.test(href)) return

      var hash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#')) : ''
      var name = href.split('#')[0].split('/').pop()
      try { name = decodeURIComponent(name) } catch (error) { /* 保持原样 */ }
      if (NOTE_PAGES[name]) {
        link.setAttribute('href', './' + encodeURI(NOTE_PAGES[name]) + hash)
      }
    })

    buildToc()
  }

  /* ---------- 5. 目录 + 当前章节高亮 ---------- */
  function buildToc() {
    if (!tocList || !tocBox) return

    var heads = article.querySelectorAll('h2, h3')
    if (!heads.length) {
      tocBox.hidden = true
      return
    }

    var fragment = document.createDocumentFragment()
    var links = {}

    Array.prototype.forEach.call(heads, function (heading, index) {
      var id = 'note-sec-' + (index + 1)
      heading.id = id

      var link = document.createElement('a')
      link.href = '#' + id
      link.textContent = heading.textContent.trim()
      link.title = heading.textContent.trim()      // 目录里超长会被省略号截断，悬停看全称
      if (heading.tagName === 'H3') link.classList.add('is-sub')
      link.addEventListener('click', function (event) {
        event.preventDefault()
        heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '#' + id)
        }
      })

      fragment.appendChild(link)
      links[id] = link
    })

    tocList.appendChild(fragment)

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return
          Array.prototype.forEach.call(tocList.children, function (item) {
            item.classList.remove('is-active')
          })
          var current = links[entry.target.id]
          if (current) current.classList.add('is-active')
        })
      }, { rootMargin: '-84px 0px -68% 0px', threshold: 0 })

      Array.prototype.forEach.call(heads, function (heading) { observer.observe(heading) })
    }

    // 从别的页面带 #锚点 进来时，内容刚渲染完，手动补一次定位
    if (window.location.hash) {
      var target = document.getElementById(window.location.hash.slice(1))
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
  }
})()
