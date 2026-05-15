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
let _sbJobs=[];
async function renderHome(){
  document.getElementById('page-home').innerHTML=`<section class="hero"><div class="hero-badge">${svgMoney} แพลตฟอร์มสมัครงานชั้นนำ</div><h1>ค้นหางานที่ <span>ใช่สำหรับคุณ</span></h1><p>เชื่อมต่อผู้มีความสามารถกับโอกาสที่ดีที่สุด</p><div class="hero-stats"><div class="stat"><div class="stat-num" id="hn-open">—</div><div class="stat-label">ตำแหน่งเปิดรับ</div></div><div class="stat"><div class="stat-num" id="hn-dept">—</div><div class="stat-label">แผนก</div></div></div></section><div class="search-bar"><div class="search-inner"><input id="si" type="text" placeholder="ค้นหาตำแหน่ง..." value="${q}" oninput="q=this.value;renderCards()"/><select id="fd-sel" onchange="fd=this.value;renderCards()"><option value="">ทุกแผนก</option></select><select onchange="ft=this.value;renderCards()"><option value="">ทุกประเภท</option><option value="Full-time"${ft==='Full-time'?' selected':''}>Full-time</option><option value="Part-time"${ft==='Part-time'?' selected':''}>Part-time</option><option value="Contract"${ft==='Contract'?' selected':''}>Contract</option></select></div></div><div class="container"><div class="section-header"><div class="flex items-center gap-8"><span class="section-title">ตำแหน่งงานทั้งหมด</span><span class="section-count" id="jc">…</span></div></div><div class="jobs-grid" id="jg"><div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⏳</div><h3>กำลังโหลด...</h3></div></div></div>`;
  try{
    const {data,error}=await sb.from('jobs').select('*').order('posted_at',{ascending:false});
    if(error)throw error;
    _sbJobs=data||[];
    const depts=[...new Set(_sbJobs.map(j=>j.department).filter(Boolean))];
    const fdSel=document.getElementById('fd-sel');
    if(fdSel)depts.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;if(fd===d)o.selected=true;fdSel.appendChild(o)});
    const hn=document.getElementById('hn-open');if(hn)hn.textContent=_sbJobs.filter(j=>j.status==='open').length;
    const hd=document.getElementById('hn-dept');if(hd)hd.textContent=depts.length;
  }catch(e){_sbJobs=[];toast('โหลดข้อมูลไม่สำเร็จ','error');}
  renderCards();
}
window.renderCards=function(){
  let jobs=_sbJobs;
  if(q)jobs=jobs.filter(j=>(j.title||'').toLowerCase().includes(q.toLowerCase())||(j.department||'').toLowerCase().includes(q.toLowerCase()));
  if(fd)jobs=jobs.filter(j=>j.department===fd);
  if(ft)jobs=jobs.filter(j=>j.type===ft);
  const jc=document.getElementById('jc');if(jc)jc.textContent=jobs.length;
  const jg=document.getElementById('jg');if(!jg)return;
  const sal=j=>j.salary_min&&j.salary_max?`฿${j.salary_min.toLocaleString()}–${j.salary_max.toLocaleString()}`:j.salary_min?`฿${j.salary_min.toLocaleString()}+`:'ตามตกลง';
  jg.innerHTML=jobs.length?jobs.map(j=>`<div class="job-card" onclick="navigate('detail','${j.id}')"><div class="job-card-top"><div class="job-logo">${initials(j.title)}</div><div class="job-badges"><span class="badge badge-type">${j.type}</span>${j.status==='open'?'<span class="badge badge-new">✅ เปิดรับ</span>':'<span class="badge badge-urgent">🔒 ปิด</span>'}${j.is_urgent?'<span class="badge badge-urgent">🔥 ด่วน</span>':''}</div></div><div class="job-title">${j.title}</div><div style="margin-top:6px"><span class="badge badge-dept">${j.department||''}</span></div><div class="job-info" style="margin-top:10px"><span>📍 ${j.location}</span><span>💼 ${j.type}</span></div><div class="job-desc">${j.summary||''}</div><div class="job-footer"><div class="job-salary">${svgMoney} ${sal(j)}</div><div class="job-date">${ago(j.posted_at)}</div></div></div>`).join(''):`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>ไม่พบตำแหน่งงาน</h3><p class="text-muted">ลองเปลี่ยนคำค้นหา</p></div>`;
};
async function renderDetail(){
  let j=_sbJobs.find(x=>x.id===selJob);
  if(!j&&selJob){try{const {data}=await sb.from('jobs').select('*').eq('id',selJob).single();if(data)j=data;}catch(e){}}
  if(!j){navigate('home');return}
  const sal=j.salary_min&&j.salary_max?`฿${j.salary_min.toLocaleString()}–${j.salary_max.toLocaleString()}`:j.salary_min?`฿${j.salary_min.toLocaleString()}+`:'ตามตกลง';
  document.getElementById('page-detail').innerHTML=`<div class="detail-hero"><div class="detail-container"><button class="back-btn" onclick="navigate('home')">${svgBack} กลับรายการงาน</button><div class="detail-header"><div class="detail-logo">${initials(j.title)}</div><div><div class="detail-title">${j.title}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span class="badge badge-dept">${j.department||''}</span><span class="badge badge-type">${j.type}</span>${j.status==='open'?'<span class="badge badge-new">✅ เปิดรับสมัคร</span>':'<span class="badge badge-urgent">🔒 ปิดรับสมัคร</span>'}</div><div class="detail-meta"><span>📍 ${j.location}</span><span>${svgMoney} ${sal}/เดือน</span><span>📅 ${ago(j.posted_at)}</span></div></div></div></div></div><div class="detail-body"><div class="detail-grid"><div><div class="detail-section"><h3>เกี่ยวกับตำแหน่งงาน</h3><p>${j.description||''}</p></div>${j.requirements?`<div class="detail-section"><h3>คุณสมบัติที่ต้องการ</h3><p>${j.requirements}</p></div>`:''}<div class="detail-section"><h3>ทักษะที่เกี่ยวข้อง</h3><div class="skill-tags">${(j.skills||[]).map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div></div></div><div><div class="info-card"><h3>ข้อมูลตำแหน่ง</h3><div class="info-row"><span class="label">แผนก</span><span class="value">${j.department||'-'}</span></div><div class="info-row"><span class="label">รูปแบบ</span><span class="value">${j.type}</span></div><div class="info-row"><span class="label">สถานที่</span><span class="value">${j.location}</span></div><div class="info-row"><span class="label">เงินเดือน</span><span class="value" style="color:var(--green)">${sal}</span></div>${j.status==='open'?`<button class="btn btn-primary btn-lg apply-cta" onclick="navigate('apply','${j.id}')">สมัครงานตำแหน่งนี้</button>`:`<button class="btn btn-secondary btn-lg apply-cta" disabled>ปิดรับสมัครแล้ว</button>`}</div></div></div></div>`;
}
async function renderApply(){
  let jobs=[];
  try{const {data,error}=await sb.from('jobs').select('id,title,department').eq('status','open').order('posted_at',{ascending:false});if(!error&&data)jobs=data;}catch(e){jobs=[];}
  const jobLabel=j=>j.title+(j.department?` (${j.department})`:'');
  document.getElementById('page-apply').innerHTML=`<div class="apply-hero"><h1>📋 ใบสมัครงาน</h1><p>กรอกข้อมูลให้ครบถ้วน เราจะติดต่อกลับโดยเร็ว</p></div><div class="apply-container"><form class="form-card" onsubmit="submitApp(event)"><div class="form-section-title">เลือกตำแหน่งงาน</div><div class="form-group"><label>ตำแหน่งที่สนใจ <span class="req">*</span></label><select id="fa-pos" required><option value="">-- เลือกตำแหน่ง --</option>${jobs.map(j=>`<option value="${j.id}">${jobLabel(j)}</option>`).join('')}</select></div><div class="form-section-title">ข้อมูลส่วนตัว</div><div class="form-grid"><div class="form-group"><label>ชื่อ-นามสกุล <span class="req">*</span></label><input id="fa-name" type="text" placeholder="เช่น สมชาย ใจดี" required/></div><div class="form-group"><label>อีเมล <span class="req">*</span></label><input id="fa-email" type="email" placeholder="example@email.com" required/></div><div class="form-group"><label>เบอร์โทรศัพท์ <span class="req">*</span></label><input id="fa-phone" type="tel" placeholder="08x-xxx-xxxx" required/></div><div class="form-group"><label>Portfolio / LinkedIn</label><input id="fa-link" type="url" placeholder="https://"/></div><div class="form-group full"><label>แนะนำตัวเอง</label><textarea id="fa-bio" rows="4" placeholder="บอกเล่าประสบการณ์และความสามารถของคุณ..."></textarea></div></div><div class="form-section-title">อัปโหลดเอกสาร <span style="font-weight:400;color:var(--text3);font-size:.82rem">(ไม่บังคับ)</span></div><div class="file-upload"><input type="file" accept="application/pdf" onchange="window._resumeFile=this.files[0];document.getElementById('fn').textContent='✅ '+this.files[0].name;document.getElementById('fn').style.display='block'"/><div class="file-upload-icon">📄</div><p>คลิกหรือลาก Resume มาวางที่นี่ <span style="color:var(--text3)">(ถ้ามี)</span></p><p class="note">รองรับ PDF เท่านั้น ขนาดไม่เกิน 10MB</p></div><div class="file-name" id="fn"></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="navigate('home')">ยกเลิก</button><button type="submit" class="btn btn-success btn-lg">${svgPlus} ส่งใบสมัคร</button></div></form></div>`;
}
window.submitApp=async function(e){
  e.preventDefault();
  const btn=e.target.querySelector('[type=submit]');
  btn.disabled=true;btn.textContent='กำลังส่ง...';
  try{
    const jobId=document.getElementById('fa-pos').value;
    const fullName=document.getElementById('fa-name').value.trim();
    const email=document.getElementById('fa-email').value.trim();
    const phone=document.getElementById('fa-phone').value.trim();
    const linkedin=document.getElementById('fa-link').value.trim();
    const bio=document.getElementById('fa-bio').value.trim();
    const file=window._resumeFile||null;
    if(!jobId)throw new Error('กรุณาเลือกตำแหน่งที่สนใจ');
    if(!fullName)throw new Error('กรุณากรอกชื่อ-นามสกุล');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    if(!phone)throw new Error('กรุณากรอกเบอร์โทรศัพท์');
    if(file){
      if(file.type!=='application/pdf')throw new Error('รองรับเฉพาะไฟล์ PDF เท่านั้น');
      if(file.size>10*1024*1024)throw new Error('ขนาดไฟล์ต้องไม่เกิน 10MB');
    }
    const isUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
    const safeJobId=isUUID?jobId:null;
    const jobTitle=document.getElementById('fa-pos').selectedOptions[0]?.text||null;
    const applicantId=crypto.randomUUID();
    const payload={id:applicantId,job_id:safeJobId,full_name:fullName,email:email,phone:phone,linkedin_url:linkedin||null,cover_letter:(jobTitle&&!safeJobId?'['+jobTitle+'] ':'')+(bio||'')};
    console.log('[ATS] Sending to:',SUPABASE_URL+'/rest/v1/applicants');
    console.log('[ATS] Payload:',JSON.stringify(payload));
    const res=await fetch(SUPABASE_URL+'/rest/v1/applicants',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_ANON,
        'Authorization':'Bearer '+SUPABASE_ANON,
        'Prefer':'return=minimal'
      },
      body:JSON.stringify(payload)
    });
    console.log('[ATS] HTTP Status:',res.status,res.statusText);
    if(!res.ok){
      const errText=await res.text();
      console.error('[ATS] Server Error:',errText);
      throw new Error('Server: '+errText);
    }
    if(file){
      const path=applicantId+'/resume.pdf';
      const upRes=await fetch(SUPABASE_URL+'/storage/v1/object/resumes/'+path,{
        method:'POST',
        headers:{
          'apikey':SUPABASE_ANON,
          'Authorization':'Bearer '+SUPABASE_ANON,
          'Content-Type':'application/pdf'
        },
        body:file
      });
      if(!upRes.ok)console.warn('[ATS] Upload warning:',await upRes.text());
      else{
        await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+applicantId,{
          method:'PATCH',
          headers:{
            'Content-Type':'application/json',
            'apikey':SUPABASE_ANON,
            'Authorization':'Bearer '+SUPABASE_ANON,
            'Prefer':'return=minimal'
          },
          body:JSON.stringify({resume_path:path,resume_filename:file.name})
        });
      }
    }
    window._resumeFile=null;
    document.getElementById('page-apply').innerHTML=`<div class="apply-container"><div class="success-screen"><div class="success-icon">✅</div><h2>ส่งใบสมัครสำเร็จ!</h2><p class="text-muted">ทีมงานจะติดต่อกลับภายใน 3-5 วันทำการ</p><div style="margin-top:32px;display:flex;gap:12px;justify-content:center"><button class="btn btn-secondary" onclick="navigate('home')">ดูตำแหน่งอื่น</button><button class="btn btn-primary" onclick="navigate('apply')">สมัครอีกครั้ง</button></div></div></div>`;
    toast('ส่งใบสมัครเรียบร้อย! 🎉');
  }catch(err){
    console.error('[ATS] Error:',err);
    toast(err.message||'เกิดข้อผิดพลาด','error');
    btn.disabled=false;btn.textContent='ส่งใบสมัคร';
  }
};
function renderAdminLogin(){
  document.getElementById('page-admin').innerHTML=`
  <div style="min-height:calc(100vh - 64px);display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(99,102,241,0.12),transparent),var(--bg)">
    <div style="width:100%;max-width:420px">
      <div style="text-align:center;margin-bottom:32px">
        <div style="width:64px;height:64px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem">🔐</div>
        <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:6px">Admin Login</h2>
        <p style="color:var(--text3);font-size:.9rem">กรุณาเข้าสู่ระบบเพื่อจัดการตำแหน่งงาน</p>
      </div>
      <div class="form-card" style="border:1px solid var(--border)">
        <div class="form-group" style="margin-bottom:16px">
          <label>ชื่อผู้ใช้ <span class="req">*</span></label>
          <input id="li-u" type="text" placeholder="admin" autocomplete="username" onkeydown="if(event.key==='Enter')document.getElementById('li-p').focus()"/>
        </div>
        <div class="form-group" style="margin-bottom:8px">
          <label>รหัสผ่าน <span class="req">*</span></label>
          <input id="li-p" type="password" placeholder="••••••••" autocomplete="current-password" onkeydown="if(event.key==='Enter')adminLogin()"/>
        </div>
        <div id="li-err" style="display:none;color:var(--red);font-size:.83rem;padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:var(--r2);margin-bottom:12px"></div>
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:8px" onclick="adminLogin()">เข้าสู่ระบบ</button>
        <button class="btn btn-secondary" style="width:100%;margin-top:10px" onclick="navigate('home')">← กลับหน้าหลัก</button>
      </div>
    </div>
  </div>`;
  setTimeout(()=>document.getElementById('li-u')&&document.getElementById('li-u').focus(),100);
}

const STATUS_MAP={
  new:{label:'ใหม่',color:'#6366f1',bg:'rgba(99,102,241,.12)'},
  reviewing:{label:'กำลังพิจารณา',color:'#f59e0b',bg:'rgba(245,158,11,.12)'},
  shortlisted:{label:'ผ่านคัดเลือก',color:'#06b6d4',bg:'rgba(6,182,212,.12)'},
  interview:{label:'นัดสัมภาษณ์',color:'#8b5cf6',bg:'rgba(139,92,246,.12)'},
  offered:{label:'เสนอตำแหน่ง',color:'#10b981',bg:'rgba(16,185,129,.12)'},
  hired:{label:'รับเข้าทำงาน',color:'#22c55e',bg:'rgba(34,197,94,.12)'},
  rejected:{label:'ไม่ผ่าน',color:'#ef4444',bg:'rgba(239,68,68,.12)'}
};

async function renderAdmin(){
  const adminEl=document.getElementById('page-admin');
  adminEl.innerHTML=`<div class="admin-layout"><aside class="admin-sidebar"><div class="sidebar-title">เมนู Admin</div><button class="sidebar-btn active" onclick="renderAdmin()">👥 ผู้สมัครงาน</button><button class="sidebar-btn" onclick="navigate('home')">🏠 หน้าหลัก</button><button class="sidebar-btn" style="color:var(--red);margin-top:auto" onclick="adminLogout()">🚪 ออกจากระบบ</button></aside><div class="admin-content"><div class="admin-header"><h2>👥 ผู้สมัครงาน</h2><button class="btn btn-secondary" onclick="renderAdmin()">🔄 รีเฟรช</button></div><div class="stats-grid" id="ad-stats"><div class="stat-card blue"><div class="stat-card-num">—</div><div class="stat-card-label">ผู้สมัครทั้งหมด</div></div><div class="stat-card green"><div class="stat-card-num">—</div><div class="stat-card-label">ตำแหน่งเปิดรับ</div></div><div class="stat-card purple"><div class="stat-card-num">—</div><div class="stat-card-label">ใบสมัครใหม่</div></div><div class="stat-card cyan"><div class="stat-card-num">—</div><div class="stat-card-label">รอสัมภาษณ์</div></div></div><div id="ad-filter" style="margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap"><select id="af-status" onchange="filterApplicants()" style="padding:8px 14px;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:var(--r2);font-family:inherit"><option value="">ทุกสถานะ</option><option value="new">ใหม่</option><option value="reviewing">กำลังพิจารณา</option><option value="shortlisted">ผ่านคัดเลือก</option><option value="interview">นัดสัมภาษณ์</option><option value="offered">เสนอตำแหน่ง</option><option value="hired">รับเข้าทำงาน</option><option value="rejected">ไม่ผ่าน</option></select><input id="af-search" type="text" placeholder="ค้นหาชื่อ/อีเมล..." oninput="filterApplicants()" style="padding:8px 14px;background:var(--bg2);border:1px solid var(--border2);color:var(--text);border-radius:var(--r2);font-family:inherit;flex:1;min-width:200px"/></div><div id="ad-list"><div class="empty-state"><div class="empty-icon">⏳</div><h3>กำลังโหลดข้อมูล...</h3></div></div></div></div>`;

  try{
    const apRes=await fetch(SUPABASE_URL+'/rest/v1/applicants?select=*,jobs(title,department)&order=applied_at.desc',{
      headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON}
    });
    if(!apRes.ok)throw new Error(await apRes.text());
    window._adminApps=await apRes.json();

    const jobRes=await fetch(SUPABASE_URL+'/rest/v1/jobs?select=id,title,status',{
      headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON}
    });
    const jobs=jobRes.ok?await jobRes.json():[];

    const stats=document.getElementById('ad-stats');
    if(stats){
      const apps=window._adminApps;
      stats.innerHTML=`
        <div class="stat-card blue"><div class="stat-card-num">${apps.length}</div><div class="stat-card-label">ผู้สมัครทั้งหมด</div></div>
        <div class="stat-card green"><div class="stat-card-num">${jobs.filter(j=>j.status==='open').length}</div><div class="stat-card-label">ตำแหน่งเปิดรับ</div></div>
        <div class="stat-card purple"><div class="stat-card-num">${apps.filter(a=>a.status==='new').length}</div><div class="stat-card-label">ใบสมัครใหม่</div></div>
        <div class="stat-card cyan"><div class="stat-card-num">${apps.filter(a=>a.status==='interview').length}</div><div class="stat-card-label">รอสัมภาษณ์</div></div>`;
    }
    filterApplicants();
  }catch(err){
    console.error('[Admin]',err);
    document.getElementById('ad-list').innerHTML=`<div class="empty-state"><div class="empty-icon">⚠️</div><h3>โหลดข้อมูลไม่สำเร็จ</h3><p class="text-muted">${err.message}</p></div>`;
  }
}

window.filterApplicants=function(){
  const apps=window._adminApps||[];
  const sf=document.getElementById('af-status')?.value||'';
  const sq=(document.getElementById('af-search')?.value||'').toLowerCase();
  let filtered=apps;
  if(sf)filtered=filtered.filter(a=>a.status===sf);
  if(sq)filtered=filtered.filter(a=>(a.full_name||'').toLowerCase().includes(sq)||(a.email||'').toLowerCase().includes(sq));
  renderApplicantList(filtered);
};

function renderApplicantList(apps){
  const el=document.getElementById('ad-list');
  if(!el)return;
  if(!apps.length){
    el.innerHTML=`<div class="empty-state"><div class="empty-icon">📭</div><h3>ไม่พบข้อมูลผู้สมัคร</h3><p class="text-muted">ยังไม่มีใบสมัครในระบบ</p></div>`;
    return;
  }
  const statusOpts=Object.entries(STATUS_MAP).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('');
  el.innerHTML=`<div class="admin-table-wrap"><table><thead><tr><th>ผู้สมัคร</th><th>ตำแหน่ง</th><th>วันที่สมัคร</th><th>สถานะ</th><th>Resume</th><th>จัดการ</th></tr></thead><tbody>${apps.map(a=>{
    const st=STATUS_MAP[a.status]||STATUS_MAP.new;
    const jobName=a.jobs?a.jobs.title:'—';
    const dept=a.jobs?a.jobs.department:'';
    const dt=a.applied_at?new Date(a.applied_at).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}):'—';
    return `<tr>
      <td><div style="font-weight:600">${a.full_name||'—'}</div><div style="font-size:.8rem;color:var(--text3)">${a.email||''}</div><div style="font-size:.78rem;color:var(--text3)">${a.phone||''}</div></td>
      <td><span class="badge badge-dept">${jobName}</span>${dept?`<div style="font-size:.75rem;color:var(--text3);margin-top:4px">${dept}</div>`:''}</td>
      <td style="font-size:.85rem;color:var(--text2)">${dt}</td>
      <td><select onchange="updateStatus('${a.id}',this.value)" style="padding:5px 10px;background:${st.bg};color:${st.color};border:1px solid ${st.color}33;border-radius:100px;font-size:.78rem;font-weight:600;font-family:inherit;cursor:pointer">${statusOpts.replace(`value="${a.status}"`,`value="${a.status}" selected`)}</select></td>
      <td>${a.resume_path?`<button class="btn btn-sm btn-secondary" onclick="downloadResume('${a.id}','${a.resume_path}','${(a.resume_filename||'resume.pdf').replace(/'/g,"\\'")}')">📄 ดาวน์โหลด</button>`:'<span style="color:var(--text3);font-size:.8rem">ไม่มีไฟล์</span>'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="viewApplicant('${a.id}')">👁 ดู</button></td>
    </tr>`;
  }).join('')}</tbody></table></div>`;
}

window.updateStatus=async function(id,status){
  try{
    const res=await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+id,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body:JSON.stringify({status})
    });
    if(!res.ok)throw new Error(await res.text());
    const app=window._adminApps.find(a=>a.id===id);
    if(app)app.status=status;
    toast('อัปเดตสถานะเรียบร้อย ✅');
  }catch(err){
    toast('อัปเดตไม่สำเร็จ: '+err.message,'error');
  }
};

window.downloadResume=async function(id,path,filename){
  try{
    const res=await fetch(SUPABASE_URL+'/storage/v1/object/sign/resumes/'+path,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON},
      body:JSON.stringify({expiresIn:3600})
    });
    if(!res.ok)throw new Error('ไม่สามารถสร้าง URL ดาวน์โหลดได้');
    const data=await res.json();
    const url=SUPABASE_URL+'/storage/v1'+data.signedURL;
    const a=document.createElement('a');
    a.href=url;a.download=filename;a.target='_blank';
    document.body.appendChild(a);a.click();a.remove();
    toast('กำลังดาวน์โหลด Resume... 📄');
  }catch(err){
    toast(err.message,'error');
  }
};

window.viewApplicant=function(id){
  const a=(window._adminApps||[]).find(x=>x.id===id);
  if(!a)return;
  const st=STATUS_MAP[a.status]||STATUS_MAP.new;
  const jobName=a.jobs?a.jobs.title:'—';
  const dept=a.jobs?a.jobs.department:'';
  const dt=a.applied_at?new Date(a.applied_at).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
  document.getElementById('modal-box').innerHTML=`
    <h2>📋 ข้อมูลผู้สมัคร</h2>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.3rem;flex-shrink:0">${(a.full_name||'?').charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-size:1.1rem;font-weight:700">${a.full_name||'—'}</div>
        <div style="color:var(--text3);font-size:.85rem">สมัครเมื่อ ${dt}</div>
      </div>
      <span style="margin-left:auto;padding:4px 12px;border-radius:100px;font-size:.78rem;font-weight:600;background:${st.bg};color:${st.color};border:1px solid ${st.color}33">${st.label}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
      <div class="info-card" style="padding:14px">
        <div style="font-size:.75rem;color:var(--text3);margin-bottom:4px">อีเมล</div>
        <div style="font-weight:600">${a.email||'—'}</div>
      </div>
      <div class="info-card" style="padding:14px">
        <div style="font-size:.75rem;color:var(--text3);margin-bottom:4px">เบอร์โทร</div>
        <div style="font-weight:600">${a.phone||'—'}</div>
      </div>
      <div class="info-card" style="padding:14px">
        <div style="font-size:.75rem;color:var(--text3);margin-bottom:4px">ตำแหน่งที่สมัคร</div>
        <div style="font-weight:600">${jobName}${dept?' ('+dept+')':''}</div>
      </div>
      <div class="info-card" style="padding:14px">
        <div style="font-size:.75rem;color:var(--text3);margin-bottom:4px">LinkedIn / Portfolio</div>
        <div style="font-weight:600">${a.linkedin_url?'<a href="'+a.linkedin_url+'" target="_blank" style="color:var(--accent)">เปิดลิงก์</a>':'—'}</div>
      </div>
    </div>
    ${a.cover_letter?`<div style="margin-bottom:20px"><div style="font-size:.85rem;font-weight:600;color:var(--text2);margin-bottom:8px">แนะนำตัว / Cover Letter</div><div style="background:var(--bg2);padding:16px;border-radius:var(--r2);border:1px solid var(--border2);color:var(--text2);font-size:.9rem;line-height:1.7;white-space:pre-wrap">${a.cover_letter}</div></div>`:''}
    <div class="form-actions">
      ${a.resume_path?`<button class="btn btn-success" onclick="downloadResume('${a.id}','${a.resume_path}','${(a.resume_filename||'resume.pdf').replace(/'/g,"\\'")}')">📄 ดาวน์โหลด Resume</button>`:''}
      <button class="btn btn-secondary" onclick="closeModal()">ปิด</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
};

if(!DB.jobs.length){DB.jobs=[{id:1,title:'Senior Frontend Developer',dept:'Engineering',type:'Full-time',location:'กรุงเทพฯ',salary:'80,000 – 120,000',status:'open',posted:'2026-05-10',summary:'พัฒนา UI/UX ระดับ Enterprise ด้วย React และ TypeScript',description:'พัฒนา UI components ด้วย React + TypeScript\nร่วมออกแบบ architecture กับทีม Backend',requirements:'ประสบการณ์ React อย่างน้อย 3 ปี\nมีความรู้ TypeScript และ REST API',skills:['React','TypeScript','GraphQL','Git']},{id:2,title:'Product Manager',dept:'Product',type:'Full-time',location:'Hybrid',salary:'90,000 – 150,000',status:'open',posted:'2026-05-12',summary:'กำหนดทิศทางผลิตภัณฑ์ เขียน PRD และ roadmap รายไตรมาส',description:'กำหนด Product Vision และ Strategy\nวิเคราะห์ข้อมูลผู้ใช้และตลาด',requirements:'ประสบการณ์ PM อย่างน้อย 3 ปี\nเข้าใจ Agile / Scrum',skills:['Agile','SQL','Figma','JIRA']},{id:3,title:'UX/UI Designer',dept:'Design',type:'Full-time',location:'กรุงเทพฯ',salary:'60,000 – 90,000',status:'open',posted:'2026-05-08',summary:'ออกแบบประสบการณ์ผู้ใช้ที่สวยงามสำหรับ web และ mobile',description:'Research และ understand user needs\nสร้าง wireframe, prototype และ final UI',requirements:'ประสบการณ์ UX/UI อย่างน้อย 2 ปี\nเชี่ยวชาญ Figma',skills:['Figma','Prototyping','User Research','Design System']}]}
navigate('home');
