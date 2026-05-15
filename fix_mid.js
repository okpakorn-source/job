  document.getElementById('page-apply').innerHTML=`<div class="apply-hero"><h1>📋 ใบสมัครงาน</h1><p>กรอกข้อมูลให้ครบถ้วน เราจะติดต่อกลับโดยเร็ว</p></div><div class="apply-container"><form class="form-card" onsubmit="submitApp(event)"><div class="form-section-title">เลือกตำแหน่งงาน</div><div class="form-group"><label>ตำแหน่งที่สนใจ <span class="req">*</span></label><select id="fa-pos" required><option value="">-- เลือกตำแหน่ง --</option>${jobs.map(j=>`<option value="${j.id}">${jobLabel(j)}</option>`).join('')}</select></div><div class="form-section-title">ข้อมูลส่วนตัว</div><div class="form-grid"><div class="form-group"><label>ชื่อ-นามสกุล <span class="req">*</span></label><input id="fa-name" type="text" placeholder="เช่น สมชาย ใจดี" required/></div><div class="form-group"><label>อีเมล <span class="req">*</span></label><input id="fa-email" type="email" placeholder="example@email.com" required/></div><div class="form-group"><label>เบอร์โทรศัพท์ <span class="req">*</span></label><input id="fa-phone" type="tel" placeholder="08x-xxx-xxxx" required/></div><div class="form-group"><label>Portfolio / LinkedIn</label><input id="fa-link" type="url" placeholder="https://"/></div><div class="form-group full"><label>แนะนำตัวเอง</label><textarea id="fa-bio" rows="4" placeholder="บอกเล่าประสบการณ์และความสามารถของคุณ..."></textarea></div></div><div class="form-section-title">อัปโหลดเอกสาร <span style="font-weight:400;color:var(--text3);font-size:.82rem">(ไม่บังคับ)</span></div><div class="file-upload"><input type="file" accept="application/pdf" onchange="window._resumeFile=this.files[0];document.getElementById('fn').textContent='✅ '+this.files[0].name;document.getElementById('fn').style.display='block'"/><div class="file-upload-icon">📄</div><p>คลิกหรือลาก Resume มาวางที่นี่ <span style="color:var(--text3)">(ถ้ามี)</span></p><p class="note">รองรับ PDF เท่านั้น ขนาดไม่เกิน 10MB</p></div><div class="file-name" id="fn"></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="navigate('home')">ยกเลิก</button><button type="submit" class="btn btn-success btn-lg">${svgPlus} ส่งใบสมัคร</button></div></form></div>`;
}
window.submitApp=async function(e){
  e.preventDefault();
  const btn=e.target.querySelector('[type=submit]');
  btn.disabled=true; btn.textContent='กำลังส่ง...';
  try{
    const jobId=document.getElementById('fa-pos').value;
    const fullName=document.getElementById('fa-name').value.trim();
    const email=document.getElementById('fa-email').value.trim();
    const phone=document.getElementById('fa-phone').value.trim();
    const linkedin=document.getElementById('fa-link').value.trim();
    const bio=document.getElementById('fa-bio').value.trim();
    const file=window._resumeFile||null;
    if(!jobId)    throw new Error('กรุณาเลือกตำแหน่งที่สนใจ');
    const isUUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
    const safeJobId=isUUID?jobId:null;
    const jobTitle=document.getElementById('fa-pos').selectedOptions[0]?.text||null;
    if(!fullName) throw new Error('กรุณากรอกชื่อ-นามสกุล');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง');
    if(!phone)    throw new Error('กรุณากรอกเบอร์โทรศัพท์');
    if(file){
      if(file.type!=='application/pdf') throw new Error('รองรับเฉพาะไฟล์ PDF เท่านั้น');
      if(file.size>10*1024*1024) throw new Error('ขนาดไฟล์ต้องไม่เกิน 10MB');
    }
    const payload={job_id:safeJobId,full_name:fullName,email,phone,linkedin_url:linkedin||null,cover_letter:(jobTitle&&!safeJobId?`[ตำแหน่ง: ${jobTitle}] `:'')+(bio||'')};
    console.log('[ATS] URL:',SUPABASE_URL);
    console.log('[ATS] payload:',JSON.stringify(payload));
    const {data:applicant,error:insErr}=await sb.from('applicants').insert([payload]).select('id').single();
    console.log('[ATS] INSERT:',applicant,'err:',insErr);
    if(insErr){alert(JSON.stringify(insErr));throw new Error('DB: '+insErr.message);}
    if(!applicant?.id) throw new Error('Insert ไม่สำเร็จ — ตรวจสอบ RLS policy และ anon key');
    if(file){
      const path=`${applicant.id}/resume.pdf`;
      const {error:upErr}=await sb.storage.from('resumes').upload(path,file,{contentType:'application/pdf'});
      if(upErr) throw upErr;
      await sb.from('applicants').update({resume_path:path,resume_filename:file.name}).eq('id',applicant.id);
    }
    window._resumeFile=null;
    document.getElementById('page-apply').innerHTML=`<div class="apply-container"><div class="success-screen"><div class="success-icon">✅</div><h2>ส่งใบสมัครสำเร็จ!</h2><p class="text-muted">ทีมงานจะติดต่อกลับภายใน 3-5 วันทำการ</p><div style="margin-top:32px;display:flex;gap:12px;justify-content:center"><button class="btn btn-secondary" onclick="navigate('home')">ดูตำแหน่งอื่น</button><button class="btn btn-primary" onclick="navigate('apply')">สมัครอีกครั้ง</button></div></div></div>`;
    toast('ส่งใบสมัครเรียบร้อย! 🎉');
  }catch(err){
    console.error('[ATS] Error:',err);
    toast(err.message||'เกิดข้อผิดพลาด กรุณาลองใหม่','error');
    btn.disabled=false; btn.textContent='ส่งใบสมัคร';
  }
};
