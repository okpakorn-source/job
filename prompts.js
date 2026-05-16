// ─── Prompt Manager v7 — วิเคราะห์ศักยภาพ ──────────
const DEFAULT_PROMPT=`คุณคือ HR มืออาชีพระดับสูง มีประสบการณ์คัดเลือกคนมากกว่า 20 ปี
อ่าน Resume จากภาพอย่างละเอียดทุกหน้า ทุกบรรทัด

ตำแหน่งที่สมัคร: "{{JOB_TITLE}}"
{{JOB_DESC}}
{{JOB_REQ}}

วิเคราะห์ศักยภาพของผู้สมัครคนนี้อย่างลึกซึ้ง แล้วตอบเป็น JSON:

{
  "name": "ชื่อ-นามสกุลเต็ม",
  "gender": "ชาย/หญิง/ไม่ระบุ",
  "age": 0,
  "university": "มหาวิทยาลัยที่จบ",
  "degree": "วุฒิการศึกษา",
  "major": "สาขาวิชา",
  "gpa": 0.00,
  "experience_years": 0,

  "rating": "star/normal/pass",
  "rating_reason": "เหตุผลหลักที่จัดกลุ่มนี้ 1-2 ประโยค",

  "potential_highlights": ["สิ่งที่โดดเด่นมากๆ 3-5 ข้อ ที่ทำให้คนนี้น่าสนใจ"],
  "experience_detail": "สรุปประสบการณ์การทำงานอย่างละเอียด 3-5 ประโยค",
  "skills": ["ทักษะสำคัญที่มี"],
  "weaknesses": ["จุดอ่อนหรือสิ่งที่ขาด"],
  "fit_analysis": "วิเคราะห์ว่าเหมาะกับตำแหน่งนี้ไหม อย่างไร",
  "interview_questions": ["คำถามที่ควรถามตอนสัมภาษณ์ 5 ข้อ"],
  "overall_impression": "สรุปความประทับใจภาพรวม 2-3 ประโยค"
}

กฎการจัดกลุ่ม rating:
- "star" = บุคคลน่าสนใจ — มีของจริง มีผลงาน มีประสบการณ์โดดเด่น หรือมีศักยภาพสูง
- "normal" = ธรรมดา — คุณสมบัติพอใช้ได้ แต่ไม่มีอะไรโดดเด่น
- "pass" = ไม่น่าสนใจ — คุณสมบัติไม่ตรง ประสบการณ์ไม่เกี่ยวข้อง หรือ Resume ไม่มีข้อมูลเพียงพอ

กฎ:
1. ตัวเลขต้องเป็น number (age, gpa, experience_years)
2. ถ้าไม่พบข้อมูลให้ใส่ 0 หรือ "ไม่ระบุ"
3. วิเคราะห์ตรงไปตรงมา อย่าชมเกินจริง
4. ให้น้ำหนักกับผลงานจริงมากกว่าคำสวยหรู`;

const PROMPT_VERSION='v7';

function getPrompts(){
  const saved=localStorage.getItem('ai_prompts');
  const ver=localStorage.getItem('ai_prompts_ver');
  if(saved && ver===PROMPT_VERSION)return JSON.parse(saved);
  const defaults=[
    {id:'default',name:'🌐 ทุกตำแหน่ง (Default)',content:DEFAULT_PROMPT},
    {id:'dev',name:'💻 Developer / Engineer',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Technical Skills, GitHub/Portfolio, Framework, System Design, Code Quality เป็นพิเศษ'},
    {id:'pm',name:'📋 Product Manager',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Product Thinking, Data-driven Decision, Stakeholder Management เป็นพิเศษ'},
    {id:'design',name:'🎨 UX/UI Designer',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Design Thinking, Portfolio Quality, User Research เป็นพิเศษ'},
    {id:'sales',name:'💰 Sales / BD',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: ยอดขาย, การปิดดีล, Client Relationship เป็นพิเศษ'},
    {id:'marketing',name:'📣 Marketing',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Campaign Results, Digital Marketing, Content Strategy เป็นพิเศษ'}
  ];
  localStorage.setItem('ai_prompts',JSON.stringify(defaults));
  localStorage.setItem('ai_prompts_ver',PROMPT_VERSION);
  return defaults;
}
function savePrompts(p){localStorage.setItem('ai_prompts',JSON.stringify(p))}

window.renderPromptManager=function(){
  _adminView='prompts';
  const adminEl=document.getElementById('page-admin');
  const prompts=getPrompts();
  adminEl.innerHTML='<div class="admin-layout">'+adminSidebar('prompts')+'<div class="admin-content">'
    +'<div class="admin-header"><h2>📝 จัดการ Prompt</h2><button class="btn btn-primary btn-sm" onclick="addNewPrompt()">+ เพิ่ม Prompt ใหม่</button></div>'
    +'<p style="color:var(--text2);font-size:.88rem;margin-bottom:20px">สร้าง Prompt สำหรับแต่ละสายงาน<br>ใช้ <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_TITLE}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_DESC}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_REQ}}</code> เป็นตัวแปร</p>'
    +'<div id="prompt-list">'+prompts.map(function(p){return '<div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:20px;margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
      +'<div style="font-weight:700;font-size:.95rem">'+p.name+'</div>'
      +'<div style="display:flex;gap:6px">'
      +'<button class="btn btn-sm btn-secondary" onclick="editPrompt(\''+p.id+'\')">✏️ แก้ไข</button>'
      +(p.id!=='default'?'<button class="btn btn-sm btn-danger" onclick="deletePrompt(\''+p.id+'\')">🗑</button>':'')
      +'</div></div>'
      +'<div style="background:var(--bg2);padding:12px;border-radius:var(--r2);font-size:.8rem;color:var(--text3);max-height:80px;overflow:hidden;white-space:pre-wrap">'+p.content.slice(0,200)+'...</div>'
      +'</div>';}).join('')+'</div>'
    +'</div></div>';
};

window.addNewPrompt=function(){
  const name=prompt('ชื่อ Prompt:');
  if(!name)return;
  const prompts=getPrompts();
  const id='custom_'+Date.now();
  prompts.push({id:id,name:name,content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์สำหรับตำแหน่ง '+name+' เป็นพิเศษ'});
  savePrompts(prompts);
  editPrompt(id);
};

window.editPrompt=function(id){
  const prompts=getPrompts();
  const p=prompts.find(function(x){return x.id===id});
  if(!p)return;
  document.getElementById('modal-box').innerHTML='<h2>✏️ แก้ไข Prompt</h2>'
    +'<div class="form-group" style="margin-bottom:16px"><label>ชื่อ Prompt</label><input id="ep-name" type="text" value="'+p.name+'" style="font-size:.95rem"/></div>'
    +'<div class="form-group" style="margin-bottom:16px"><label>เนื้อหา Prompt</label><textarea id="ep-content" rows="14" style="font-size:.82rem;line-height:1.5;font-family:monospace">'+p.content+'</textarea></div>'
    +'<p style="font-size:.78rem;color:var(--text3);margin-bottom:16px">ตัวแปร: <code>{{JOB_TITLE}}</code> = ชื่อตำแหน่ง, <code>{{JOB_DESC}}</code> = รายละเอียดงาน, <code>{{JOB_REQ}}</code> = คุณสมบัติ</p>'
    +'<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button class="btn btn-primary" onclick="savePromptEdit(\''+id+'\')">💾 บันทึก</button></div>';
  document.getElementById('modal-overlay').classList.add('open');
};

window.savePromptEdit=function(id){
  const prompts=getPrompts();
  const p=prompts.find(function(x){return x.id===id});
  if(!p)return;
  p.name=document.getElementById('ep-name').value.trim()||p.name;
  p.content=document.getElementById('ep-content').value.trim()||p.content;
  savePrompts(prompts);
  closeModal();
  renderPromptManager();
  toast('บันทึก Prompt เรียบร้อย ✅');
};

window.deletePrompt=function(id){
  if(!confirm('ลบ Prompt นี้?'))return;
  const prompts=getPrompts().filter(function(x){return x.id!==id});
  savePrompts(prompts);
  renderPromptManager();
  toast('ลบ Prompt แล้ว');
};

window.showPromptSelector=function(applicantId){
  const prompts=getPrompts();
  document.getElementById('modal-box').innerHTML='<h2>🤖 เลือก Prompt สำหรับวิเคราะห์</h2>'
    +'<p style="color:var(--text2);font-size:.88rem;margin-bottom:16px">เลือก Prompt ที่เหมาะกับตำแหน่ง</p>'
    +'<div id="ps-list">'+prompts.map(function(p){return '<button onclick="closeModal();analyzeResume(\''+applicantId+'\',\''+p.id+'\')" style="display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r2);color:var(--text);font-family:inherit;font-size:.9rem;cursor:pointer;margin-bottom:8px;text-align:left;transition:.2s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border2)\'">'
      +'<span style="font-weight:600;flex:1">'+p.name+'</span>'
      +'<span style="color:var(--text3);font-size:.75rem">&rarr;</span>'
      +'</button>';}).join('')+'</div>'
    +'<div class="form-actions" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button></div>';
  document.getElementById('modal-overlay').classList.add('open');
};
