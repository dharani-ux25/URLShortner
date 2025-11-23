async function api(path, opts={}){
const res = await fetch('/api' + path, Object.assign({ credentials: 'include', headers: {} }, opts));
const json = await res.json().catch(()=>({}));
if (!res.ok) throw json;
return json;
}

const collapseBtn = document.getElementById('collapseBtn');
const sidebar = document.getElementById('sidebar');
const btnLogout = document.getElementById('btn-logout');
const totalLinks = document.getElementById('totalLinks');
const totalClicks = document.getElementById('totalClicks');
const recentActivity = document.getElementById('recentActivity');
const linksTable = document.getElementById('linksTable');
const search = document.getElementById('search');


let collapsed = false;
collapseBtn.addEventListener('click', ()=>{
collapsed = !collapsed;
document.body.classList.toggle('sidebar-collapsed', collapsed);
collapseBtn.textContent = collapsed ? '▶' : '◀';
});

btnLogout.addEventListener('click', async ()=>{
await api('/auth/logout',{ method:'POST' }).catch(()=>{});
window.location.href = '/admin/login.html';
});


async function loadOverview(){
try{
const links = await api('/admin/links');
totalLinks.textContent = links.length;
const total = links.reduce((s,l)=>s + (l.hits||0), 0);
totalClicks.textContent = total;
recentActivity.textContent = links.length ? new Date(links[0].created_at).toLocaleString() : '—';
renderLinks(links);
}catch(e){
// probably unauthorized
window.location.href = '/admin/login.html';
}
}

function renderLinks(links){
const q = search.value.trim().toLowerCase();
linksTable.innerHTML = '';
links.filter(l => !q || l.original_url.toLowerCase().includes(q) || l.short_code.toLowerCase().includes(q))
.forEach(l => {
const row = document.createElement('div');
row.className = 'p-3 bg-white rounded flex justify-between items-center border';
row.innerHTML = `
<div class="max-w-3xl">
<div class="text-sm text-gray-500">${new Date(l.created_at).toLocaleString()}</div>
<div><a href="/r/${l.short_code}" target="_blank" class="text-indigo-600 font-medium">${window.location.origin}/r/${l.short_code}</a></div>
<div class="text-sm text-gray-700 break-words">${l.original_url}</div>
</div>
<div class="text-right text-sm text-gray-600">
<div>Hits: ${l.hits}</div>
<div class="mt-2"><button data-id="${l.id}" data-code="${l.short_code}" class="px-2 py-1 border rounded btn-clicks">View Clicks</button></div>
</div>
`;
linksTable.appendChild(row);
});

document.querySelectorAll('.btn-clicks').forEach(btn => {
btn.addEventListener('click', async (e)=>{
const id = e.target.dataset.id;
const code = e.target.dataset.code;
// open stats page with query
window.location.href = '/admin/stats.html?linkId=' + id + '&code=' + encodeURIComponent(code);
});
});
}


search.addEventListener('input', loadOverview);


window.addEventListener('load', loadOverview);