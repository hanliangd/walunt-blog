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
  outDiv.appendChild(aiDiv)
  try{
   await streamChat(message,{
     onChunk : (c) =>{
       aiDiv.textContent += c
       outDiv.scrollTop = outDiv.scrollHeight
     },
     onError: (e) => {
       if (String(e).includes('401')) {
       aiDiv.textContent += `\n[错误] 登录已过期，请重新登录`;
       setTimeout(() => { location.href = '/static/login.html?next=' + encodeURIComponent('/static/chat.html') }, 2000);
      } else {
        aiDiv.textContent += `\n[错误] ${e}`;
      }
     }
  })
  }finally{
   busy = false
   sendBtn.disabled = false
  }
})