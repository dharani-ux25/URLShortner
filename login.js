async function api(path, opts={}){
const res = await fetch('/api' + path, Object.assign({ credentials: 'include', headers: {} }, opts));
const json = await res.json().catch(()=>({}));
if (!res.ok) throw json;
return json;
}


const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const authMsg = document.getElementById('auth-msg');


btnLogin.addEventListener('click', async ()=>{
authMsg.textContent='';
try{
const email = document.getElementById('email').value;
const password = document.getElementById('password').value;
await api('/auth/login',{ method:'POST', body: JSON.stringify({ email, password }), headers:{'Content-Type':'application/json'} });
window.location.href = '/admin/dashboard.html';
}catch(e){ authMsg.textContent = e && e.error ? e.error : 'Login failed'; }
});


btnRegister.addEventListener('click', async ()=>{
authMsg.textContent='';
try{
const email = document.getElementById('email').value;
const password = document.getElementById('password').value;
await api('/auth/register',{ method:'POST', body: JSON.stringify({ email, password }), headers:{'Content-Type':'application/json'} });
authMsg.textContent = 'Registered — now login';
}catch(e){ authMsg.textContent = e && e.error ? e.error : 'Register failed'; }
});