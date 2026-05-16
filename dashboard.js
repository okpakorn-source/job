// ─── Dashboard Overview ──────────────────────────────
let _adminView='dashboard';
window.switchAdminView=function(v){_adminView=v;renderAdmin()};

function adminSidebar(active){
  return `<aside class="admin-sidebar"><div class="sidebar-title">เมนู Admin</div>
    <button class="sidebar-btn ${active==='dashboard'?'active':''}" onclick="switchAdminView('dashboard')">📊 Dashboard</button>
    <button class="sidebar-btn ${active==='applicants'?'active':''}" onclick="switchAdminView('applicants')">👥 ผู้สมัครงาน</button>
    <button class="sidebar-btn ${active==='jobs'?'active':''}" onclick="renderJobManager()">📋 จัดการตำแหน่ง</button>
    <button class="sidebar-btn ${active==='prompts'?'active':''}" onclick="renderPromptManager()">📝 จัดการ Prompt</button>
    <button class="sidebar-btn" onclick="setAIKey()">🔑 ตั้งค่า AI Key</button>
    <button class="sidebar-btn" onclick="navigate('home')">🏠 หน้าหลัก</button>
    <button class="sidebar-btn" style="color:var(--red);margin-top:auto" onclick="adminLogout()">🚪 ออกจากระบบ</button>
  </aside>`;
}

async function loadAdminData(){
  if(window._adminApps&&window._adminJobs)return;
  const [apRes,jRes]=await Promise.all([
    sb.from('applicants').select('*,jobs(title,department,type,location)').order('applied_at',{ascending:false}),
    sb.from('jobs').select('*').neq('status','deleted')
  ]);
  window._adminApps=apRes.data||[];
  window._adminJobs=jRes.data||[];
}

function renderDashboardView(){
  const apps=window._adminApps||[];
  const jobs=window._adminJobs||[];
  const openJobs=jobs.filter(j=>j.status==='open');
  // Pipeline counts
  const pipe={};
  ['new','reviewing','shortlisted','interview','offered','hired','rejected'].forEach(s=>pipe[s]=apps.filter(a=>a.status===s).length);
  const total=apps.length;
  // AI stats
  const analyzed=apps.filter(a=>a.ai_analyzed);
  const avgScore=analyzed.length?Math.round(analyzed.reduce((s,a)=>s+(a.ai_score_overall||0),0)/analyzed.length):0;
  const tierCount={};
  analyzed.forEach(a=>{const t=a.ai_summary?.tier||'?';tierCount[t]=(tierCount[t]||0)+1});
  // By position
  const byPos={};
  apps.forEach(a=>{const t=a.jobs?.title||'ไม่ระบุ';byPos[t]=(byPos[t]||0)+1});
  // This week
  const weekAgo=Date.now()-7*86400000;
  const thisWeek=apps.filter(a=>new Date(a.applied_at)>weekAgo).length;
  const passCount=analyzed.filter(a=>a.ai_summary?.verdict==='ผ่าน').length;
  const failCount=analyzed.filter(a=>a.ai_summary?.verdict==='ไม่ผ่าน').length;

  // Pipeline bar
  const pipeStages=[
    {key:'new',label:'ใหม่',color:'#6366f1',icon:'📥'},
    {key:'reviewing',label:'พิจารณา',color:'#f59e0b',icon:'🔍'},
    {key:'shortlisted',label:'คัดเลือก',color:'#06b6d4',icon:'⭐'},
    {key:'interview',label:'สัมภาษณ์',color:'#8b5cf6',icon:'🎤'},
    {key:'offered',label:'เสนอ',color:'#10b981',icon:'📋'},
    {key:'hired',label:'รับเข้า',color:'#22c55e',icon:'✅'},
    {key:'rejected',label:'ไม่ผ่าน',color:'#ef4444',icon:'❌'}
  ];
  const maxPipe=Math.max(...Object.values(pipe),1);

  return `<div class="admin-content">
    <div class="admin-header"><h2>📊 Dashboard Overview</h2><button class="btn btn-secondary btn-sm" onclick="window._adminApps=null;window._adminJobs=null;renderAdmin()">🔄 รีเฟรช</button></div>

    <!-- Top Stats -->
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
      <div class="stat-card blue"><div class="stat-card-num">${total}</div><div class="stat-card-label">ผู้สมัครทั้งหมด</div></div>
      <div class="stat-card green"><div class="stat-card-num">${openJobs.length}</div><div class="stat-card-label">ตำแหน่งเปิด</div></div>
      <div class="stat-card purple"><div class="stat-card-num">${thisWeek}</div><div class="stat-card-label">สัปดาห์นี้</div></div>
      <div class="stat-card cyan"><div class="stat-card-num">${pipe.new}</div><div class="stat-card-label">รอพิจารณา</div></div>
      <div class="stat-card" style="border-left:3px solid var(--green)"><div class="stat-card-num" style="color:var(--green)">${passCount}</div><div class="stat-card-label">AI ผ่าน</div></div>
      <div class="stat-card" style="border-left:3px solid var(--red)"><div class="stat-card-num" style="color:var(--red)">${failCount}</div><div class="stat-card-label">AI ไม่ผ่าน</div></div>
    </div>

    <!-- Pipeline -->
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:24px;margin-bottom:24px">
      <h3 style="margin-bottom:16px;font-size:1rem">📈 Pipeline สถานะผู้สมัคร</h3>
      ${pipeStages.map(s=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="width:90px;font-size:.82rem;color:var(--text2)">${s.icon} ${s.label}</span>
        <div style="flex:1;height:24px;background:var(--bg2);border-radius:4px;overflow:hidden;position:relative">
          <div style="height:100%;width:${Math.round(pipe[s.key]/maxPipe*100)}%;background:${s.color};border-radius:4px;transition:width .5s"></div>
          <span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:.75rem;font-weight:700;color:var(--text)">${pipe[s.key]}</span>
        </div>
      </div>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
      <!-- By Position -->
      <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:24px">
        <h3 style="margin-bottom:16px;font-size:1rem">💼 ผู้สมัครตามตำแหน่ง</h3>
        ${Object.entries(byPos).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border2);font-size:.88rem">
          <span>${t}</span><span class="badge badge-dept">${c} คน</span>
        </div>`).join('')||'<p class="text-muted" style="font-size:.85rem">ยังไม่มีข้อมูล</p>'}
      </div>

      <!-- AI Tier Distribution -->
      <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:24px">
        <h3 style="margin-bottom:16px;font-size:1rem">🤖 AI Analysis Summary</h3>
        ${analyzed.length?`
          <div style="text-align:center;margin-bottom:16px">
            <div style="font-size:2.2rem;font-weight:800;color:${avgScore>=70?'var(--green)':avgScore>=40?'var(--gold)':'var(--red)'}">${avgScore}</div>
            <div style="font-size:.8rem;color:var(--text3)">คะแนนเฉลี่ย / 100</div>
            <div style="font-size:.82rem;color:var(--text2);margin-top:4px">วิเคราะห์แล้ว ${analyzed.length}/${total} คน</div>
          </div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            ${Object.entries(tierCount).sort().map(([t,c])=>{
              const colors={S:'#22c55e',A:'#06b6d4',B:'#f59e0b',C:'#ef4444',Reject:'#ef4444'};
              return `<div style="text-align:center;padding:8px 14px;background:${colors[t]||'#94a3b8'}15;border:1px solid ${colors[t]||'#94a3b8'}33;border-radius:var(--r2)"><div style="font-size:1.2rem;font-weight:800;color:${colors[t]||'#94a3b8'}">${c}</div><div style="font-size:.75rem;color:var(--text3)">${t} Tier</div></div>`;
            }).join('')}
          </div>
        `:'<p class="text-muted" style="font-size:.85rem;text-align:center">ยังไม่มีข้อมูล AI — กด 🤖 AI ในหน้าผู้สมัคร</p>'}
      </div>
    </div>

    <!-- Recent Applicants -->
    <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:24px;margin-bottom:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h3 style="font-size:1rem">📋 ผู้สมัครล่าสุด</h3>
        <button class="btn btn-sm btn-secondary" onclick="switchAdminView('applicants')">ดูทั้งหมด →</button>
      </div>
      ${apps.slice(0,8).map(a=>{
        const st=STATUS_MAP[a.status]||STATUS_MAP.new;
        const dt=a.applied_at?new Date(a.applied_at).toLocaleDateString('th-TH',{day:'numeric',month:'short'}):'';
        const aiTag=a.ai_analyzed?`<span style="padding:2px 8px;border-radius:100px;font-size:.7rem;font-weight:700;background:${a.ai_summary?.verdict==='ผ่าน'?'rgba(34,197,94,.12);color:#22c55e':'rgba(239,68,68,.12);color:#ef4444'}">${a.ai_summary?.verdict||''} ${a.ai_score_overall||''}</span>`:'';
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border2);cursor:pointer" onclick="switchAdminView('applicants');setTimeout(()=>viewApplicant('${a.id}'),300)">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--accent),var(--accent2));border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem;flex-shrink:0">${(a.full_name||'?')[0].toUpperCase()}</div>
          <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.full_name||'—'}</div><div style="font-size:.75rem;color:var(--text3)">${a.jobs?.title||'—'} · ${dt}</div></div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            ${aiTag}
            <span style="padding:3px 10px;border-radius:100px;font-size:.72rem;font-weight:600;background:${st.bg};color:${st.color}">${st.label}</span>
          </div>
        </div>`;
      }).join('')||'<p class="text-muted" style="text-align:center;font-size:.85rem">ยังไม่มีผู้สมัคร</p>'}
    </div>

    <!-- Quick Actions -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
      <button class="btn btn-primary" onclick="switchAdminView('applicants')" style="justify-content:center">👥 จัดการผู้สมัคร</button>
      <button class="btn btn-success" onclick="exportCSV()" style="justify-content:center">📥 Export CSV</button>
      <button class="btn btn-secondary" onclick="navigate('apply')" style="justify-content:center">📋 ดูฟอร์มสมัคร</button>
      <button class="btn btn-secondary" onclick="navigate('home')" style="justify-content:center">🏠 หน้าเว็บ</button>
    </div>
  </div>`;
}
