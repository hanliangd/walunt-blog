const decoder = new TextDecoder('utf-8')
function createParser(onEvent){
 let buf = ""
 return (text) =>{
  buf += text
  let i
  while((i = buf.indexOf("\n\n")) !== -1){
    const block = buf.slice(0 , i)
    buf = buf.slice(i + 2)
    if (!block.startsWith('data:')) {
        continue;
    }
    const payload = block.replace(/^data:\s*/, '').trim();
    onEvent(payload)
    }
  }
}
async function streamChat(message,{onChunk=()=>{}, onError=(e)=>console.log(e)
, onDone=()=>{}}){
  const res = await fetch('/api/chat/stream',{
    method:'POST',
    headers:{'Content-Type': 'application/json'},
    body:JSON.stringify({message})
  })
  if(res.status !== 200){
    onError(`HTTP ${res.status}`)
    return
  }
  const reader = res.body.getReader()
  let sawDone = false
  const parse = createParser((payload)=>{
    if (payload === '[DONE]'){
      sawDone = true
      onDone()
      return
    }
    try{
      const data = JSON.parse(payload)
      if (data.error) { onError(data.error); return }
      onChunk(data.content)
    }catch(e){
      onError(e.message)
    }
  })
  while(true){
    const{ done , value} = await reader.read()
    if(done) break;
    const text = decoder.decode(value ,{stream: true})
    parse(text)
  }
  if (!sawDone) {
    onError("连接提前中断，没收到 [DONE]")
}
}
// 导出给其他文件用（模块化写法）
export { streamChat };