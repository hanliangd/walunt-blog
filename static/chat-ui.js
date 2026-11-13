import { streamChat } from './chat-api.js?v=20261027';
const outDiv = document.getElementById('out')
const msgInput = document.getElementById('msg')
const sendBtn = document.getElementById('sent')
const newConvBtn = document.getElementById('newChatBtn')
const appContainer = document.querySelector('.app-container')
const sidebar = document.querySelector('.sidebar')
const collapseSidebarBtn = document.getElementById('collapseSidebarBtn')
const expandSidebarBtn = document.getElementById('expandSidebarBtn')
const sidebarScrim = document.getElementById('sidebarScrim')
const narrowScreen = window.matchMedia('(max-width: 768px)')
let busy = false
let currentConversationId = null
let conversationCache = []
const currentTitleEl = document.getElementById('currentConversationTitle')

function updateCurrentConversationTitle() {
  const current = conversationCache.find(conversation => String(conversation.id) === String(currentConversationId))
  currentTitleEl.textContent = current?.title || '新会话'
}

function setSidebarCollapsed(collapsed) {
  appContainer.classList.toggle('sidebar-collapsed', collapsed)
  sidebar.inert = collapsed
  sidebar.setAttribute('aria-hidden', String(collapsed))
  collapseSidebarBtn.setAttribute('aria-expanded', String(!collapsed))
  expandSidebarBtn.setAttribute('aria-expanded', String(!collapsed))
}

collapseSidebarBtn.addEventListener('click', () => setSidebarCollapsed(true))
expandSidebarBtn.addEventListener('click', () => setSidebarCollapsed(false))

// 窄屏抽屉：点遮罩 / Esc 收回；跨过断点时同步开合状态
sidebarScrim.addEventListener('click', () => setSidebarCollapsed(true))
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && narrowScreen.matches && !appContainer.classList.contains('sidebar-collapsed')) {
    setSidebarCollapsed(true)
  }
})
narrowScreen.addEventListener('change', (event) => setSidebarCollapsed(event.matches))
// 手机上一进页面就收起，否则抽屉会盖住整个聊天区
if (narrowScreen.matches) setSidebarCollapsed(true)

// 渲染会话列表
  function renderConversationList(conversations) {
    const conversationListDiv = document.getElementById('conversationList');
    conversationListDiv.replaceChildren(
      ...conversations.map(conversation => {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.conversationId = conversation.id;
        div.classList.toggle('active', String(conversation.id) === String(currentConversationId));
        div.textContent = conversation.title;
        div.onclick = () => {
          switchConversation(conversation.id);
          // 窄屏选完会话就收回抽屉，直接露出消息区
          if (narrowScreen.matches) setSidebarCollapsed(true)
        };
        return div;
      })
    ); 
}
// 拉会话列表
async function fetchConversations() {
  try {
    const res = await fetch('/api/conversations');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const conversations = await res.json();
    conversationCache = conversations
    renderConversationList(conversations);
    updateCurrentConversationTitle()
    return conversations;
  } catch (e) {
    console.error('Failed to fetch conversations:', e);
    return [];
  }
  
}
// 渲染引用连接
function renderCitations(container, cites) {
  container.replaceChildren(...cites.map((cite, index) => {
    const el = cite.url
      ? Object.assign(document.createElement('a'), {
          href: cite.url, target: '_blank', rel: 'noopener noreferrer' 
        })
      : document.createElement('span')
    el.className = 'citation-badge'
    el.textContent = `[${index + 1}] ${cite.title}`;
    return el
  }))
}
// 切换会话并刷新历史
async function switchConversation(conversationId) {
  currentConversationId = conversationId;
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.classList.toggle('active', item.dataset.conversationId === String(conversationId));
  });
  updateCurrentConversationTitle()
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const messages = await res.json();
    outDiv.replaceChildren(
      ...messages.map(msg => {
        const msgDiv = document.createElement('div');
        msgDiv.className = msg.role === 'user' ? 'user' : 'ai';
        const textSpan = document.createElement('div');
        msgDiv.appendChild(textSpan);
        if (msg.role === 'assistant') {
          textSpan.className = 'note-body'
          textSpan.innerHTML = DOMPurify.sanitize(marked.parse(msg.content))
        } 
        else {
          textSpan.textContent = msg.content
        }
        // 如果有引用，渲染到 msgDiv 里
        if(msg.role === 'assistant' && msg.citations && msg.citations.length > 0){
          const citDiv = document.createElement('div');
          citDiv.className = 'citations-area';
          renderCitations(citDiv, msg.citations);
          msgDiv.appendChild(citDiv);
        }
        return msgDiv;
      })
    );
    outDiv.scrollTop = outDiv.scrollHeight; // 滚动到底部
  }catch (e) {
    console.error('Failed to fetch conversation:', e);
  }
 }
// 新建会话
async function createNewConversation() {
  try {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const conversation = await res.json();
    await fetchConversations(); // 刷新会话列表
    await switchConversation(conversation.id);
  } catch (e) {
    console.error('Failed to create new conversation:', e);
  }
}
newConvBtn.addEventListener('click', async () => {
  await createNewConversation();
  if (narrowScreen.matches) setSidebarCollapsed(true)
});
sendBtn.addEventListener('click', async ()=>{
  if (busy) return
  busy = true
  sendBtn.disabled = true
  const message = msgInput.value.trim()
  if(!message) {
    busy = false;
    sendBtn.disabled = false
    return
  }
  msgInput.value = ''
  try {                                    // ← 把建会话也包进 try
    if (currentConversationId === null) {
      await createNewConversation()        // 它内部会 switch，currentConversationId 就被设好了
    }
  // 渲染用户信息
  const userDiv = document.createElement('div')
  userDiv.className = 'user'
  userDiv.textContent = message
  outDiv.appendChild(userDiv)
  // 渲染AI汽包外壳
  const aiDiv = document.createElement('div')
  aiDiv.className = 'ai'
  outDiv.appendChild(aiDiv)
  // 2. 创建“文字区” span（专门给打字机用）
  const textSpan = document.createElement('div')
  textSpan.className = 'note-body' 
  aiDiv.appendChild(textSpan)
  // 4.加那个闪烁光标（挂在文字区后面）这里不能用const，后续错误路径要重新赋值
  let cursor = document.createElement('span')
  cursor.className = 'cursor'
  textSpan.appendChild(cursor)
  // 3. 创建“引用区” div（专门给链接用）
  const citationsDiv = document.createElement('div')
  citationsDiv.className = 'citations-area'
  aiDiv.appendChild(citationsDiv)
  let aiReply = ''
  // 模块级初始变量
  let lastRenderTime = 0 
  await streamChat(currentConversationId, message,{
    // 1. 接收引用
    onCitations: (cites) => {
      renderCitations(citationsDiv, cites); 
    },
    onChunk : (c) =>{
      aiReply+=c
      const now = Date.now()
      // 每隔 80 毫秒才真正去解析和渲染一次 Markdown，防止浏览器卡死
      if (now - lastRenderTime > 80) {
        lastRenderTime = now;
          
        // 1. 把 Markdown 变成 HTML
        const rawHtml = marked.parse(aiReply);
        // 2. 净化 XSS
        const safeHtml = DOMPurify.sanitize(rawHtml);
        // 3. 塞进 textSpan
        textSpan.innerHTML = safeHtml;
          
        // 4. innerHTML 会清空内部节点，必须把光标重新塞回末尾
        if (!cursor) {
            // 如果光标之前被删了，重新建一个
            cursor = document.createElement('span');
            cursor.className = 'cursor';
          }
      }
      // 更新文字内容后，光标会被覆盖掉，必须重新塞回去
      textSpan.appendChild(cursor)
      outDiv.scrollTop = outDiv.scrollHeight
    },
    onError: (e) => {
      if(cursor)cursor.remove()
      textSpan.textContent += `\n[错误] ${e}`
      if (String(e).includes('401')) {   
      setTimeout(() => { location.href = '/static/login.html?next=' + encodeURIComponent('/static/chat.html') }, 2000);
    }
    },
    onDone: async () => {
    //流结束时，做最后一次终极渲染，确保最后一个字也被正确解析
    const rawHtml = marked.parse(aiReply);
    textSpan.innerHTML = DOMPurify.sanitize(rawHtml);
    // 流结束后，移除光标
    if (cursor) cursor.remove();
    // 轮询检查deepseek生成的标题是否完成
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 500));
      const convs = await fetchConversations();
      const current = convs.find(c => c.id === currentConversationId);
      if (current && current.title && current.title !== '新会话') break;
    }
    }   
  })
  }finally{
   busy = false
   sendBtn.disabled = false
  }
})
// 初始化
async function init() {
  try{
    const res = await fetch("/api/me")
    if(res.ok){
     const user = await res.json()
     document.getElementById('userInfo').textContent = user.username
    }else{
      location.href = '/static/login.html?next=' + encodeURIComponent('/static/chat.html')
    }
  }catch(e){
    document.getElementById('userInfo').textContent = '未登录'
  }
  // 拉取会话列表
  const conversations = await fetchConversations();
  // 如果有会话，默认切换到第一个会话
  if(conversations && conversations.length > 0) {
    switchConversation(conversations[0].id);
  }
}
init();
