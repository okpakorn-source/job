let _sbJobs=[];
async function renderHome(){
  document.getElementById('page-home').innerHTML=`<section class="hero"><div class="hero-badge">🏠 Work From Home 100%</div><h1>Creator <span>WFH 100%</span></h1><p>ค้นหางาน Work From Home ที่ใช่สำหรับคุณ</p><div class="hero-stats"><div class="stat"><div class="stat-num" id="hn-open">—</div><div class="stat-label">ตำแหน่งเปิดรับ</div></div><div class="stat"><div class="stat-num" id="hn-dept">—</div><div class="stat-label">แผนก</div></div></div></section><div class="search-bar"><div class="search-inner"><input id="si" type="text" placeholder="ค้นหาตำแหน่ง..." value="${q}" oninput="q=this.value;renderCards()"/><select id="fd-sel" onchange="fd=this.value;renderCards()"><option value="">ทุกแผนก</option></select><select onchange="ft=this.value;renderCards()"><option value="">ทุกประเภท</option><option value="Full-time"${ft==='Full-time'?' selected':''}>Full-time</option><option value="Part-time"${ft==='Part-time'?' selected':''}>Part-time</option><option value="Contract"${ft==='Contract'?' selected':''}>Contract</option></select></div></div><div class="container"><div class="section-header"><div class="flex items-center gap-8"><span class="section-title">ตำแหน่งงานทั้งหมด</span><span class="section-count" id="jc">…</span></div></div><div class="jobs-grid" id="jg"><div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">⏳</div><h3>กำลังโหลด...</h3></div></div></div>`;
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
  jg.innerHTML=jobs.length?jobs.map(j=>`<div class="job-card" onclick="navigate('detail','${j.id}')">${j.image_url?`<img src="${j.image_url}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--r2);margin-bottom:12px"/>`:''}    <div class="job-card-top"><div class="job-logo">${initials(j.title)}</div><div class="job-badges"><span class="badge badge-type">${j.type}</span>${j.status==='open'?'<span class="badge badge-new">✅ เปิดรับ</span>':'<span class="badge badge-urgent">🔒 ปิด</span>'}${j.is_urgent?'<span class="badge badge-urgent">🔥 ด่วน</span>':''}</div></div><div class="job-title">${j.title}</div><div style="margin-top:6px"><span class="badge badge-dept">${j.department||''}</span></div><div class="job-info" style="margin-top:10px"><span>📍 ${j.location}</span><span>💼 ${j.type}</span></div><div class="job-desc">${j.summary||''}</div><div class="job-footer"><div class="job-salary">${svgMoney} ${sal(j)}</div><div class="job-date">${ago(j.posted_at)}</div></div></div>`).join(''):`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🔍</div><h3>ไม่พบตำแหน่งงาน</h3><p class="text-muted">ลองเปลี่ยนคำค้นหา</p></div>`;
};
async function renderDetail(){
  let j=_sbJobs.find(x=>x.id===selJob);
  if(!j&&selJob){try{const {data}=await sb.from('jobs').select('*').eq('id',selJob).single();if(data)j=data;}catch(e){}}
  if(!j){navigate('home');return}
  const sal=j.salary_min&&j.salary_max?`฿${j.salary_min.toLocaleString()}–${j.salary_max.toLocaleString()}`:j.salary_min?`฿${j.salary_min.toLocaleString()}+`:'ตามตกลง';
  document.getElementById('page-detail').innerHTML=`<div class="detail-hero"><div class="detail-container"><button class="back-btn" onclick="navigate('home')">${svgBack} กลับรายการงาน</button>${j.image_url?`<img src="${j.image_url}" style="width:100%;max-height:250px;object-fit:cover;border-radius:var(--r);margin-bottom:16px"/>`:''}<div class="detail-header"><div class="detail-logo">${initials(j.title)}</div><div><div class="detail-title">${j.title}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span class="badge badge-dept">${j.department||''}</span><span class="badge badge-type">${j.type}</span>${j.status==='open'?'<span class="badge badge-new">✅ เปิดรับสมัคร</span>':'<span class="badge badge-urgent">🔒 ปิดรับสมัคร</span>'}</div><div class="detail-meta"><span>📍 ${j.location}</span><span>${svgMoney} ${sal}/เดือน</span><span>📅 ${ago(j.posted_at)}</span></div></div></div></div></div><div class="detail-body"><div class="detail-grid"><div><div class="detail-section"><h3>เกี่ยวกับตำแหน่งงาน</h3><div class="rich-content">${j.description||''}</div></div>${j.detailed_desc?`<div class="detail-section"><h3>รายละเอียดเพิ่มเติม</h3><div class="rich-content">${j.detailed_desc}</div></div>`:''}${j.requirements?`<div class="detail-section"><h3>คุณสมบัติที่ต้องการ</h3><div class="rich-content">${j.requirements}</div></div>`:''}${j.benefits?`<div class="detail-section"><h3>🎁 สวัสดิการ</h3><div class="rich-content">${j.benefits}</div></div>`:''}<div class="detail-section"><h3>ทักษะที่เกี่ยวข้อง</h3><div class="skill-tags">${(j.skills||[]).map(s=>`<span class="skill-tag">${s}</span>`).join('')}</div></div></div><div><div class="info-card"><h3>ข้อมูลตำแหน่ง</h3><div class="info-row"><span class="label">แผนก</span><span class="value">${j.department||'-'}</span></div><div class="info-row"><span class="label">รูปแบบ</span><span class="value">${j.type}</span></div><div class="info-row"><span class="label">สถานที่</span><span class="value">${j.location}</span></div><div class="info-row"><span class="label">เงินเดือน</span><span class="value" style="color:var(--green)">${sal}</span></div>${j.status==='open'?`<button class="btn btn-primary btn-lg apply-cta" onclick="navigate('apply','${j.id}')">สมัครงานตำแหน่งนี้</button>`:`<button class="btn btn-secondary btn-lg apply-cta" disabled>ปิดรับสมัครแล้ว</button>`}</div></div></div></div>`;
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
