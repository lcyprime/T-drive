const apiBase = 'https://t-drive.liangzx19.workers.dev';
document.getElementById('loginBtn').onclick = async () => {
  const password = document.getElementById('password').value;
  const res = await fetch(apiBase + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('apiKey', data.token);
    location.href = '/';
  } else alert('密码错误');
};
