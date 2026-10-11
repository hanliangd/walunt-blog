import { streamChat } from './chat-api.js';
const outDiv = document.getElementById('out')
const msgInput = document.getElementById('msg')
const sendBtn = document.getElementById('sent')
let busy = false
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
  try{
   await streamChat(message,{
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
     onDone: () => {
    // 流结束后，移除光标
      const cursor = aiDiv.querySelector('.cursor');
      if (cursor) cursor.remove();
     }
  })
  }finally{
   busy = false
   sendBtn.disabled = false
  }
})
async function checkLogin() {
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
}
checkLogin()