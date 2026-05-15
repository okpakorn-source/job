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
      body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},max_tokens:4000,messages:[{role:'system',content:'คุณเป็นผู้เชี่ยวชาญด้าน HR วิเคราะห์ Resume ตอบเป็น JSON เท่านั้น'},{role:'user',content:content}]})
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
  const tierEmoji={S:'🏆',A:'⭐',B:'👍',C:'⚠️',Reject:'❌'};
  const sc=r.scores||{};const es=r.executive_summary||{};const id=r.identity||{};
  const exp=r.experience||{};const pot=r.potential||{};const jf=r.job_fit||{};const sk=r.skills||{};
  const bar=(l,v,mx)=>{const p=Math.round(v/mx*100);return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.82rem"><span style="width:140px;color:var(--text2);flex-shrink:0">'+l+'</span><div style="flex:1;height:8px;background:var(--border2);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+p+'%;background:'+(p>=70?'var(--green)':p>=40?'var(--gold)':'var(--red)')+';border-radius:4px"></div></div><span style="width:44px;text-align:right;font-weight:700;color:'+(p>=70?'var(--green)':p>=40?'var(--gold)':'var(--red)')+'">'+v+'/'+mx+'</span></div>'};
  const skillBar=(l,obj)=>obj?bar(l,obj.score||0,10):'';
  const sec=(icon,title,html,open)=>'<details'+(open?' open':'')+' style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.88rem;background:var(--bg2)">'+icon+' '+title+'</summary><div style="padding:14px;font-size:.85rem;line-height:1.8;color:var(--text2)">'+html+'</div></details>';
  const row=(label,val,color)=>val&&val!=='-'?'<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:var(--text3);min-width:110px;flex-shrink:0">'+label+'</span><span style="color:'+(color||'var(--text)')+';font-weight:500">'+val+'</span></div>':'';
  const matchClr=(jf.match_pct||0)>=70?'var(--green)':(jf.match_pct||0)>=40?'var(--gold)':'var(--red)';
  const totalClr=(sc.total||0)>=70?'var(--green)':(sc.total||0)>=40?'var(--gold)':'var(--red)';

  return '<div style="margin-bottom:20px;border:2px solid '+tc+'44;border-radius:var(--r);overflow:hidden">'
    +'<div style="background:linear-gradient(135deg,'+tierBg+'18,'+tc+'12);padding:20px;text-align:center">'
    +'<div style="font-size:2.5rem;margin-bottom:4px">'+(tierEmoji[r.tier]||'🤖')+'</div>'
    +'<div style="display:inline-block;background:'+tierBg+'22;color:'+tierBg+';padding:6px 24px;border-radius:100px;font-size:1.2rem;font-weight:800;margin-bottom:8px;border:2px solid '+tierBg+'44">'+r.tier+' Tier</div>'
    +'<div style="font-size:2rem;font-weight:900;color:'+tc+';margin:8px 0">'+(sc.total||0)+'<span style="font-size:1rem;color:var(--text3)">/100</span></div>'
    +'<div style="font-size:.9rem;font-weight:600;color:'+tc+'">'+(r.verdict==='ผ่าน'?'✅ ผ่านการคัดกรอง':'❌ ไม่ผ่านการคัดกรอง')+'</div>'
    +(r.tier_reason?'<div style="margin-top:8px;font-size:.82rem;color:var(--text2);max-width:500px;margin-left:auto;margin-right:auto">💡 '+r.tier_reason+'</div>':'')
    +'</div><div style="padding:16px">'

    +sec('📋','สรุปสำหรับผู้บริหาร — ควรเรียกสัมภาษณ์?',
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:12px;background:'+(es.should_interview?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)')+';border-radius:var(--r2);border:1px solid '+(es.should_interview?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)')+'">'
      +'<span style="font-size:2rem">'+(es.should_interview?'✅':'❌')+'</span>'
      +'<div><div style="font-weight:700;font-size:1rem;color:'+(es.should_interview?'var(--green)':'var(--red)')+'">'+(es.should_interview?'ควรเรียกสัมภาษณ์':'ไม่แนะนำให้สัมภาษณ์')+'</div>'
      +'<div style="font-size:.82rem;color:var(--text2);margin-top:2px">'+(es.reason||'')+'</div></div></div>'
      +row('🎯 ลำดับ',es.ranking_hint,'var(--accent)')
      +row('⚠️ ความเสี่ยง',es.risk,'var(--gold)')
    ,true)

    +sec('🎯','ความเหมาะกับตำแหน่ง — Match '+(jf.match_pct||0)+'%',
      '<div style="text-align:center;margin-bottom:16px"><div style="display:inline-flex;width:90px;height:90px;border-radius:50%;border:5px solid '+matchClr+';align-items:center;justify-content:center"><span style="font-size:1.6rem;font-weight:900;color:'+matchClr+'">'+(jf.match_pct||0)+'%</span></div></div>'
      +row('✅ จุดที่ตรง',jf.best_match,'var(--green)')
      +row('❌ จุดที่ขาด',jf.gaps,'var(--red)')
      +row('🔍 สัมภาษณ์เพิ่ม',jf.interview_topics)
      +row('🚀 ควรเริ่มจาก',jf.starting_role,'var(--accent)')
    ,true)

    +sec('📊','คะแนนรวม 6 ด้าน — '+(sc.total||0)+'/100',
      bar('🏢 ประสบการณ์ตรงสาย',sc.experience||0,20)
      +bar('🏆 ผลงานพิสูจน์ได้',sc.proven_results||0,20)
      +bar('🎯 Skill ตรงตำแหน่ง',sc.skill_match||0,20)
      +bar('🚀 ศักยภาพเติบโต',sc.potential||0,20)
      +bar('🤝 ความน่าเชื่อถือ',sc.reliability||0,10)
      +bar('👥 เหมาะกับทีม',sc.team_fit||0,10)
      +'<div style="text-align:right;font-size:1.2rem;font-weight:900;margin-top:12px;padding-top:12px;border-top:1px solid var(--border2);color:'+totalClr+'">รวม: '+(sc.total||0)+'/100</div>'
    ,true)

    +sec('👤','สรุปตัวตนผู้สมัคร — '+(id.level||''),
      row('💼 สายงาน',id.type)+row('💪 จุดแข็ง',id.strengths,'var(--green)')
      +row('🌟 ประสบการณ์เด่น',id.top_experience,'var(--accent)')
      +row('🏢 เหมาะกับองค์กร',id.org_fit)+row('📊 ระดับ',id.level,'var(--gold)')
    )

    +sec('⭐','ความ "มีของ" — สัญญาณคนเก่งจริง',
      row('✨ ความพิเศษ',pot.special,'var(--gold)')
      +row('🧠 สัญญาณคนเก่ง',pot.genius_signal,'var(--accent)')
      +row('💎 ความสามารถหายาก',pot.rare_ability,'var(--green)')
      +row('🔥 เจ้าของงาน',pot.ownership)
      +row('📈 Growth Mindset',pot.growth_mindset)
      +row('⚡ โอกาสโตเร็ว',pot.growth_speed,'var(--accent)')
    )

    +sec('💼','ประสบการณ์ทำงาน',
      '<div style="margin-bottom:12px;padding:10px;background:var(--bg2);border-radius:var(--r2)">'+(exp.history||'-')+'</div>'
      +row('🔗 ความเกี่ยวข้อง',exp.relevance)
      +row('📄 หลักฐานผลงาน',exp.evidence)
      +row('🔍 ทำจริงหรือคำสวย',exp.authenticity)
      +row('📈 Career Path',exp.progression)
    )

    +sec('🎯','Skill Assessment — 8 ด้าน',
      skillBar('💻 Hard Skills',sk.hard)+skillBar('🤝 Soft Skills',sk.soft)
      +skillBar('⚙️ Technical',sk.technical)+skillBar('👑 Leadership',sk.leadership)
      +skillBar('🧩 Problem Solving',sk.problem_solving)+skillBar('💬 Communication',sk.communication)
      +skillBar('📊 Analytical',sk.analytical)+skillBar('🎨 Creativity',sk.creativity)
      +(sk.hard?.detail?'<div style="margin-top:12px;font-size:.8rem;color:var(--text3);border-top:1px solid var(--border2);padding-top:10px">'
        +(sk.hard?.detail?'<b>Hard:</b> '+sk.hard.detail+'<br>':'')
        +(sk.soft?.detail?'<b>Soft:</b> '+sk.soft.detail+'<br>':'')
        +(sk.technical?.detail?'<b>Tech:</b> '+sk.technical.detail+'':'')
      +'</div>':'')
    )

    +(r.red_flags?.length?sec('🚩','Red Flags — จุดที่ต้องระวัง ('+r.red_flags.length+')',
      r.red_flags.map(f=>'<div style="display:flex;gap:8px;margin-bottom:8px;padding:8px 12px;background:rgba(239,68,68,.06);border-radius:var(--r2);border-left:3px solid var(--red)"><span style="color:var(--red)">⚠️</span><span>'+f+'</span></div>').join('')
    ):'')

    +(r.interview_questions?.length?sec('❓','คำถามสัมภาษณ์ที่แนะนำ — '+r.interview_questions.length+' ข้อ',
      r.interview_questions.map((q,i)=>'<div style="display:flex;gap:10px;margin-bottom:10px;padding:10px 12px;background:var(--bg2);border-radius:var(--r2)"><span style="color:var(--accent);font-weight:700;flex-shrink:0">'+(i+1)+'.</span><span>'+q+'</span></div>').join('')
    ):'')

    +'</div></div>';
};
