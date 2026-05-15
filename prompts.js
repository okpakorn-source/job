// ─── Prompt Manager ──────────────────────────────
const DEFAULT_PROMPT=`คุณคือผู้เชี่ยวชาญด้าน HR, Talent Acquisition, Business Operator และผู้ประเมินศักยภาพผู้สมัครงานระดับมืออาชีพ

งานของคุณคือ "อ่าน Resume จากภาพ" แล้ววิเคราะห์อย่างละเอียด เพื่อช่วยคัดเลือกผู้สมัครที่ "มีของที่สุด"

ตำแหน่งที่สมัคร: "{{JOB_TITLE}}"
{{JOB_DESC}}
{{JOB_REQ}}

วิเคราะห์ตาม 10 หัวข้อ ตอบเป็น JSON เท่านั้น:
{"identity":{"type":"สายงาน","strengths":"จุดแข็งหลัก","top_experience":"ประสบการณ์เด่น","org_fit":"เหมาะกับองค์กรแบบไหน","level":"Junior/Mid/Senior/Lead/Manager"},"experience":{"history":"สรุปประวัติงาน","relevance":"ความเกี่ยวข้องกับตำแหน่ง","evidence":"หลักฐานผลงานจริง","authenticity":"ทำจริงหรือคำสวย","progression":"career progression"},"skills":{"hard":{"score":1,"detail":""},"soft":{"score":1,"detail":""},"technical":{"score":1,"detail":""},"leadership":{"score":1,"detail":""},"problem_solving":{"score":1,"detail":""},"communication":{"score":1,"detail":""},"analytical":{"score":1,"detail":""},"creativity":{"score":1,"detail":""}},"potential":{"special":"ความพิเศษ","genius_signal":"สัญญาณคนเก่งจริง","rare_ability":"ความสามารถหายาก","ownership":"ความเป็นเจ้าของงาน","growth_mindset":"growth mindset","growth_speed":"โอกาสโตเร็ว"},"red_flags":["red flags"],"job_fit":{"match_pct":0,"best_match":"จุดที่ตรง","gaps":"จุดที่ขาด","interview_topics":"ต้องสัมภาษณ์เรื่องอะไร","starting_role":"ควรเริ่มจากงานแบบไหน"},"scores":{"experience":0,"proven_results":0,"skill_match":0,"potential":0,"reliability":0,"team_fit":0,"total":0},"tier":"S|A|B|C|Reject","tier_reason":"เหตุผล","interview_questions":["คำถาม1","คำถาม2","คำถาม3","คำถาม4","คำถาม5","คำถาม6","คำถาม7","คำถาม8","คำถาม9","คำถาม10"],"executive_summary":{"should_interview":true,"reason":"เหตุผลหลัก","risk":"ความเสี่ยง","ranking_hint":"ลำดับ"},"verdict":"ผ่าน"}

score ทุกตัวต้องเป็นตัวเลข อย่าชมเกินจริง ถ้าไม่มีหลักฐานให้บอกตรงๆ`;

function getPrompts(){
  const saved=localStorage.getItem('ai_prompts');
  if(saved)return JSON.parse(saved);
  const defaults=[
    {id:'default',name:'🌐 ทุกตำแหน่ง (Default)',content:DEFAULT_PROMPT},
    {id:'dev',name:'💻 Developer / Engineer',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์ Technical Skills, GitHub/Portfolio, ภาษาที่ใช้, Framework, System Design, Code Quality เป็นพิเศษ'},
    {id:'pm',name:'📋 Product Manager',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์ Product Thinking, Data-driven Decision, Stakeholder Management, PRD Writing, Agile/Scrum เป็นพิเศษ'},
    {id:'design',name:'🎨 UX/UI Designer',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์ Design Thinking, UX Process, Portfolio Quality, Figma/Prototyping, User Research เป็นพิเศษ'},
    {id:'sales',name:'💰 Sales / BD',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์ ยอดขาย, การปิดดีล, Negotiation, Client Relationship, Revenue Growth เป็นพิเศษ'},
    {id:'marketing',name:'📣 Marketing',content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์ Campaign Results, ROI, Digital Marketing, Content Strategy, Brand Building เป็นพิเศษ'}
  ];
  localStorage.setItem('ai_prompts',JSON.stringify(defaults));
  return defaults;
}
function savePrompts(p){localStorage.setItem('ai_prompts',JSON.stringify(p))}

window.renderPromptManager=function(){
  _adminView='prompts';
  const adminEl=document.getElementById('page-admin');
  const prompts=getPrompts();
  adminEl.innerHTML=`<div class="admin-layout">${adminSidebar('prompts')}<div class="admin-content">
    <div class="admin-header"><h2>📝 จัดการ Prompt</h2><button class="btn btn-primary btn-sm" onclick="addNewPrompt()">+ เพิ่ม Prompt ใหม่</button></div>
    <p style="color:var(--text2);font-size:.88rem;margin-bottom:20px">สร้าง Prompt สำหรับแต่ละสายงาน เพื่อให้ AI วิเคราะห์ Resume ตรงตามที่ต้องการ<br>ใช้ <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_TITLE}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_DESC}}</code> <code style="background:var(--bg2);padding:2px 6px;border-radius:4px">{{JOB_REQ}}</code> เป็นตัวแปรอัตโนมัติ</p>
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
  prompts.push({id,name,content:DEFAULT_PROMPT+'\n\nเน้นวิเคราะห์สำหรับตำแหน่ง '+name+' เป็นพิเศษ'});
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

// Prompt selector before AI analysis
window.showPromptSelector=function(applicantId){
  const prompts=getPrompts();
  document.getElementById('modal-box').innerHTML=`
    <h2>🤖 เลือก Prompt สำหรับวิเคราะห์</h2>
    <p style="color:var(--text2);font-size:.88rem;margin-bottom:16px">เลือก Prompt ที่เหมาะกับตำแหน่งที่ผู้สมัครสมัคร</p>
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
