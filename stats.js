async function api(path, opts={}){
const res = await fetch('/api' + path, Object.assign({ credentials: 'include', headers: {} }, opts));
const json = await res.json().catch(()=>({}));
if (!res.ok) throw json;
return json;
}


function getQuery(){
const q = {};
location.search.slice(1).split('&').forEach(p => { const [k,v] = p.split('='); if (k) q[k]=decodeURIComponent(v||''); });
return q;
}


async function loadStats(){
const q = getQuery();
const id = q.linkId;
const code = q.code;
const container = document.getElementById('statsContainer');
if (!id) { container.innerHTML = '<div class="text-red-600">Missing link id</div>'; return; }
try{
const clicks = await api('/admin/link/' + id + '/clicks');
container.innerHTML = `<h2 class="text-lg font-medium mt-4">Stats for ${code}</h2>`;
container.innerHTML += `<div class="mt-2 grid grid-cols-1 gap-2">${clicks.map(c => `
<div class="p-3 bg-white rounded border">
<div class="text-xs text-gray-500">${new Date(c.created_at).toLocaleString()}</div>
<div><strong>IP:</strong> ${c.ip||''}</div>
<div><strong>UA:</strong> ${c.user_agent ? c.user_agent.substring(0,200) : ''}</div>
<div><strong>Ref:</strong> ${c.referrer||''}</div>
</div>
`).join('')}</div>`;
}catch(e){
container.innerHTML = '<div class="text-red-600">Error loading stats</div>';
}
}


window.addEventListener('load', loadStats);