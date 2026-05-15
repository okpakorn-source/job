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
function renderAdmin(){
  const jobs=DB.jobs,apps=DB.apps;
  document.getElementById('page-admin').innerHTML=`<div class="admin-layout"><aside class="admin-sidebar"><div class="sidebar-title">เมนู Admin</div><button class="sidebar-btn active">📋 จัดการตำแหน่งงาน</button><button class="sidebar-btn" onclick="navigate('home')">🏠 หน้าหลัก</button><button class="sidebar-btn" style="color:var(--red);margin-top:auto" onclick="adminLogout()">🚪 ออกจากระบบ</button></aside><div class="admin-content"><div class="admin-header"><h2>จัดการตำแหน่งงาน</h2><button class="btn btn-primary" onclick="openJobForm()">${svgPlus} เพิ่มตำแหน่ง</button></div><div class="stats-grid"><div class="stat-card blue"><div class="stat-card-num">${jobs.length}</div><div class="stat-card-label">ตำแหน่งทั้งหมด</div></div><div class="stat-card green"><div class="stat-card-num">${jobs.filter(j=>j.status==='open').length}</div><div class="stat-card-label">เปิดรับสมัคร</div></div><div class="stat-card purple"><div class="stat-card-num">${apps.length}</div><div class="stat-card-label">ใบสมัครทั้งหมด</div></div><div class="stat-card cyan"><div class="stat-card-num">${apps.filter(a=>a.status==='review').length}</div><div class="stat-card-label">รอพิจารณา</div></div></div><div class="admin-table-wrap"><table><thead><tr><th>ตำแหน่งงาน</th><th>แผนก</th><th>สถานที่</th><th>สถานะ</th><th>โพสต์เมื่อ</th><th>จัดการ</th></tr></thead><tbody>${jobs.map(j=>`<tr><td><strong>${j.title}</strong></td><td><span class="badge badge-dept">${j.dept}</span></td><td>${j.location}</td><td><span class="status-dot ${j.status}">${j.status==='open'?'เปิดรับสมัคร':'ปิดรับสมัคร'}</span></td><td>${ago(j.posted)}</td><td><div class="td-actions"><button class="btn btn-sm btn-secondary" onclick="openJobForm(${j.id})">แก้ไข</button><button class="btn btn-sm btn-danger" onclick="deleteJob(${j.id})">ลบ</button></div></td></tr>`).join('')}</tbody></table></div></div></div>`;
}
window.deleteJob=function(id){if(!confirm('ยืนยันลบตำแหน่งนี้?'))return;DB.jobs=DB.jobs.filter(j=>j.id!==id);renderAdmin();toast('ลบตำแหน่งแล้ว','warning')};
window.openJobForm=function(id){
  const j=id?DB.jobs.find(x=>x.id===id):null;
  document.getElementById('modal-box').innerHTML=`<h2>${j?'แก้ไขตำแหน่งงาน':'เพิ่มตำแหน่งงานใหม่'}</h2><div class="form-grid"><div class="form-group"><label>ชื่อตำแหน่ง *</label><input id="mj-t" value="${j?j.title:''}" placeholder="เช่น Senior Developer"/></div><div class="form-group"><label>แผนก</label><input id="mj-d" value="${j?j.dept:''}" placeholder="Engineering"/></div><div class="form-group"><label>รูปแบบงาน</label><select id="mj-ty"><option${!j||j.type==='Full-time'?' selected':''}>Full-time</option><option${j&&j.type==='Part-time'?' selected':''}>Part-time</option><option${j&&j.type==='Contract'?' selected':''}>Contract</option></select></div><div class="form-group"><label>สถานที่</label><input id="mj-l" value="${j?j.location:''}" placeholder="กรุงเทพฯ / Remote"/></div><div class="form-group"><label>เงินเดือน</label><input id="mj-s" value="${j?j.salary:''}" placeholder="50,000 – 80,000"/></div><div class="form-group"><label>สถานะ</label><select id="mj-st"><option value="open"${!j||j.status==='open'?' selected':''}>เปิดรับสมัคร</option><option value="closed"${j&&j.status==='closed'?' selected':''}>ปิดรับสมัคร</option></select></div><div class="form-group full"><label>สรุปย่อ</label><textarea id="mj-sum" rows="2">${j?j.summary:''}</textarea></div><div class="form-group full"><label>รายละเอียดงาน</label><textarea id="mj-desc" rows="5">${j?j.description:''}</textarea></div><div class="form-group full"><label>คุณสมบัติ</label><textarea id="mj-req" rows="4">${j?j.requirements||'':''}</textarea></div><div class="form-group full"><label>ทักษะ (คั่นด้วยจุลภาค)</label><input id="mj-sk" value="${j?(j.skills||[]).join(', '):''}" placeholder="React, TypeScript"/></div></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button class="btn btn-primary" onclick="saveJob(${id||'null'})">${j?'บันทึก':'เพิ่มตำแหน่ง'}</button></div>`;
  document.getElementById('modal-overlay').classList.add('open');
};
window.saveJob=function(id){
  const title=document.getElementById('mj-t').value.trim();if(!title){toast('กรุณากรอกชื่อตำแหน่ง','error');return}
  const data={title,dept:document.getElementById('mj-d').value,type:document.getElementById('mj-ty').value,location:document.getElementById('mj-l').value,salary:document.getElementById('mj-s').value,status:document.getElementById('mj-st').value,summary:document.getElementById('mj-sum').value,description:document.getElementById('mj-desc').value,requirements:document.getElementById('mj-req').value,skills:document.getElementById('mj-sk').value.split(',').map(s=>s.trim()).filter(Boolean),posted:new Date().toISOString().slice(0,10)};
  const jobs=DB.jobs;if(id){const i=jobs.findIndex(j=>j.id===id);if(i>-1)jobs[i]={...jobs[i],...data}}else{data.id=Date.now();jobs.push(data)}
  DB.jobs=jobs;closeModal();renderAdmin();toast(id?'แก้ไขสำเร็จ!':'เพิ่มตำแหน่งสำเร็จ! 🎉');
};

if(!DB.jobs.length){DB.jobs=[{id:1,title:'Senior Frontend Developer',dept:'Engineering',type:'Full-time',location:'กรุงเทพฯ',salary:'80,000 – 120,000',status:'open',posted:'2026-05-10',summary:'พัฒนา UI/UX ระดับ Enterprise ด้วย React และ TypeScript',description:'พัฒนา UI components ด้วย React + TypeScript\nร่วมออกแบบ architecture กับทีม Backend',requirements:'ประสบการณ์ React อย่างน้อย 3 ปี\nมีความรู้ TypeScript และ REST API',skills:['React','TypeScript','GraphQL','Git']},{id:2,title:'Product Manager',dept:'Product',type:'Full-time',location:'Hybrid',salary:'90,000 – 150,000',status:'open',posted:'2026-05-12',summary:'กำหนดทิศทางผลิตภัณฑ์ เขียน PRD และ roadmap รายไตรมาส',description:'กำหนด Product Vision และ Strategy\nวิเคราะห์ข้อมูลผู้ใช้และตลาด',requirements:'ประสบการณ์ PM อย่างน้อย 3 ปี\nเข้าใจ Agile / Scrum',skills:['Agile','SQL','Figma','JIRA']},{id:3,title:'UX/UI Designer',dept:'Design',type:'Full-time',location:'กรุงเทพฯ',salary:'60,000 – 90,000',status:'open',posted:'2026-05-08',summary:'ออกแบบประสบการณ์ผู้ใช้ที่สวยงามสำหรับ web และ mobile',description:'Research และ understand user needs\nสร้าง wireframe, prototype และ final UI',requirements:'ประสบการณ์ UX/UI อย่างน้อย 2 ปี\nเชี่ยวชาญ Figma',skills:['Figma','Prototyping','User Research','Design System']}]}
navigate('home');
