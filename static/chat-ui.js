import { streamChat } from './chat-api.js';
const outDiv = document.getElementById('out')
const msgInput = document.getElementById('msg')
const sendBtn = document.getElementById('sent')
const newConvBtn = document.getElementById('newChatBtn')
let busy = false
let currentConversationId = null
// 渲染会话列表
  function renderConversationList(conversations) {
    const conversationListDiv = document.getElementById('conversationList');
    conversationListDiv.replaceChildren(
      ...conversations.map(conversation => {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.textContent = conversation.title;
        div.onclick = () => switchConversation(conversation.id);
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
    renderConversationList(conversations);
    return conversations;
  } catch (e) {
    console.error('Failed to fetch conversations:', e);
    return [];
  }
  
}
// 切换会话并刷新历史
async function switchConversation(conversationId) {
  currentConversationId = conversationId;
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
        msgDiv.textContent = msg.content;
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
newConvBtn.addEventListener('click', createNewConversation);
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
  // 渲染AI的信息
  const aiDiv = document.createElement('div')
  aiDiv.className ='ai'
  const initialCursor = document.createElement('span')
  initialCursor.className = 'cursor'
  aiDiv.appendChild(initialCursor)
  outDiv.appendChild(aiDiv)
  await streamChat(currentConversationId, message,{
    onChunk : (c) =>{
      const oldCursor = aiDiv.querySelector('.cursor');
      if (oldCursor) oldCursor.remove();
      aiDiv.textContent += c
      const newCursor = document.createElement('span')
      newCursor.className = 'cursor';
      aiDiv.appendChild(newCursor);
      outDiv.scrollTop = outDiv.scrollHeight
    },
    onError: (e) => {
      aiDiv.textContent += `\n[错误] ${e}`
      if (String(e).includes('401')) {   
      setTimeout(() => { location.href = '/static/login.html?next=' + encodeURIComponent('/static/chat.html') }, 2000);
    }
    },
    onDone: async () => {
    // 流结束后，移除光标
    const cursor = aiDiv.querySelector('.cursor');
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
     document.getElementById('userInfo').textContent = `👤 ${user.username}`
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