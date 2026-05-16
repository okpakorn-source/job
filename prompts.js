// ─── Prompt Manager v8 ──────────────────────────────
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
  "university": "มหาวิทยาลัยที่จบ (ภาษาไทย)",
  "university_en": "University Name (English)",
  "degree": "วุฒิการศึกษา",
  "major": "สาขาวิชา",
  "gpa": 0.00,
  "experience_years": 0,
  "rating": "star/normal/pass",
  "rating_reason": "เหตุผลหลักที่จัดกลุ่มนี้ 1-2 ประโยค",
  "potential_highlights": ["สิ่งที่โดดเด่นมากๆ 3-5 ข้อ"],
  "experience_detail": "สรุปประสบการณ์การทำงานอย่างละเอียด 3-5 ประโยค",
  "skills": ["ทักษะสำคัญที่มี"],
  "weaknesses": ["จุดอ่อนหรือสิ่งที่ขาด"],
  "fit_analysis": "วิเคราะห์ว่าเหมาะกับตำแหน่งนี้ไหม อย่างไร",
  "interview_questions": ["คำถามที่ควรถามตอนสัมภาษณ์ 5 ข้อ"],
  "overall_impression": "สรุปความประทับใจภาพรวม 2-3 ประโยค"
}

เกณฑ์มาร์ค "star" อัตโนมัติ — ถ้าเข้าข่ายข้อใดข้อหนึ่งให้ rating = "star":

1. มหาวิทยาลัย Top 15 ไทย (ทั้งชื่อไทยและอังกฤษ):
   จุฬาลงกรณ์/Chulalongkorn, มหิดล/Mahidol, เชียงใหม่/Chiang Mai,
   ธรรมศาสตร์/Thammasat, เกษตรศาสตร์/Kasetsart, ขอนแก่น/Khon Kaen,
   สงขลานครินทร์/Prince of Songkla, ลาดกระบัง/KMITL/Ladkrabang,
   พระจอมเกล้าธนบุรี/KMUTT/Thonburi, พระจอมเกล้าพระนครเหนือ/KMUTNB,
   ศรีนครินทรวิโรฒ/Srinakharinwirot/มศว, บูรพา/Burapha,
   แม่ฟ้าหลวง/Mae Fah Luang, สุรนารี/Suranaree, ศิลปากร/Silpakorn

2. เกรดเฉลี่ย GPA ≥ 3.00

3. เพศ/อายุ เป็นแค่ข้อมูล ไม่นับเป็นเกณฑ์

กฎ:
1. ตัวเลขต้องเป็น number (age, gpa, experience_years)
2. ถ้าไม่พบข้อมูลให้ใส่ 0 หรือ "ไม่ระบุ"
3. วิเคราะห์ตรงไปตรงมา อย่าชมเกินจริง
4. ให้น้ำหนักกับผลงานจริงมากกว่าคำสวยหรู
5. university ต้องเป็นชื่อเต็มภาษาไทย, university_en เป็นชื่อเต็มภาษาอังกฤษ`;

const PROMPT_VERSION='v8';

function getPrompts(){
  const saved=localStorage.getItem('ai_prompts');
  const ver=localStorage.getItem('ai_prompts_ver');
  if(saved && ver===PROMPT_VERSION)return JSON.parse(saved);
  const defaults=[
    {id:'default',name:'🌐 ทุกตำแหน่ง (Default)',content:DEFAULT_PROMPT},
    {id:'dev',name:'💻 Developer / Engineer',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Technical Skills, GitHub/Portfolio, Framework เป็นพิเศษ'},
    {id:'pm',name:'📋 Product Manager',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Product Thinking, Data-driven, Agile เป็นพิเศษ'},
    {id:'design',name:'🎨 UX/UI Designer',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Portfolio, Figma, User Research เป็นพิเศษ'},
    {id:'sales',name:'💰 Sales / BD',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: ยอดขาย, การปิดดีล เป็นพิเศษ'},
    {id:'marketing',name:'📣 Marketing',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์: Campaign Results, Digital Marketing เป็นพิเศษ'}
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
    +'<p style="color:var(--text2);font-size:.88rem;margin-bottom:20px">สร้าง Prompt สำหรับแต่ละสายงาน — ใช้ <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_TITLE}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_DESC}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_REQ}}</code></p>'
    +'<div id="prompt-list">'+prompts.map(function(p){return '<div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:20px;margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-weight:700;font-size:.95rem">'+p.name+'</div><div style="display:flex;gap:6px">'
      +'<button class="btn btn-sm btn-secondary" onclick="editPrompt(\''+p.id+'\')">✏️</button>'
      +(p.id!=='default'?'<button class="btn btn-sm btn-danger" onclick="deletePrompt(\''+p.id+'\')">🗑</button>':'')
      +'</div></div><div style="background:var(--bg2);padding:12px;border-radius:var(--r2);font-size:.8rem;color:var(--text3);max-height:80px;overflow:hidden;white-space:pre-wrap">'+p.content.slice(0,200)+'...</div></div>';}).join('')+'</div></div></div>';
};

window.addNewPrompt=function(){
  const name=prompt('ชื่อ Prompt:');if(!name)return;
  const prompts=getPrompts();
  prompts.push({id:'custom_'+Date.now(),name:name,content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์สำหรับตำแหน่ง '+name+' เป็นพิเศษ'});
  savePrompts(prompts);editPrompt(prompts[prompts.length-1].id);
};

window.editPrompt=function(id){
  const prompts=getPrompts();const p=prompts.find(x=>x.id===id);if(!p)return;
  document.getElementById('modal-box').innerHTML='<h2>✏️ แก้ไข Prompt</h2>'
    +'<div class="form-group" style="margin-bottom:16px"><label>ชื่อ</label><input id="ep-name" type="text" value="'+p.name+'"/></div>'
    +'<div class="form-group" style="margin-bottom:16px"><label>เนื้อหา</label><textarea id="ep-content" rows="14" style="font-size:.82rem;font-family:monospace">'+p.content+'</textarea></div>'
    +'<div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button><button class="btn btn-primary" onclick="savePromptEdit(\''+id+'\')">💾 บันทึก</button></div>';
  document.getElementById('modal-overlay').classList.add('open');
};

window.savePromptEdit=function(id){
  const prompts=getPrompts();const p=prompts.find(x=>x.id===id);if(!p)return;
  p.name=document.getElementById('ep-name').value.trim()||p.name;
  p.content=document.getElementById('ep-content').value.trim()||p.content;
  savePrompts(prompts);closeModal();renderPromptManager();toast('บันทึกแล้ว ✅');
};

window.deletePrompt=function(id){
  if(!confirm('ลบ Prompt นี้?'))return;
  savePrompts(getPrompts().filter(x=>x.id!==id));renderPromptManager();toast('ลบแล้ว');
};

window.showPromptSelector=function(applicantId){
  const prompts=getPrompts();
  document.getElementById('modal-box').innerHTML='<h2>🤖 เลือก Prompt</h2>'
    +'<p style="color:var(--text2);font-size:.88rem;margin-bottom:16px">เลือก Prompt ที่เหมาะกับตำแหน่ง</p>'
    +prompts.map(p=>'<button onclick="closeModal();analyzeResume(\''+applicantId+'\',\''+p.id+'\')" style="display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r2);color:var(--text);font-family:inherit;font-size:.9rem;cursor:pointer;margin-bottom:8px;text-align:left;transition:.2s" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border2)\'"><span style="font-weight:600;flex:1">'+p.name+'</span><span style="color:var(--text3)">&rarr;</span></button>').join('')
    +'<div class="form-actions" style="margin-top:16px"><button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button></div>';
  document.getElementById('modal-overlay').classList.add('open');
};
