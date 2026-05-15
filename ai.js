// ─── AI Resume Analyzer v3 — Vision-based ──────────
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.setAIKey=function(){
  const key=prompt('กรุณาใส่ OpenAI API Key:\n(จะถูกบันทึกไว้ในเครื่องนี้ กรอกครั้งเดียว)',localStorage.getItem('openai_key')||'');
  if(key){localStorage.setItem('openai_key',key.trim());toast('บันทึก API Key เรียบร้อย ✅ (จำไว้ถาวร)')}
};

// Convert PDF pages to base64 images via canvas
async function pdfToImages(pdfBlob,maxPages){
  maxPages=maxPages||4;
  const buf=await pdfBlob.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  const pages=Math.min(pdf.numPages,maxPages);
  const images=[];
  for(let i=1;i<=pages;i++){
    const page=await pdf.getPage(i);
    const vp=page.getViewport({scale:2});
    const canvas=document.createElement('canvas');
    canvas.width=vp.width;canvas.height=vp.height;
    await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
    images.push(canvas.toDataURL('image/jpeg',0.85));
  }
  return images;
}

function buildPrompt(jobTitle,jobDesc,jobReq){
  return `คุณคือผู้เชี่ยวชาญด้าน HR, Talent Acquisition, Business Operator และผู้ประเมินศักยภาพผู้สมัครงานระดับมืออาชีพ

งานของคุณคือ "อ่าน Resume จากภาพ" แล้ววิเคราะห์อย่างละเอียด เพื่อช่วยคัดเลือกผู้สมัครที่ "มีของที่สุด"

ตำแหน่งที่สมัคร: "${jobTitle}"
${jobDesc?'ลักษณะงาน: '+jobDesc:''}
${jobReq?'คุณสมบัติที่ต้องการ: '+jobReq:''}

วิเคราะห์ตาม 10 หัวข้อ ตอบเป็น JSON เท่านั้น:
{"identity":{"type":"สายงาน","strengths":"จุดแข็งหลัก","top_experience":"ประสบการณ์เด่น","org_fit":"เหมาะกับองค์กรแบบไหน","level":"Junior/Mid/Senior/Lead/Manager"},"experience":{"history":"สรุปประวัติงาน","relevance":"ความเกี่ยวข้องกับตำแหน่ง","evidence":"หลักฐานผลงานจริง","authenticity":"ทำจริงหรือคำสวย","progression":"career progression"},"skills":{"hard":{"score":1,"detail":""},"soft":{"score":1,"detail":""},"technical":{"score":1,"detail":""},"leadership":{"score":1,"detail":""},"problem_solving":{"score":1,"detail":""},"communication":{"score":1,"detail":""},"analytical":{"score":1,"detail":""},"creativity":{"score":1,"detail":""}},"potential":{"special":"ความพิเศษ","genius_signal":"สัญญาณคนเก่งจริง","rare_ability":"ความสามารถหายาก","ownership":"ความเป็นเจ้าของงาน","growth_mindset":"growth mindset","growth_speed":"โอกาสโตเร็ว"},"red_flags":["red flags"],"job_fit":{"match_pct":0,"best_match":"จุดที่ตรง","gaps":"จุดที่ขาด","interview_topics":"ต้องสัมภาษณ์เรื่องอะไร","starting_role":"ควรเริ่มจากงานแบบไหน"},"scores":{"experience":0,"proven_results":0,"skill_match":0,"potential":0,"reliability":0,"team_fit":0,"total":0},"tier":"S|A|B|C|Reject","tier_reason":"เหตุผล","interview_questions":["คำถาม1","คำถาม2","คำถาม3","คำถาม4","คำถาม5","คำถาม6","คำถาม7","คำถาม8","คำถาม9","คำถาม10"],"executive_summary":{"should_interview":true,"reason":"เหตุผลหลัก","risk":"ความเสี่ยง","ranking_hint":"ลำดับ"},"verdict":"ผ่าน"}

score ทุกตัวต้องเป็นตัวเลข อย่าชมเกินจริง ถ้าไม่มีหลักฐานให้บอกตรงๆ`;
}

window.analyzeResume=async function(id,promptId){
  let apiKey=localStorage.getItem('openai_key');
  if(!apiKey){setAIKey();apiKey=localStorage.getItem('openai_key');if(!apiKey)return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume','error');return}
  // If no promptId, show selector
  if(!promptId){showPromptSelector(id);return}
  const prompts=getPrompts();
  const selPrompt=prompts.find(p=>p.id===promptId)||prompts[0];
  toast('🤖 กำลังวิเคราะห์ด้วย "'+selPrompt.name+'"... รอ 15-30 วินาที');
  try{
    // 1. Download PDF
    console.log('[AI] Downloading:',app.resume_path);
    const {data:blob,error:dlErr}=await sb.storage.from('resumes').download(app.resume_path);
    if(dlErr||!blob)throw new Error('ดาวน์โหลด PDF ไม่ได้: '+(dlErr?.message||'ไม่พบไฟล์'));
    console.log('[AI] PDF size:',blob.size,'bytes');
    // 2. Convert PDF pages to images
    let images;
    try{
      images=await pdfToImages(blob,4);
      console.log('[AI] Rendered',images.length,'pages');
    }catch(e){
      console.error('[AI] Render error:',e);
      throw new Error('ไม่สามารถแปลง PDF เป็นภาพได้: '+e.message);
    }
    if(!images.length)throw new Error('PDF ไม่มีหน้า');
    // 3. Get job details and build prompt from template
    const jobTitle=app.jobs?app.jobs.title:'ไม่ระบุ';
    let jobDesc='',jobReq='';
    if(app.job_id){
      const jRes=await fetch(SUPABASE_URL+'/rest/v1/jobs?id=eq.'+app.job_id+'&select=description,requirements',{
        headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON}
      });
      if(jRes.ok){const jd=await jRes.json();if(jd[0]){jobDesc=jd[0].description||'';jobReq=jd[0].requirements||''}}
    }
    // 4. Build vision message with selected prompt template
    const promptText=selPrompt.content.replace(/\{\{JOB_TITLE\}\}/g,jobTitle).replace(/\{\{JOB_DESC\}\}/g,jobDesc?'ลักษณะงาน: '+jobDesc:'').replace(/\{\{JOB_REQ\}\}/g,jobReq?'คุณสมบัติ: '+jobReq:'');
    const content=[{type:'text',text:promptText}];
    images.forEach(img=>content.push({type:'image_url',image_url:{url:img,detail:'high'}}));
    // 5. Call OpenAI GPT-4o vision
    const aiRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},max_tokens:4000,messages:[{role:'user',content:content}]})
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const aiData=await aiRes.json();
    const r=JSON.parse(aiData.choices[0].message.content);
    // 6. Save to Supabase
    const total=r.scores?.total||0;
    const tierMap={S:'top',A:'strong',B:'average',C:'weak',Reject:'weak'};
    await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+id,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body:JSON.stringify({ai_analyzed:true,ai_analyzed_at:new Date().toISOString(),ai_summary:r,ai_score_overall:total,ai_tier:tierMap[r.tier]||'average',ai_recommendation:r.executive_summary?.reason||''})
    });
    Object.assign(app,{ai_analyzed:true,ai_summary:r,ai_score_overall:total,ai_tier:tierMap[r.tier]||'average'});
    toast(r.verdict==='ผ่าน'?'✅ ผลวิเคราะห์: ผ่าน ('+total+'/100)':'❌ ผลวิเคราะห์: ไม่ผ่าน ('+total+'/100)');
    filterApplicants();
    viewApplicant(id);
  }catch(err){
    console.error('[AI]',err);
    toast('AI Error: '+err.message,'error');
  }
};

window.renderAIResults=function(a){
  if(!a.ai_analyzed||!a.ai_summary)return '';
  const r=a.ai_summary;
  const tc=r.verdict==='ผ่าน'?'#22c55e':'#ef4444';
  const tierC={S:'#22c55e',A:'#06b6d4',B:'#f59e0b',C:'#ef4444',Reject:'#ef4444'};
  const tierBg=tierC[r.tier]||'#94a3b8';
  const bar=(l,v,mx)=>{const p=Math.round(v/mx*100);return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:.82rem"><span style="width:160px;color:var(--text2)">${l}</span><div style="flex:1;height:6px;background:var(--border2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${p}%;background:${p>=70?'var(--green)':p>=40?'var(--gold)':'var(--red)'};border-radius:3px"></div></div><span style="width:40px;text-align:right;font-weight:700;color:${p>=70?'var(--green)':p>=40?'var(--gold)':'var(--red)'}">${v}/${mx}</span></div>`};
  const sk=r.skills||{};
  const skillBar=(l,obj)=>obj?bar(l,obj.score||0,10):'';
  const sc=r.scores||{};
  const section=(icon,title,html)=>`<details style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:10px 14px;cursor:pointer;font-weight:600;font-size:.88rem;background:var(--bg2)">${icon} ${title}</summary><div style="padding:14px;font-size:.85rem;line-height:1.7;color:var(--text2)">${html}</div></details>`;
  const id=r.identity||{};const exp=r.experience||{};const pot=r.potential||{};const jf=r.job_fit||{};const es=r.executive_summary||{};
  return `<div style="margin-bottom:20px;border:2px solid ${tc}44;border-radius:var(--r);overflow:hidden">
    <div style="background:${tc}15;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div style="font-weight:800;font-size:1.1rem">🤖 AI Resume Analysis</div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="background:${tierBg}22;color:${tierBg};padding:4px 14px;border-radius:100px;font-size:.85rem;font-weight:700">${r.tier} Tier</span>
        <span style="background:${tc}22;color:${tc};padding:4px 14px;border-radius:100px;font-size:.85rem;font-weight:700">${r.verdict} — ${sc.total||0}/100</span>
      </div>
    </div>
    <div style="padding:16px">
      ${section('👤','สรุปตัวตนผู้สมัคร',`<p><b>สายงาน:</b> ${id.type||'-'}</p><p><b>จุดแข็ง:</b> ${id.strengths||'-'}</p><p><b>ประสบการณ์เด่น:</b> ${id.top_experience||'-'}</p><p><b>เหมาะกับองค์กร:</b> ${id.org_fit||'-'}</p><p><b>ระดับ:</b> ${id.level||'-'}</p>`)}
      ${section('💼','ประสบการณ์ทำงาน',`<p>${exp.history||'-'}</p><p><b>ความเกี่ยวข้อง:</b> ${exp.relevance||'-'}</p><p><b>หลักฐาน:</b> ${exp.evidence||'-'}</p><p><b>ความจริงแท้:</b> ${exp.authenticity||'-'}</p><p><b>Career Path:</b> ${exp.progression||'-'}</p>`)}
      ${section('🎯','Skill Assessment',`${skillBar('Hard Skills',sk.hard)}${skillBar('Soft Skills',sk.soft)}${skillBar('Technical',sk.technical)}${skillBar('Leadership',sk.leadership)}${skillBar('Problem Solving',sk.problem_solving)}${skillBar('Communication',sk.communication)}${skillBar('Analytical',sk.analytical)}${skillBar('Creativity',sk.creativity)}`)}
      ${section('⭐','ความ "มีของ"',`<p><b>ความพิเศษ:</b> ${pot.special||'-'}</p><p><b>สัญญาณคนเก่ง:</b> ${pot.genius_signal||'-'}</p><p><b>ความสามารถหายาก:</b> ${pot.rare_ability||'-'}</p><p><b>Ownership:</b> ${pot.ownership||'-'}</p><p><b>Growth Mindset:</b> ${pot.growth_mindset||'-'}</p>`)}
      ${r.red_flags?.length?section('🚩','Red Flags',`<ul style="padding-left:18px">${r.red_flags.map(f=>'<li style="margin-bottom:4px;color:var(--red)">'+f+'</li>').join('')}</ul>`):''}
      ${section('📊','ความเหมาะกับตำแหน่ง',`<p><b>Match:</b> <span style="font-size:1.2rem;font-weight:800;color:${(jf.match_pct||0)>=70?'var(--green)':'var(--gold)'}">${jf.match_pct||0}%</span></p><p><b>จุดที่ตรง:</b> ${jf.best_match||'-'}</p><p><b>จุดที่ขาด:</b> ${jf.gaps||'-'}</p><p><b>ต้องสัมภาษณ์เพิ่ม:</b> ${jf.interview_topics||'-'}</p><p><b>ควรเริ่มจาก:</b> ${jf.starting_role||'-'}</p>`)}
      ${section('📈','คะแนนรวม',`${bar('ประสบการณ์ตรงสาย',sc.experience||0,20)}${bar('ผลงานที่พิสูจน์ได้',sc.proven_results||0,20)}${bar('Skill ตรงตำแหน่ง',sc.skill_match||0,20)}${bar('ศักยภาพเติบโต',sc.potential||0,20)}${bar('ความน่าเชื่อถือ',sc.reliability||0,10)}${bar('เหมาะกับทีม',sc.team_fit||0,10)}<div style="text-align:right;font-size:1.1rem;font-weight:800;margin-top:8px;color:${(sc.total||0)>=70?'var(--green)':'var(--gold)'}">รวม: ${sc.total||0}/100</div>`)}
      ${r.interview_questions?.length?section('❓','คำถามสัมภาษณ์ 10 ข้อ',`<ol style="padding-left:18px">${r.interview_questions.map(q=>'<li style="margin-bottom:6px">'+q+'</li>').join('')}</ol>`):''}
      ${section('📋','สรุปสำหรับผู้บริหาร',`<p><b>ควรสัมภาษณ์:</b> <span style="font-weight:700;color:${es.should_interview?'var(--green)':'var(--red)'}">${es.should_interview?'✅ ใช่':'❌ ไม่'}</span></p><p><b>เหตุผล:</b> ${es.reason||'-'}</p><p><b>ความเสี่ยง:</b> ${es.risk||'-'}</p><p><b>ลำดับ:</b> ${es.ranking_hint||'-'}</p>`)}
    </div>
  </div>`;
};
