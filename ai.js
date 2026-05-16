// ─── AI Resume Analyzer v7 — วิเคราะห์ศักยภาพ ──────────
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.setAIKey=function(){
  const key=prompt('กรุณาใส่ OpenAI API Key:\n(จะถูกบันทึกไว้ในเครื่องนี้ กรอกครั้งเดียว)',localStorage.getItem('openai_key')||'');
  if(key){localStorage.setItem('openai_key',key.trim());toast('บันทึก API Key เรียบร้อย ✅')}
};

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

// Rating config
const RATING_CONFIG={
  star:{label:'⭐ น่าสนใจ',color:'#22c55e',bg:'rgba(34,197,94,.1)',emoji:'⭐',dbTier:'top'},
  normal:{label:'👍 ธรรมดา',color:'#f59e0b',bg:'rgba(245,158,11,.1)',emoji:'👍',dbTier:'average'},
  pass:{label:'❌ ไม่น่าสนใจ',color:'#ef4444',bg:'rgba(239,68,68,.1)',emoji:'❌',dbTier:'weak'}
};

window.analyzeResume=async function(id,promptId){
  let apiKey=localStorage.getItem('openai_key');
  if(!apiKey){setAIKey();apiKey=localStorage.getItem('openai_key');if(!apiKey)return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume','error');return}
  if(!promptId){showPromptSelector(id);return}
  const prompts=getPrompts();
  const selPrompt=prompts.find(p=>p.id===promptId)||prompts[0];
  toast('🤖 กำลังวิเคราะห์ด้วย "'+selPrompt.name+'"... รอ 15-30 วินาที');
  console.log('[AI] Using prompt:',selPrompt.name);
  try{
    const {data:blob,error:dlErr}=await sb.storage.from('resumes').download(app.resume_path);
    if(dlErr||!blob)throw new Error('ดาวน์โหลด PDF ไม่ได้');
    let images;
    try{images=await pdfToImages(blob,4);}catch(e){throw new Error('แปลง PDF ไม่ได้: '+e.message);}
    if(!images.length)throw new Error('PDF ไม่มีหน้า');
    const jobTitle=app.jobs?app.jobs.title:'ไม่ระบุ';
    let jobDesc='',jobReq='';
    if(app.job_id){
      const jRes=await fetch(SUPABASE_URL+'/rest/v1/jobs?id=eq.'+app.job_id+'&select=description,requirements',{
        headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON}
      });
      if(jRes.ok){const jd=await jRes.json();if(jd[0]){jobDesc=jd[0].description||'';jobReq=jd[0].requirements||''}}
    }
    const promptText=selPrompt.content.replace(/\{\{JOB_TITLE\}\}/g,jobTitle).replace(/\{\{JOB_DESC\}\}/g,jobDesc).replace(/\{\{JOB_REQ\}\}/g,jobReq);
    const content=[{type:'text',text:promptText}];
    images.forEach(img=>content.push({type:'image_url',image_url:{url:img,detail:'high'}}));
    const aiRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},max_tokens:3000,messages:[
        {role:'system',content:'ตอบเป็น JSON เท่านั้น ทุกตัวเลขต้องเป็น number วิเคราะห์ตรงไปตรงมา'},
        {role:'user',content:content}
      ]})
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const aiData=await aiRes.json();
    const raw=aiData.choices[0].message.content;
    console.log('[AI] Raw:',raw);
    const r=JSON.parse(raw);

    // Normalize rating
    const rating=r.rating||'normal';
    const rc=RATING_CONFIG[rating]||RATING_CONFIG.normal;
    r._rating=rating;
    r._ratingLabel=rc.label;
    r._ratingColor=rc.color;

    console.log('[AI] Result:',{name:r.name,rating:rating,reason:r.rating_reason});

    // Save to DB
    await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+id,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body:JSON.stringify({
        ai_analyzed:true,
        ai_analyzed_at:new Date().toISOString(),
        ai_summary:r,
        ai_score_overall:rating==='star'?90:rating==='normal'?50:20,
        ai_tier:rc.dbTier,
        ai_recommendation:r.overall_impression||r.rating_reason||''
      })
    });
    Object.assign(app,{ai_analyzed:true,ai_summary:r,ai_score_overall:rating==='star'?90:rating==='normal'?50:20,ai_tier:rc.dbTier});
    toast('✅ วิเคราะห์เสร็จ: '+rc.label);
    filterApplicants();viewApplicant(id);
  }catch(err){
    console.error('[AI]',err);
    toast('AI Error: '+err.message,'error');
  }
};

// ─── Render AI Results ──────────
window.renderAIResults=function(a){
  if(!a.ai_analyzed||!a.ai_summary)return '';
  const r=a.ai_summary;
  const rating=r._rating||r.rating||'normal';
  const rc=RATING_CONFIG[rating]||RATING_CONFIG.normal;
  var h='<div style="margin-bottom:20px;border:2px solid '+rc.color+'44;border-radius:var(--r);overflow:hidden">';

  // ===== HEADER — Rating Badge =====
  h+='<div style="background:linear-gradient(135deg,'+rc.color+'15,'+rc.color+'05);padding:24px;text-align:center">';
  h+='<div style="font-size:2.8rem;margin-bottom:4px">'+rc.emoji+'</div>';
  h+='<div style="display:inline-block;background:'+rc.bg+';color:'+rc.color+';padding:8px 28px;border-radius:100px;font-size:1.3rem;font-weight:800;border:2px solid '+rc.color+'44">'+(r._ratingLabel||rc.label)+'</div>';
  if(r.rating_reason)h+='<div style="margin-top:12px;font-size:.9rem;color:var(--text2);max-width:500px;margin-left:auto;margin-right:auto;line-height:1.6">'+r.rating_reason+'</div>';
  h+='</div>';

  // ===== BODY =====
  h+='<div style="padding:16px">';

  // ข้อมูลส่วนตัว — Grid
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
  var infoItems=[
    {icon:'👤',label:'ชื่อ',val:r.name||'ไม่ระบุ'},
    {icon:'🎓',label:'การศึกษา',val:(r.university||'ไม่ระบุ')+(r.gpa>0?' (GPA '+Number(r.gpa).toFixed(2)+')':'')},
    {icon:'⚧',label:'เพศ',val:r.gender||'ไม่ระบุ'},
    {icon:'🎂',label:'อายุ',val:r.age?r.age+' ปี':'ไม่ระบุ'},
    {icon:'📚',label:'วุฒิ/สาขา',val:(r.degree||'')+' '+(r.major||'ไม่ระบุ')},
    {icon:'💼',label:'ประสบการณ์',val:r.experience_years?r.experience_years+' ปี':'ไม่ระบุ'}
  ];
  infoItems.forEach(function(item){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:12px;text-align:center">';
    h+='<div style="font-size:.7rem;color:var(--text3);margin-bottom:3px">'+item.icon+' '+item.label+'</div>';
    h+='<div style="font-weight:600;font-size:.88rem">'+item.val+'</div></div>';
  });
  h+='</div>';

  // ===== ความประทับใจภาพรวม =====
  if(r.overall_impression){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px;border-left:4px solid '+rc.color+'">';
    h+='<div style="font-size:.78rem;color:var(--text3);margin-bottom:6px">💡 ภาพรวม</div>';
    h+='<div style="font-size:.92rem;line-height:1.7;color:var(--text)">'+r.overall_impression+'</div>';
    h+='</div>';
  }

  // ===== จุดเด่น (Highlights) =====
  if(r.potential_highlights&&r.potential_highlights.length){
    h+='<div style="background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.15);border-radius:var(--r2);padding:16px;margin-bottom:16px">';
    h+='<div style="font-size:.85rem;font-weight:700;color:#22c55e;margin-bottom:10px">✨ จุดเด่นที่โดดเด่น</div>';
    r.potential_highlights.forEach(function(item){
      h+='<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px 12px;background:rgba(34,197,94,.06);border-radius:var(--r2)">';
      h+='<span style="color:#22c55e;flex-shrink:0">⭐</span><span style="font-size:.88rem;line-height:1.5">'+item+'</span></div>';
    });
    h+='</div>';
  }

  // ===== ประสบการณ์ =====
  if(r.experience_detail){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px">';
    h+='<div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:8px">💼 ประสบการณ์การทำงาน</div>';
    h+='<div style="font-size:.88rem;line-height:1.7;color:var(--text2)">'+r.experience_detail+'</div>';
    h+='</div>';
  }

  // ===== ทักษะ =====
  if(r.skills&&r.skills.length){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px">';
    h+='<div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:10px">🎯 ทักษะ</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    r.skills.forEach(function(s){
      h+='<span style="padding:5px 14px;border-radius:100px;font-size:.82rem;font-weight:500;background:var(--accent)15;color:var(--accent);border:1px solid var(--accent)33">'+s+'</span>';
    });
    h+='</div></div>';
  }

  // ===== ความเหมาะสมกับตำแหน่ง =====
  if(r.fit_analysis){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px;border-left:4px solid var(--accent)">';
    h+='<div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:8px">🎯 ความเหมาะสมกับตำแหน่ง</div>';
    h+='<div style="font-size:.88rem;line-height:1.7;color:var(--text2)">'+r.fit_analysis+'</div>';
    h+='</div>';
  }

  // ===== จุดอ่อน =====
  if(r.weaknesses&&r.weaknesses.length&&r.weaknesses[0]!=='ไม่มี'&&r.weaknesses[0]!=='-'){
    h+='<details style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden">';
    h+='<summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.88rem;background:var(--bg2)">⚠️ จุดอ่อน / สิ่งที่ต้องระวัง ('+r.weaknesses.length+')</summary>';
    h+='<div style="padding:14px">';
    r.weaknesses.forEach(function(w){
      h+='<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px 12px;background:rgba(239,68,68,.04);border-radius:var(--r2);border-left:3px solid var(--red)">';
      h+='<span style="color:var(--red);flex-shrink:0">⚠️</span><span style="font-size:.85rem;line-height:1.5">'+w+'</span></div>';
    });
    h+='</div></details>';
  }

  // ===== คำถามสัมภาษณ์ =====
  if(r.interview_questions&&r.interview_questions.length){
    h+='<details style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden">';
    h+='<summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.88rem;background:var(--bg2)">❓ คำถามสัมภาษณ์แนะนำ ('+r.interview_questions.length+')</summary>';
    h+='<div style="padding:14px">';
    r.interview_questions.forEach(function(q,i){
      h+='<div style="display:flex;gap:10px;margin-bottom:8px;padding:10px 12px;background:var(--bg);border-radius:var(--r2)">';
      h+='<span style="color:var(--accent);font-weight:700;flex-shrink:0">'+(i+1)+'.</span><span style="font-size:.88rem;line-height:1.5">'+q+'</span></div>';
    });
    h+='</div></details>';
  }

  h+='</div></div>';
  return h;
};
