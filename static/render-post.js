async function loadRealArticles() {
  const container = document.getElementById('article-list')
  try{
    const res = await fetch('/api/post');
    if (!res.ok) throw new Error('获取文章失败');
    const posts = await res.json();

    if (posts.length === 0) {
      container.textContent = '暂时还没有文章，快去写一篇吧！';
      return;
    }
    container.replaceChildren(
      ...posts.map((post , index)=>{
        // 1. 最外层卡片 a 标签
        const a = document.createElement('a');
        a.className = 'card note-card';
        a.href = `./post_detail.html?id=${post.id}`; 
        const colors = ['var(--indigo)', 'var(--indigo-400)', 'var(--pink)', 'var(--purple)'];
        a.style = `--tone: ${colors[index % colors.length]}`;
        // 2. 顶部的 Badge 徽章
        const badge = document.createElement('span');
        badge.className = 'note-badge';
        // 这里内部是 SVG 图标和文字，SVG 是静态的，我们可以安全地用 innerHTML 放进去
        badge.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>`;
        // 后面追加安全的文本
        badge.appendChild(document.createTextNode(' 最新发布'));
        const title = document.createElement('h3');
        title.className = 'note-title';
        title.textContent = post.title; 

        // 4. 描述（绝对安全，只用 textContent）
        const desc = document.createElement('p');
        desc.className = 'note-desc';
        desc.textContent = `作者：${post.author}。点击查看完整正文...`;

        // 5. 底部元信息（稍微复杂点，里面有图标）
        const meta = document.createElement('span');
        meta.className = 'note-meta';
                  
        const dateSpan = document.createElement('span');
        dateSpan.innerHTML = `<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg> `;
        dateSpan.appendChild(document.createTextNode('刚刚'));

        const tag = document.createElement('span');
        tag.className = 'note-tag';
        tag.textContent = '全栈开发';

        meta.appendChild(dateSpan);
        meta.appendChild(tag);

        // 6. 底部的“阅读全文”
        const go = document.createElement('span');
        go.className = 'note-go';
        go.textContent = '阅读全文 →';

        // 7. 把所有拼好的零件装进卡片
        a.appendChild(badge);
        a.appendChild(title);
        a.appendChild(desc);
        a.appendChild(meta);
        a.appendChild(go);

        return a;
      }
      )
    )
  
  }catch(e){
    console.error(e);
    container.textContent = '加载文章失败，请刷新重试';
    }
  }
loadRealArticles();