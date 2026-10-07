import { streamChat } from './chat-api.js';
const outDiv = document.getElementById('out')
const msgInput = document.getElementById('msg')
const sendBtn = document.getElementById('sent')
sendBtn.addEventListener('click',()=>{
  const message = msgInput.value.trim()
  if(!message) return
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
  streamChat(message,{
    onChunk : (c) =>{
      aiDiv.textContent += c
      outDiv.scrollTop = outDiv.scrollHeight
    },
    onError: (e) => {
      aiDiv.textContent += `\n[错误] ${e}`;
    }
  })
})