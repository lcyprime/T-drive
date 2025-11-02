const apiBase = 'https://t-drive.liangzx19.workers.dev';
const apiKey = localStorage.getItem('apiKey');
if (!apiKey) location.href = '/login.html';

document.getElementById('uploadBtn').onclick = async () => {
  const file = document.getElementById('fileInput').files[0];
  if (!file) return alert('请选择文件');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(apiBase + '/upload', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey },
    body: form
  });
  if (res.ok) loadFiles(); else alert('上传失败');
};

async function loadFiles() {
  const res = await fetch(apiBase + '/list', { headers: { Authorization: 'Bearer ' + apiKey } });
  const list = await res.json();
  const div = document.getElementById('fileList');
  div.innerHTML = list.map(f => `<div class="file-card">${f.thumbUrl ? `<img src="${f.thumbUrl}" />` : ''}<span>${f.name}</span></div>`).join('');
}

document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem('apiKey'); location.href = '/login.html'; };
loadFiles();
