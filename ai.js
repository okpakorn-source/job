// ─── AI Resume Analyzer v8 ──────────
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.setAIKey=function(){
  const key=prompt('กรุณาใส่ OpenAI API Key:\n(บันทึกไว้ในเครื่องนี้)',localStorage.getItem('openai_key')||'');
  if(key){localStorage.setItem('openai_key',key.trim());toast('บันทึก API Key แล้ว ✅')}
};

async function pdfToImages(pdfBlob,maxPages){
  maxPages=maxPages||4;
  const buf=await pdfBlob.arrayBuffer();
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;
  const pages=Math.min(pdf.numPages,maxPages);
  const imgs=[];
  for(let i=1;i<=pages;i++){
    const pg=await pdf.getPage(i);
    const vp=pg.getViewport({scale:2});
    const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;
    await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    imgs.push(c.toDataURL('image/jpeg',0.85));
  }
  return imgs;
}

// ─── Top 15 Thai Universities ───
const TOP15=[
  "จุฬาลงกรณ์","Chulalongkorn","จุฬาฯ","CU ",
  "มหิดล","Mahidol","MU ",
  "เชียงใหม่","Chiang Mai","CMU","มช.",
  "ธรรมศาสตร์","Thammasat","มธ.","TU ",
  "เกษตรศาสตร์","Kasetsart","มก.","KU ",
  "ขอนแก่น","Khon Kaen","มข.","KKU",
  "สงขลานครินทร์","Prince of Songkla","มอ.","PSU",
  "ลาดกระบัง","Ladkrabang","KMITL","สจล.","สจล",
  "พระจอมเกล้าธนบุรี","Thonburi","KMUTT","มจธ.","มจธ","บางมด",
  "พระจอมเกล้าพระนครเหนือ","North Bangkok","KMUTNB","มจพ.","มจพ",
  "ศรีนครินทรวิโรฒ","Srinakharinwirot","มศว","SWU",
  "บูรพา","Burapha","BUU",
  "แม่ฟ้าหลวง","Mae Fah Luang","MFU","มฟล",
  "สุรนารี","Suranaree","SUT","มทส",
  "ศิลปากร","Silpakorn","SU "
];

function checkTop15(uni,uniEn){
  const s=((uni||'')+' '+(uniEn||'')).toLowerCase();
  for(let i=0;i<TOP15.length;i++){if(s.includes(TOP15[i].toLowerCase().trim()))return true;}
  return false;
}

function gpaLevel(g){
  if(g>=3.80)return'เกียรตินิยมอันดับ 1';if(g>=3.50)return'เกียรตินิยมอันดับ 2';
  if(g>=3.20)return'ดีมาก';if(g>=3.00)return'ดี';if(g>0)return'ต่ำกว่าเกณฑ์';return'ไม่ระบุ';
}

// Rating config
const RC={
  star:{label:'⭐ น่าสนใจ',color:'#22c55e',bg:'rgba(34,197,94,.1)',emoji:'⭐',db:'top'},
  normal:{label:'👍 ธรรมดา',color:'#f59e0b',bg:'rgba(245,158,11,.1)',emoji:'👍',db:'average'},
  pass:{label:'❌ ไม่น่าสนใจ',color:'#ef4444',bg:'rgba(239,68,68,.1)',emoji:'❌',db:'weak'}
};

window.analyzeResume=async function(id,promptId){
  let apiKey=localStorage.getItem('openai_key');
  if(!apiKey){setAIKey();apiKey=localStorage.getItem('openai_key');if(!apiKey)return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume','error');return}
  if(!promptId){showPromptSelector(id);return}
  const prompts=getPrompts();
  const sel=prompts.find(p=>p.id===promptId)||prompts[0];
  toast('🤖 กำลังวิเคราะห์... รอ 15-30 วินาที');
  try{
    const {data:blob,error:dlErr}=await sb.storage.from('resumes').download(app.resume_path);
    if(dlErr||!blob)throw new Error('ดาวน์โหลด PDF ไม่ได้');
    const images=await pdfToImages(blob,4);
    if(!images.length)throw new Error('PDF ไม่มีหน้า');
    const jt=app.jobs?app.jobs.title:'ไม่ระบุ';
    let jd='',jr='';
    if(app.job_id){
      const jRes=await sb.from('jobs').select('description,requirements').eq('id',app.job_id).single();
      if(jRes.data){jd=jRes.data.description||'';jr=jRes.data.requirements||''}
    }
    const pt=sel.content.replace(/\{\{JOB_TITLE\}\}/g,jt).replace(/\{\{JOB_DESC\}\}/g,jd).replace(/\{\{JOB_REQ\}\}/g,jr);
    const content=[{type:'text',text:pt}];
    images.forEach(img=>content.push({type:'image_url',image_url:{url:img,detail:'high'}}));
    const aiRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},max_tokens:3000,messages:[
        {role:'system',content:'ตอบเป็น JSON เท่านั้น ทุกตัวเลขต้องเป็น number'},
        {role:'user',content:content}
      ]})
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const r=JSON.parse((await aiRes.json()).choices[0].message.content);

    // ─── Local verification & auto-mark ───
    const isTop15=checkTop15(r.university,r.university_en);
    const gpa=Number(r.gpa)||0;
    const gpaOk=gpa>=3.00;
    // Auto upgrade to star if criteria met
    let rating=r.rating||'normal';
    const marks=[];
    if(isTop15){marks.push('🏫 มหาวิทยาลัย Top 15');if(rating!=='star')rating='star';}
    if(gpaOk){marks.push('📊 GPA '+gpa.toFixed(2)+' ('+gpaLevel(gpa)+')');if(rating!=='star')rating='star';}
    r._rating=rating;r._isTop15=isTop15;r._gpaOk=gpaOk;r._gpaLevel=gpaLevel(gpa);r._marks=marks;

    const rc=RC[rating]||RC.normal;
    console.log('[AI]',{name:r.name,rating,isTop15,gpa,marks});

    await sb.from('applicants').update({
      ai_analyzed:true,ai_analyzed_at:new Date().toISOString(),ai_summary:r,
      ai_score_overall:rating==='star'?90:rating==='normal'?50:20,
      ai_tier:rc.db,ai_recommendation:r.overall_impression||''
    }).eq('id',id);
    Object.assign(app,{ai_analyzed:true,ai_summary:r,ai_score_overall:rating==='star'?90:50,ai_tier:rc.db});
    toast('✅ วิเคราะห์เสร็จ: '+rc.label);
    filterApplicants();viewApplicant(id);
  }catch(err){console.error('[AI]',err);toast('AI Error: '+err.message,'error')}
};

// ─── Render AI Results ──────────
window.renderAIResults=function(a){
  if(!a.ai_analyzed||!a.ai_summary)return '';
  const r=a.ai_summary;
  const rating=r._rating||r.rating||'normal';
  const rc=RC[rating]||RC.normal;
  const gpa=Number(r.gpa)||0;
  const isTop15=r._isTop15||checkTop15(r.university,r.university_en);
  const gpaOk=r._gpaOk||(gpa>=3.00);
  const marks=r._marks||[];
  if(!marks.length){if(isTop15)marks.push('🏫 มหาวิทยาลัย Top 15');if(gpaOk)marks.push('📊 GPA '+gpa.toFixed(2));}

  var h='<div style="margin-bottom:20px;border:2px solid '+rc.color+'44;border-radius:var(--r);overflow:hidden">';

  // HEADER
  h+='<div style="background:linear-gradient(135deg,'+rc.color+'15,'+rc.color+'05);padding:24px;text-align:center">';
  h+='<div style="font-size:2.8rem;margin-bottom:4px">'+rc.emoji+'</div>';
  h+='<div style="display:inline-block;background:'+rc.bg+';color:'+rc.color+';padding:8px 28px;border-radius:100px;font-size:1.3rem;font-weight:800;border:2px solid '+rc.color+'44">'+rc.label+'</div>';

  // Mark badges
  if(marks.length){
    h+='<div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">';
    marks.forEach(function(m){h+='<span style="padding:5px 16px;border-radius:100px;font-size:.82rem;font-weight:600;background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.25)">'+m+'</span>';});
    h+='</div>';
  }
  if(r.rating_reason)h+='<div style="margin-top:12px;font-size:.88rem;color:var(--text2);max-width:500px;margin-left:auto;margin-right:auto;line-height:1.6">'+r.rating_reason+'</div>';
  h+='</div>';

  // BODY
  h+='<div style="padding:16px">';

  // Info grid
  var info=[
    {i:'👤',l:'ชื่อ',v:r.name||'ไม่ระบุ'},{i:'⚧',l:'เพศ',v:r.gender||'ไม่ระบุ'},
    {i:'🎂',l:'อายุ',v:r.age?r.age+' ปี':'ไม่ระบุ'},{i:'💼',l:'ประสบการณ์',v:r.experience_years?r.experience_years+' ปี':'ไม่ระบุ'}
  ];
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">';
  info.forEach(function(x){h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:12px;text-align:center"><div style="font-size:.7rem;color:var(--text3);margin-bottom:3px">'+x.i+' '+x.l+'</div><div style="font-weight:600;font-size:.88rem">'+x.v+'</div></div>';});
  h+='</div>';

  // University card
  h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:12px;border-left:4px solid '+(isTop15?'#22c55e':'var(--border2)')+'">';
  h+='<div style="font-size:.75rem;color:var(--text3);margin-bottom:4px">🏫 มหาวิทยาลัย</div>';
  h+='<div style="font-size:1.1rem;font-weight:700;margin-bottom:4px">'+(r.university||r.university_en||'ไม่ระบุ')+'</div>';
  if(r.university_en&&r.university)h+='<div style="font-size:.82rem;color:var(--text3);margin-bottom:6px">'+r.university_en+'</div>';
  if(isTop15)h+='<span style="display:inline-block;padding:4px 14px;border-radius:100px;font-size:.8rem;font-weight:700;background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25)">🏆 Top 15 มหาวิทยาลัยไทย</span>';
  if(r.degree||r.major)h+='<div style="margin-top:8px;font-size:.85rem;color:var(--text2)">📚 '+(r.degree||'')+' '+(r.major||'')+'</div>';
  h+='</div>';

  // GPA card
  var gc=gpa>=3.50?'#22c55e':gpa>=3.20?'#06b6d4':gpa>=3.00?'#f59e0b':gpa>0?'#ef4444':'#94a3b8';
  h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:12px;border-left:4px solid '+gc+'">';
  h+='<div style="font-size:.75rem;color:var(--text3);margin-bottom:4px">📊 เกรดเฉลี่ย</div>';
  if(gpa>0){
    h+='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">';
    h+='<div style="font-size:2rem;font-weight:900;color:'+gc+'">'+gpa.toFixed(2)+'</div>';
    h+='<span style="padding:3px 14px;border-radius:100px;font-size:.8rem;font-weight:600;background:'+gc+'15;color:'+gc+'">'+(r._gpaLevel||gpaLevel(gpa))+'</span>';
    h+='</div>';
  }else{h+='<div style="color:var(--text3)">ไม่ระบุใน Resume</div>';}
  h+='</div>';

  // Overall impression
  if(r.overall_impression){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px;border-left:4px solid '+rc.color+'">';
    h+='<div style="font-size:.78rem;color:var(--text3);margin-bottom:6px">💡 ภาพรวม</div>';
    h+='<div style="font-size:.92rem;line-height:1.7">'+r.overall_impression+'</div></div>';
  }

  // Highlights
  if(r.potential_highlights&&r.potential_highlights.length){
    h+='<div style="background:rgba(34,197,94,.05);border:1px solid rgba(34,197,94,.15);border-radius:var(--r2);padding:16px;margin-bottom:16px">';
    h+='<div style="font-size:.85rem;font-weight:700;color:#22c55e;margin-bottom:10px">✨ จุดเด่น</div>';
    r.potential_highlights.forEach(function(s){h+='<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px 12px;background:rgba(34,197,94,.06);border-radius:var(--r2)"><span style="color:#22c55e">⭐</span><span style="font-size:.88rem;line-height:1.5">'+s+'</span></div>';});
    h+='</div>';
  }

  // Experience
  if(r.experience_detail){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px">';
    h+='<div style="font-size:.85rem;font-weight:700;margin-bottom:8px">💼 ประสบการณ์</div>';
    h+='<div style="font-size:.88rem;line-height:1.7;color:var(--text2)">'+r.experience_detail+'</div></div>';
  }

  // Skills
  if(r.skills&&r.skills.length){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px">';
    h+='<div style="font-size:.85rem;font-weight:700;margin-bottom:10px">🎯 ทักษะ</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    r.skills.forEach(function(s){h+='<span style="padding:5px 14px;border-radius:100px;font-size:.82rem;background:var(--accent)15;color:var(--accent);border:1px solid var(--accent)33">'+s+'</span>';});
    h+='</div></div>';
  }

  // Fit analysis
  if(r.fit_analysis){
    h+='<div style="background:var(--bg2);border-radius:var(--r2);padding:16px;margin-bottom:16px;border-left:4px solid var(--accent)">';
    h+='<div style="font-size:.85rem;font-weight:700;margin-bottom:8px">🎯 ความเหมาะสม</div>';
    h+='<div style="font-size:.88rem;line-height:1.7;color:var(--text2)">'+r.fit_analysis+'</div></div>';
  }

  // Collapsible: weaknesses
  if(r.weaknesses&&r.weaknesses.length&&r.weaknesses[0]!=='ไม่มี'&&r.weaknesses[0]!=='-'){
    h+='<details style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.88rem;background:var(--bg2)">⚠️ จุดอ่อน ('+r.weaknesses.length+')</summary><div style="padding:14px">';
    r.weaknesses.forEach(function(w){h+='<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px 12px;background:rgba(239,68,68,.04);border-radius:var(--r2);border-left:3px solid var(--red)"><span style="color:var(--red)">⚠️</span><span style="font-size:.85rem">'+w+'</span></div>';});
    h+='</div></details>';
  }

  // Collapsible: interview questions
  if(r.interview_questions&&r.interview_questions.length){
    h+='<details style="margin-bottom:12px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.88rem;background:var(--bg2)">❓ คำถามสัมภาษณ์ ('+r.interview_questions.length+')</summary><div style="padding:14px">';
    r.interview_questions.forEach(function(q,i){h+='<div style="display:flex;gap:10px;margin-bottom:8px;padding:10px 12px;background:var(--bg);border-radius:var(--r2)"><span style="color:var(--accent);font-weight:700">'+(i+1)+'.</span><span style="font-size:.88rem">'+q+'</span></div>';});
    h+='</div></details>';
  }

  h+='</div></div>';
  return h;
};
