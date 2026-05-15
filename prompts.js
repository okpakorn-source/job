// ─── Prompt Manager v6 ──────────────────────────────
const DEFAULT_PROMPT=`คุณคือ HR มืออาชีพ อ่าน Resume จากภาพอย่างละเอียดทุกหน้า ทุกบรรทัด วิเคราะห์ข้อมูลสำคัญ ตอบเป็น JSON เท่านั้น

ตำแหน่งที่สมัคร: "{{JOB_TITLE}}"
{{JOB_DESC}}
{{JOB_REQ}}

สิ่งที่ต้องหาให้เจอ (สำคัญมาก):

1. มหาวิทยาลัย — หาจากส่วน Education/การศึกษา อาจเขียนเป็นภาษาไทยหรืออังกฤษ เช่น:
   - "จุฬาลงกรณ์มหาวิทยาลัย" หรือ "Chulalongkorn University" หรือ "CU"
   - "มหาวิทยาลัยธรรมศาสตร์" หรือ "Thammasat University" หรือ "TU"
   - "มหาวิทยาลัยเกษตรศาสตร์" หรือ "Kasetsart University" หรือ "KU"
   - "สจล." หรือ "KMITL" หรือ "King Mongkut's Ladkrabang"
   - "มจธ." หรือ "KMUTT" หรือ "King Mongkut's Thonburi"
   - "มจพ." หรือ "KMUTNB" หรือ "King Mongkut's North Bangkok"
   - อาจเขียนแค่ชื่อย่อ หรือชื่อเต็ม ให้แปลงเป็นชื่อเต็มเสมอ

2. GPA/เกรดเฉลี่ย — หาจากส่วน Education อาจเขียนว่า:
   - "GPA: 3.45" หรือ "GPAX: 3.45" หรือ "เกรดเฉลี่ย 3.45"
   - "Grade: 3.45" หรือ "GPA 3.45/4.00" หรือ "(3.45)"
   - อาจอยู่ข้างๆ ชื่อมหาวิทยาลัย หรือชื่อปริญญา

3. เพศ — ดูจากชื่อ/รูป/คำนำหน้า (นาย/นาง/นางสาว/Mr./Ms./Mrs.)

4. อายุ — ดูจากวันเกิด/ปีเกิด แล้วคำนวณ หรือดูจากปีที่จบการศึกษา

ตอบ JSON นี้:
{
  "name": "ชื่อ-นามสกุลเต็ม",
  "gender": "ชาย/หญิง/ไม่ระบุ",
  "age": 0,
  "university": "ชื่อเต็มมหาวิทยาลัย (ภาษาไทย)",
  "university_en": "Full University Name (English)",
  "degree": "ป.ตรี/ป.โท/ป.เอก",
  "major": "สาขาวิชา",
  "gpa": 0.00,
  "experience_years": 0,
  "experience_summary": "สรุปประสบการณ์ 2-3 ประโยค",
  "skills": "ทักษะหลักๆ",
  "strengths": ["จุดแข็ง 3-5 ข้อ"],
  "red_flags": ["จุดที่ต้องระวัง"],
  "summary": "สรุป 1 ประโยค",
  "interview_questions": ["คำถามสัมภาษณ์ 5 ข้อ"]
}

กฎ:
1. gpa = ตัวเลขทศนิยม 2 ตำแหน่ง (ถ้าไม่มีใส่ 0)
2. age = ตัวเลข (ถ้าไม่มีใส่ 0)
3. university = ชื่อเต็มภาษาไทย (ถ้าเขียนอังกฤษให้แปลงเป็นไทยด้วย)
4. university_en = ชื่อเต็มภาษาอังกฤษ
5. ห้ามตอบ "ไม่ระบุ" ถ้ามีข้อมูลอยู่ในรูป ต้องพยายามอ่านให้ได้`;

const PROMPT_VERSION='v6';

function getPrompts(){
  const saved=localStorage.getItem('ai_prompts');
  const ver=localStorage.getItem('ai_prompts_ver');
  if(saved && ver===PROMPT_VERSION)return JSON.parse(saved);
  const defaults=[
    {id:'default',name:'🌐 ทุกตำแหน่ง (Default)',content:DEFAULT_PROMPT},
    {id:'dev',name:'💻 Developer / Engineer',content:DEFAULT_PROMPT+'\n\nเน้นหาข้อมูล: GitHub/Portfolio, Programming Languages, Framework เป็นพิเศษ'},
    {id:'pm',name:'📋 Product Manager',content:DEFAULT_PROMPT+'\n\nเน้นหาข้อมูล: Product Thinking, PRD Writing, Agile/Scrum เป็นพิเศษ'},
    {id:'design',name:'🎨 UX/UI Designer',content:DEFAULT_PROMPT+'\n\nเน้นหาข้อมูล: Portfolio Quality, Figma/Prototyping, User Research เป็นพิเศษ'},
    {id:'sales',name:'💰 Sales / BD',content:DEFAULT_PROMPT+'\n\nเน้นหาข้อมูล: ยอดขาย, การปิดดีล, Client Relationship เป็นพิเศษ'},
    {id:'marketing',name:'📣 Marketing',content:DEFAULT_PROMPT+'\n\nเน้นหาข้อมูล: Campaign Results, Digital Marketing, Content Strategy เป็นพิเศษ'}
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
  adminEl.innerHTML=`<div class="admin-layout">${adminSidebar('prompts')}<div class="admin-content">
    <div class="admin-header"><h2>📝 จัดการ Prompt</h2><button class="btn btn-primary btn-sm" onclick="addNewPrompt()">+ เพิ่ม Prompt ใหม่</button></div>
    <p style="color:var(--text2);font-size:.88rem;margin-bottom:20px">สร้าง Prompt สำหรับแต่ละสายงาน<br>ใช้ <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_TITLE}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_DESC}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_REQ}}</code> เป็นตัวแปรอัตโนมัติ</p>
    <div id="prompt-list">${prompts.map((p,i)=>`
      <div style="background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:20px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700;font-size:.95rem">${p.name}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="editPrompt('${p.id}')">✏️ แก้ไข</button>
            ${p.id!=='default'?`<button class="btn btn-sm btn-danger" onclick="deletePrompt('${p.id}')">🗑</button>`:''}
          </div>
        </div>
        <div style="background:var(--bg2);padding:12px;border-radius:var(--r2);font-size:.8rem;color:var(--text3);max-height:80px;overflow:hidden;white-space:pre-wrap">${p.content.slice(0,200)}...</div>
      </div>
    `).join('')}</div>
  </div></div>`;
};

window.addNewPrompt=function(){
  const name=prompt('ชื่อ Prompt (เช่น "💻 Backend Developer"):');
  if(!name)return;
  const prompts=getPrompts();
  const id='custom_'+Date.now();
  prompts.push({id,name,content:DEFAULT_PROMPT+'\n\nเน้นหาข้อมูลสำหรับตำแหน่ง '+name+' เป็นพิเศษ'});
  savePrompts(prompts);
  editPrompt(id);
};

window.editPrompt=function(id){
  const prompts=getPrompts();
  const p=prompts.find(x=>x.id===id);
  if(!p)return;
  document.getElementById('modal-box').innerHTML=`
    <h2>✏️ แก้ไข Prompt</h2>
    <div class="form-group" style="margin-bottom:16px">
      <label>ชื่อ Prompt</label>
      <input id="ep-name" type="text" value="${p.name}" style="font-size:.95rem"/>
    </div>
    <div class="form-group" style="margin-bottom:16px">
      <label>เนื้อหา Prompt</label>
      <textarea id="ep-content" rows="14" style="font-size:.82rem;line-height:1.5;font-family:monospace">${p.content}</textarea>
    </div>
    <p style="font-size:.78rem;color:var(--text3);margin-bottom:16px">ตัวแปร: <code>{{JOB_TITLE}}</code> = ชื่อตำแหน่ง, <code>{{JOB_DESC}}</code> = รายละเอียดงาน, <code>{{JOB_REQ}}</code> = คุณสมบัติ</p>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
      <button class="btn btn-primary" onclick="savePromptEdit('${id}')">💾 บันทึก</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
};

window.savePromptEdit=function(id){
  const prompts=getPrompts();
  const p=prompts.find(x=>x.id===id);
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
  const prompts=getPrompts().filter(x=>x.id!==id);
  savePrompts(prompts);
  renderPromptManager();
  toast('ลบ Prompt แล้ว');
};

window.showPromptSelector=function(applicantId){
  const prompts=getPrompts();
  document.getElementById('modal-box').innerHTML=`
    <h2>🤖 เลือก Prompt สำหรับวิเคราะห์</h2>
    <p style="color:var(--text2);font-size:.88rem;margin-bottom:16px">เลือก Prompt ที่เหมาะกับตำแหน่ง</p>
    <div id="ps-list">${prompts.map(p=>`
      <button onclick="closeModal();analyzeResume('${applicantId}','${p.id}')" style="display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r2);color:var(--text);font-family:inherit;font-size:.9rem;cursor:pointer;margin-bottom:8px;text-align:left;transition:.2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border2)'">
        <span style="font-weight:600;flex:1">${p.name}</span>
        <span style="color:var(--text3);font-size:.75rem">→</span>
      </button>
    `).join('')}</div>
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
};
