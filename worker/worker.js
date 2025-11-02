addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, env))
})

async function handleRequest(request, env) {
  const url = new URL(request.url)
  const method = request.method

  // 从 env 获取 Secrets / KV
  const LOGIN_PASSWORD = env.LOGIN_PASSWORD
  const API_KEY = env.API_KEY
  const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN
  const TELEGRAM_CHAT_ID = env.TELEGRAM_CHAT_ID
  const DB = env.DB
  const THUMB_CACHE = env.THUMB_CACHE

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  let response
  if (url.pathname === '/login' && method === 'POST') {
    response = await handleLogin(request, LOGIN_PASSWORD, API_KEY)
  } else if (url.pathname === '/upload' && method === 'POST') {
    response = await handleUpload(request, API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DB)
  } else if (url.pathname === '/list' && method === 'GET') {
    response = await handleList(DB)
  } else {
    response = new Response('Not Found', { status: 404 })
  }

  // 给响应加 CORS
  const newHeaders = new Headers(response.headers)
  Object.entries(corsHeaders()).forEach(([k, v]) => newHeaders.set(k, v))
  return new Response(await response.text(), { status: response.status, headers: newHeaders })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://t-drive.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// 登录接口
async function handleLogin(request, LOGIN_PASSWORD, API_KEY) {
  const body = await request.json()
  if (body.password === LOGIN_PASSWORD) {
    return new Response(JSON.stringify({ success: true, apiKey: API_KEY }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } else {
    return new Response(JSON.stringify({ success: false, message: '密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }
}

// 上传接口示例
async function handleUpload(request, API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DB) {
  const auth = request.headers.get('Authorization')
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!file) return new Response(JSON.stringify({ success: false, message: 'No file uploaded' }), { status: 400, headers: { 'Content-Type': 'application/json' } })

  // TODO: 上传到 Telegram
  const id = Date.now().toString()
  await DB.put(id, JSON.stringify({ filename: file.name, type: file.type, uploadedAt: new Date().toISOString() }))

  return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

// 文件列表
async function handleList(DB) {
  const keys = await DB.list()
  const files = []
  for (const key of keys.keys) {
    const data = await DB.get(key.name, { type: 'json' })
    if (data) files.push({ id: key.name, ...data })
  }
  return new Response(JSON.stringify({ files }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
