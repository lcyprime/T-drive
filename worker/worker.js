const LOGIN_PASSWORD = ENV_LOGIN_PASSWORD || '123456'; // Dashboard Secret
const API_KEY = ENV_API_KEY || 'my_random_api_key';
const TELEGRAM_BOT_TOKEN = ENV_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = ENV_TELEGRAM_CHAT_ID;
const DB = ENV.DB;               // KV namespace for metadata
const THUMB_CACHE = ENV.THUMB_CACHE; // KV namespace for thumbnails

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const method = request.method;

  // 处理 OPTIONS 预检请求（CORS）
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  let response;
  if (url.pathname === '/login' && method === 'POST') {
    response = await handleLogin(request);
  } else if (url.pathname === '/upload' && method === 'POST') {
    response = await handleUpload(request);
  } else if (url.pathname === '/list' && method === 'GET') {
    response = await handleList(request);
  } else {
    response = new Response('Not Found', { status: 404 });
  }

  // 给每个响应加上 CORS 头
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders()).forEach(([k, v]) => newHeaders.set(k, v));
  return new Response(await response.text(), { status: response.status, headers: newHeaders });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://t-drive.pages.dev', // 你的前端域名
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// 登录接口
async function handleLogin(request) {
  const body = await request.json();
  if (body.password === LOGIN_PASSWORD) {
    return new Response(JSON.stringify({ success: true, apiKey: API_KEY }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    return new Response(JSON.stringify({ success: false, message: '密码错误' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 上传接口（示例）
async function handleUpload(request) {
  const auth = request.headers.get('Authorization');
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) return new Response(JSON.stringify({ success: false, message: 'No file uploaded' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  // 这里可以对接 Telegram 上传
  // 例如使用 fetch 调用 Telegram API: sendDocument / sendPhoto
  // const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, ...);

  // 保存文件元数据到 KV
  const id = Date.now().toString();
  await DB.put(id, JSON.stringify({ filename: file.name, type: file.type, uploadedAt: new Date().toISOString() }));

  return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// 获取文件列表
async function handleList(request) {
  const keys = await DB.list();
  const files = [];
  for (const key of keys.keys) {
    const data = await DB.get(key.name, { type: 'json' });
    if (data) files.push({ id: key.name, ...data });
  }
  return new Response(JSON.stringify({ files }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
