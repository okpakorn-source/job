// ─── Job Management Admin ────────────────────────────
let _quillDesc=null,_quillReq=null,_quillBenefits=null,_quillDetail=null;

window.renderJobManager=function(){
  _adminView='jobs';
  const adminEl=document.getElementById('page-admin');
  adminEl.innerHTML='<div class="admin-layout">'+adminSidebar('jobs')+'<div id="admin-main" class="admin-content"><div class="empty-state"><div class="empty-icon">⏳</div><h3>กำลังโหลด...</h3></div></div></div>';
  loadJobsData();
};

async function loadJobsData(){
  const {data:jobs,error}=await sb.from('jobs').select('*').neq('status','deleted').order('posted_at',{ascending:false});
  if(error)console.error('[LOAD JOBS]',error);
  window._adminJobs=jobs||[];
  const el=document.getElementById('admin-main');
  const open=jobs.filter(j=>j.status==='open').length;
  const salDisplay=j=>j.salary_min?'฿'+j.salary_min.toLocaleString()+(j.salary_max&&j.salary_max!==j.salary_min?'–฿'+j.salary_max.toLocaleString():''):'';
  el.innerHTML=`
    <div class="admin-header"><h2>📋 จัดการตำแหน่งงาน</h2><button class="btn btn-primary btn-sm" onclick="showJobForm()">+ เพิ่มตำแหน่งใหม่</button></div>
    <div class="stats-grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));margin-bottom:20px">
      <div class="stat-card blue"><div class="stat-card-num">${jobs.length}</div><div class="stat-card-label">ตำแหน่งทั้งหมด</div></div>
      <div class="stat-card green"><div class="stat-card-num">${open}</div><div class="stat-card-label">เปิดรับ</div></div>
      <div class="stat-card" style="border-left:3px solid var(--red)"><div class="stat-card-num">${jobs.length-open}</div><div class="stat-card-label">ปิดรับ</div></div>
    </div>
    <div id="job-list">${jobs.map(j=>{
      const isOpen=j.status==='open';
      return `<div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:20px;margin-bottom:12px;display:flex;gap:16px;align-items:start">
        ${j.image_url?`<img src="${j.image_url}" style="width:80px;height:80px;border-radius:var(--r2);object-fit:cover;flex-shrink:0"/>`:`<div style="width:80px;height:80px;background:var(--bg2);border-radius:var(--r2);display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0">💼</div>`}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <span style="font-weight:700;font-size:1rem">${j.title}</span>
            <span style="padding:2px 10px;border-radius:100px;font-size:.72rem;font-weight:600;background:${isOpen?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};color:${isOpen?'#22c55e':'#ef4444'}">${isOpen?'เปิดรับ':'ปิดรับ'}</span>
          </div>
          <div style="font-size:.83rem;color:var(--text3)">${j.department||''} · ${j.type||''} · ${j.location||''}</div>
          <div style="font-size:.82rem;color:var(--text2);margin-top:4px">${salDisplay(j)?'💰 '+salDisplay(j):''}</div>
          ${j.summary?`<div style="font-size:.82rem;color:var(--text3);margin-top:6px">${j.summary}</div>`:''}
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-secondary" onclick="showJobForm('${j.id}')">✏️</button>
          <button class="btn btn-sm" style="background:${isOpen?'rgba(239,68,68,.1)':'rgba(34,197,94,.1)'};color:${isOpen?'#ef4444':'#22c55e'};border:1px solid ${isOpen?'#ef444433':'#22c55e33'}" onclick="toggleJobStatus('${j.id}','${isOpen?'closed':'open'}')">${isOpen?'ปิด':'เปิด'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteJob('${j.id}','${j.title.replace(/'/g,"\\'")}')">🗑</button>
        </div>
      </div>`;
    }).join('')||'<div class="empty-state"><h3>ยังไม่มีตำแหน่งงาน</h3></div>'}</div>`;
}

function initQuill(id,placeholder,content){
  const q=new Quill('#'+id,{
    theme:'snow',
    placeholder:placeholder,
    modules:{
      toolbar:[
        [{'header':[1,2,3,false]}],
        ['bold','italic','underline','strike'],
        [{'color':[]},{'background':[]}],
        [{'list':'ordered'},{'list':'bullet'}],
        ['link','image'],
        ['blockquote','code-block'],
        ['clean']
      ]
    }
  });
  if(content){
    if(content.startsWith('<'))q.root.innerHTML=content;
    else q.setText(content);
  }
  return q;
}

window.showJobForm=function(editId){
  const jobs=window._adminJobs||[];
  const j=editId?jobs.find(x=>x.id==editId):null;
  const isEdit=!!j;
  const salVal=j?(j.salary_min?(j.salary_min+(j.salary_max&&j.salary_max!==j.salary_min?'-'+j.salary_max:'')):''):'';

  document.getElementById('modal-box').innerHTML=`
    <h2>${isEdit?'✏️ แก้ไขตำแหน่ง':'+ เพิ่มตำแหน่งใหม่'}</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="form-group"><label>ชื่อตำแหน่ง <span class="req">*</span></label><input id="jf-title" value="${j?.title||''}"/></div>
      <div class="form-group"><label>แผนก</label><input id="jf-dept" value="${j?.department||''}"/></div>
      <div class="form-group"><label>ประเภท</label><select id="jf-type"><option value="Full-time" ${j?.type==='Full-time'?'selected':''}>Full-time</option><option value="Part-time" ${j?.type==='Part-time'?'selected':''}>Part-time</option><option value="Contract" ${j?.type==='Contract'?'selected':''}>Contract</option><option value="Freelance" ${j?.type==='Freelance'?'selected':''}>Freelance</option><option value="Intern" ${j?.type==='Intern'?'selected':''}>Intern</option></select></div>
      <div class="form-group"><label>สถานที่</label><input id="jf-loc" value="${j?.location||''}"/></div>
      <div class="form-group"><label>เงินเดือน</label><input id="jf-salary" value="${salVal}" placeholder="เช่น 50000-80000"/></div>
      <div class="form-group"><label>สถานะ</label><select id="jf-status"><option value="open" ${j?.status==='open'?'selected':''}>เปิดรับ</option><option value="closed" ${j?.status!=='open'?'selected':''}>ปิดรับ</option></select></div>
    </div>
    <div class="form-group" style="margin-top:12px"><label>สรุปสั้น</label><input id="jf-summary" value="${j?.summary||''}" placeholder="สรุป 1-2 ประโยค"/></div>
    <div class="form-group" style="margin-top:16px"><label>📝 รายละเอียดงาน <span style="font-size:.75rem;color:var(--text3)">(รองรับรูปภาพ+ลิงค์)</span></label><div id="q-desc" style="min-height:120px"></div></div>
    <div class="form-group" style="margin-top:16px"><label>📋 คุณสมบัติที่ต้องการ</label><div id="q-req" style="min-height:100px"></div></div>
    <div class="form-group" style="margin-top:16px"><label>🎁 สวัสดิการ</label><div id="q-benefits" style="min-height:80px"></div></div>
    <div class="form-group" style="margin-top:16px"><label>📄 รายละเอียดเพิ่มเติม</label><div id="q-detail" style="min-height:100px"></div></div>
    <div class="form-group" style="margin-top:12px">
      <label>รูปภาพปกตำแหน่ง</label>
      ${j?.image_url?`<img src="${j.image_url}" style="width:100%;max-height:150px;object-fit:cover;border-radius:var(--r2);margin-bottom:8px"/>`:'' }
      <input id="jf-img" type="file" accept="image/*" style="font-size:.85rem"/>
      <input id="jf-img-url" type="text" placeholder="หรือวาง URL รูปภาพ" value="${j?.image_url||''}" style="margin-top:6px;font-size:.85rem"/>
    </div>
    <div class="form-group" style="margin-top:12px"><label>Skills (คั่นด้วย ,)</label><input id="jf-skills" value="${(j?.skills||[]).join(', ')}" placeholder="React, TypeScript, SQL"/></div>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="saveJob(${isEdit?"'"+j.id+"'":'null'})">💾 บันทึก</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
  // Init Quill editors after DOM is ready
  setTimeout(()=>{
    _quillDesc=initQuill('q-desc','อธิบายหน้าที่ ความรับผิดชอบ ใส่รูปตัวอย่างงานได้...',j?.description||'');
    _quillReq=initQuill('q-req','คุณสมบัติที่ต้องการ...',j?.requirements||'');
    _quillBenefits=initQuill('q-benefits','สวัสดิการที่ได้รับ...',j?.benefits||'');
    _quillDetail=initQuill('q-detail','รายละเอียดเต็ม ใส่ลิงค์ตัวอย่างได้...',j?.detailed_desc||'');
  },100);
};

window.saveJob=async function(editId){
  const title=document.getElementById('jf-title').value.trim();
  if(!title){toast('กรุณากรอกชื่อตำแหน่ง','error');return}
  let imageUrl=document.getElementById('jf-img-url').value.trim();
  const fileInput=document.getElementById('jf-img');
  if(fileInput.files.length>0){
    const file=fileInput.files[0];
    const fname='job_'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9.]/g,'_');
    const upRes=await fetch(SUPABASE_URL+'/storage/v1/object/job-images/'+fname,{
      method:'POST',
      headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Content-Type':file.type},
      body:file
    });
    if(upRes.ok)imageUrl=SUPABASE_URL+'/storage/v1/object/public/job-images/'+fname;
    else console.warn('Image upload failed');
  }
  const skillsRaw=document.getElementById('jf-skills').value.trim();
  const skills=skillsRaw?skillsRaw.split(',').map(s=>s.trim()).filter(Boolean):[];
  // Get rich text content from Quill editors
  const descHtml=_quillDesc?_quillDesc.root.innerHTML:'';
  const reqHtml=_quillReq?_quillReq.root.innerHTML:'';
  const benefitsHtml=_quillBenefits?_quillBenefits.root.innerHTML:'';
  const detailHtml=_quillDetail?_quillDetail.root.innerHTML:'';
  // Parse salary: "50000-80000" → salary_min=50000, salary_max=80000
  const salRaw=document.getElementById('jf-salary').value.trim();
  let salary_min=null,salary_max=null;
  if(salRaw){
    const parts=salRaw.replace(/[฿,\s]/g,'').split(/[-–]/);
    salary_min=parseInt(parts[0])||null;
    salary_max=parts[1]?parseInt(parts[1]):salary_min;
  }
  const payload={
    title,
    department:document.getElementById('jf-dept').value.trim(),
    type:document.getElementById('jf-type').value,
    location:document.getElementById('jf-loc').value.trim(),
    salary_min,
    salary_max,
    status:document.getElementById('jf-status').value,
    summary:document.getElementById('jf-summary').value.trim(),
    description:descHtml==='<p><br></p>'?'':descHtml,
    requirements:reqHtml==='<p><br></p>'?'':reqHtml,
    benefits:benefitsHtml==='<p><br></p>'?'':benefitsHtml,
    detailed_desc:detailHtml==='<p><br></p>'?'':detailHtml,
    image_url:imageUrl,
    skills,
    posted_at:new Date().toISOString()
  };
  try{
    let error;
    if(editId){
      ({error}=await sb.from('jobs').update(payload).eq('id',editId));
    }else{
      ({error}=await sb.from('jobs').insert([payload]));
    }
    if(error)throw error;
    closeModal();
    toast(editId?'อัปเดตตำแหน่งเรียบร้อย ✅':'เพิ่มตำแหน่งใหม่เรียบร้อย ✅');
    window._adminJobs=null;
    window._sbJobs=[];
    renderJobManager();
  }catch(err){
    console.error('[SAVE JOB]',err);
    toast('Error: '+(err.message||JSON.stringify(err)),'error');
  }
};

window.toggleJobStatus=async function(id,newStatus){
  try{
    const {data,error}=await sb.from('jobs').update({status:newStatus}).eq('id',id).select();
    if(error)throw error;
    if(!data||!data.length)throw new Error('ไม่พบตำแหน่งหรือไม่มีสิทธิ์แก้ไข');
    toast(newStatus==='open'?'เปิดรับสมัครแล้ว ✅':'ปิดรับสมัครแล้ว');
    window._adminJobs=null;
    renderJobManager();
  }catch(err){toast('Error: '+err.message,'error')}
};

window.deleteJob=async function(id,title){
  if(!confirm('ลบตำแหน่ง "'+title+'" ?'))return;
  try{
    // ปลด foreign key — set job_id=null ในใบสมัครที่อ้าง job นี้
    await sb.from('applicants').update({job_id:null}).eq('job_id',id);
    // ลบจริง
    const {error}=await sb.from('jobs').delete().eq('id',id);
    if(error){
      console.error('[DELETE JOB]',error);
      throw error;
    }
    window._adminJobs=null;
    window._sbJobs=[];
    toast('ลบตำแหน่ง "'+title+'" แล้ว ✅');
    renderJobManager();
  }catch(err){
    console.error('[DELETE JOB]',err);
    toast('Error: '+err.message,'error');
  }
};

window.deleteApplicant=async function(id,name){
  if(!confirm('ลบใบสมัครของ "'+name+'" ?'))return;
  try{
    const {error}=await sb.from('applicants').delete().eq('id',id);
    if(error)throw error;
    window._adminApps=(window._adminApps||[]).filter(a=>a.id!==id);
    toast('ลบใบสมัครแล้ว ✅');
    filterApplicants();
  }catch(err){toast('Error: '+err.message,'error')}
};
