addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, env))
})

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const pathname = url.pathname
  const method = request.method

  // Secrets / KV
  const LOGIN_PASSWORD = env.LOGIN_PASSWORD
  const API_KEY = env.API_KEY
  const DB = env.DB
  const THUMB_CACHE = env.THUMB_CACHE
  const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN
  const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID

  // 根目录返回前端页面
  if (pathname === '/' && method === 'GET') {
    return new Response(getHtmlPage(), { status: 200, headers: { 'Content-Type': 'text/html' } })
  }

  // 登录接口
  if (pathname === '/login' && method === 'POST') {
    const body = await request.json()
    if (body.password === LOGIN_PASSWORD) {
      return new Response(JSON.stringify({ success: true, apiKey: API_KEY }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } else {
      return new Response(JSON.stringify({ success: false, message: '密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // 上传接口
  if (pathname === '/upload' && method === 'POST') {
    const auth = request.headers.get('Authorization')
    if (!auth || auth !== `Bearer ${API_KEY}`) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return new Response(JSON.stringify({ success: false, message: 'No file uploaded' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

    // 可扩展：上传到 Telegram
    // await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument?chat_id=${TELEGRAM_CHAT_ID}`, {...})

    // 保存文件元数据到 KV
    const id = Date.now().toString()
    await DB.put(id, JSON.stringify({ filename: file.name, type: file.type, uploadedAt: new Date().toISOString() }))

    return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  // 文件列表接口
  if (pathname === '/list' && method === 'GET') {
    const keys = await DB.list()
    const files = []
    for (const key of keys.keys) {
      const data = await DB.get(key.name, { type: 'json' })
      if (data) files.push({ id: key.name, ...data })
    }
    return new Response(JSON.stringify({ files }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  return new Response('Not Found', { status: 404 })
}

addEventListener('fetch', event => {
  event.respondWith(safeHandleRequest(event.request, env))
})

async function safeHandleRequest(request, env) {
  try {
    return await handleRequest(request, env)
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Worker Exception', message: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// 简单前端页面 + JS
function getHtmlPage() {
  return `
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>T-Drive Worker 网盘</title>
<style>
body { font-family: sans-serif; padding: 20px; }
input, button { padding: 5px; margin: 5px; }
#fileList { margin-top: 20px; }
</style>
</head>
<body>
<h1>T-Drive 网盘</h1>

<div id="loginDiv">
  <input type="password" id="pwd" placeholder="输入密码">
  <button id="loginBtn">登录</button>
</div>

<div id="uploadDiv" style="display:none">
  <input type="file" id="fileInput">
  <button id="uploadBtn">上传文件</button>
  <div id="fileList"></div>
</div>

<script>
let apiKey = null

document.getElementById('loginBtn').onclick = async () => {
  const pwd = document.getElementById('pwd').value
  const res = await fetch('/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({password: pwd})
  })
  const data = await res.json()
  if(data.success){
    apiKey = data.apiKey
    alert('登录成功')
    document.getElementById('loginDiv').style.display='none'
    document.getElementById('uploadDiv').style.display='block'
    loadFileList()
  } else {
    alert(data.message)
  }
}

document.getElementById('uploadBtn').onclick = async () => {
  const fileInput = document.getElementById('fileInput')
  if(!fileInput.files.length) return alert('请选择文件')
  const formData = new FormData()
  formData.append('file', fileInput.files[0])
  const res = await fetch('/upload', {
    method: 'POST',
    headers: {'Authorization': 'Bearer '+apiKey},
    body: formData
  })
  const data = await res.json()
  if(data.success){
    alert('上传成功')
    loadFileList()
  } else {
    alert(data.message)
  }
}

async function loadFileList(){
  const res = await fetch('/list')
  const data = await res.json()
  const listDiv = document.getElementById('fileList')
  listDiv.innerHTML = '<h3>文件列表：</h3>' + data.files.map(f=>\`<div>\${f.filename} (\${f.type})</div>\`).join('')
}
</script>
</body>
</html>
  `
}
