const DB={get jobs(){return JSON.parse(localStorage.getItem('jp_jobs')||'[]')},set jobs(v){localStorage.setItem('jp_jobs',JSON.stringify(v))},get apps(){return JSON.parse(localStorage.getItem('jp_apps')||'[]')},set apps(v){localStorage.setItem('jp_apps',JSON.stringify(v))}};
let selJob=null,q='',fd='',ft='';
const ADMIN_USER='admin',ADMIN_PASS='Huasaii123';
function isLoggedIn(){return sessionStorage.getItem('jp_admin')==='1'}
function adminLogin(){const u=document.getElementById('li-u').value,p=document.getElementById('li-p').value;if(u===ADMIN_USER&&p===ADMIN_PASS){sessionStorage.setItem('jp_admin','1');renderAdmin();toast('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ Admin 👋')}else{const err=document.getElementById('li-err');err.textContent='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';err.style.display='block';document.getElementById('li-p').value=''}}
function adminLogout(){sessionStorage.removeItem('jp_admin');navigate('home');toast('ออกจากระบบแล้ว','warning')}
const svgBack=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`;
const svgPlus=`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const svgMoney=`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
function initials(t){return t.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
function ago(d){const n=Math.round((Date.now()-new Date(d))/86400000);return n===0?'วันนี้':n===1?'เมื่อวาน':`${n} วันที่แล้ว`}
function toast(msg,type='success'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=msg;document.getElementById('toast-container').appendChild(el);setTimeout(()=>el.remove(),3000)}
function navigate(p,id){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));if(id!==undefined)selJob=id;const nb=document.getElementById('nav-'+p);if(nb)nb.classList.add('active');const pe=document.getElementById('page-'+p);if(pe){pe.classList.add('active');if(p==='admin'&&!isLoggedIn()){renderAdminLogin()}else{({home:renderHome,detail:renderDetail,apply:renderApply,admin:renderAdmin}[p]||renderHome)()}}window.scrollTo({top:0,behavior:'smooth'})}
window.navigate=navigate;
window.toggleMenu=()=>document.getElementById('mobile-menu').classList.toggle('open');
window.closeModal=()=>document.getElementById('modal-overlay').classList.remove('open');
