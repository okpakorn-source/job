// ─── AI Resume Analyzer v5 ──────────
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

const TOP15_UNI = [
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

function buildPrompt(jobTitle,jobDesc,jobReq){
  return 'คุณคือ HR มืออาชีพ อ่าน Resume จากภาพ วิเคราะห์ 4 หัวข้อหลัก ตอบเป็น JSON เท่านั้น\n\nตำแหน่งที่สมัคร: "'+jobTitle+'"\n'+(jobDesc?'ลักษณะงาน: '+jobDesc+'\n':'')+(jobReq?'คุณสมบัติ: '+jobReq+'\n':'')+'\nตอบ JSON นี้:\n{\n  "name": "ชื่อ-นามสกุล",\n  "gender": "ชาย/หญิง/ไม่ระบุ",\n  "age": 0,\n  "university": "ชื่อมหาวิทยาลัยที่จบ",\n  "degree": "ป.ตรี/ป.โท/ป.เอก",\n  "major": "สาขาวิชา",\n  "gpa": 0.00,\n  "experience_years": 0,\n  "experience_summary": "สรุปประสบการณ์ 2 ประโยค",\n  "skills": "ทักษะหลักๆ",\n  "strengths": ["จุดแข็ง"],\n  "red_flags": ["จุดที่ต้องระวัง"],\n  "summary": "สรุป 1 ประโยคว่าคนนี้เหมาะกับตำแหน่งนี้ไหม",\n  "interview_questions": ["คำถาม 5 ข้อ"]\n}\n\nกฎ: score ตัวเลขเท่านั้น, gpa เป็นทศนิยม 2 ตำแหน่ง, age เป็นตัวเลข, ถ้าไม่มีข้อมูลใส่ 0';
}

window.analyzeResume=async function(id,promptId){
  let apiKey=localStorage.getItem('openai_key');
  if(!apiKey){setAIKey();apiKey=localStorage.getItem('openai_key');if(!apiKey)return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume','error');return}
  if(!promptId){showPromptSelector(id);return}
  const prompts=getPrompts();
  const selPrompt=prompts.find(p=>p.id===promptId)||prompts[0];
  toast('🤖 กำลังวิเคราะห์... รอ 15-30 วินาที');
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
        {role:'system',content:'ตอบเป็น JSON เท่านั้น ทุกตัวเลขต้องเป็น number'},
        {role:'user',content:content}
      ]})
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const aiData=await aiRes.json();
    const raw=aiData.choices[0].message.content;
    console.log('[AI] Raw:',raw);
    const r=JSON.parse(raw);
    // Calculate scores locally — check both thai and english uni names
    let uniScore=0;
    const uniCheck=((r.university||'')+' '+(r.university_en||'')).toLowerCase();
    for(let i=0;i<TOP15_UNI.length;i++){
      if(uniCheck.includes(TOP15_UNI[i].toLowerCase().trim())){
        uniScore=15;break;
      }
    }
    console.log('[AI] Uni:',r.university,r.university_en,'| Score:',uniScore,'| GPA:',r.gpa);
    const gpa=Number(r.gpa)||0;
    let gpaScore=0;
    if(gpa>=3.80)gpaScore=10;
    else if(gpa>=3.50)gpaScore=8;
    else if(gpa>=3.20)gpaScore=6;
    else if(gpa>=3.00)gpaScore=4;
    else if(gpa>0)gpaScore=2;
    const total=uniScore+gpaScore;
    let tier='C';
    if(total>=20)tier='S';
    else if(total>=15)tier='A';
    else if(total>=10)tier='B';
    else if(total>=4)tier='C';
    else tier='Reject';
    r._uniScore=uniScore;r._gpaScore=gpaScore;r._total=total;r._tier=tier;
    r._isTop15=uniScore>=15;
    r._gpaLevel=gpa>=3.80?'เกียรตินิยมอันดับ 1':gpa>=3.50?'เกียรตินิยมอันดับ 2':gpa>=3.20?'ดีมาก':gpa>=3.00?'ดี':gpa>0?'ต่ำกว่าเกณฑ์':'ไม่ระบุ';
    const tierMap={S:'top',A:'strong',B:'average',C:'weak',Reject:'weak'};
    await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+id,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body:JSON.stringify({ai_analyzed:true,ai_analyzed_at:new Date().toISOString(),ai_summary:r,ai_score_overall:total,ai_tier:tierMap[tier]||'average',ai_recommendation:r.summary||''})
    });
    Object.assign(app,{ai_analyzed:true,ai_summary:r,ai_score_overall:total,ai_tier:tierMap[tier]||'average'});
    toast('✅ วิเคราะห์เสร็จ: '+tier+' Tier ('+total+'/25)');
    filterApplicants();viewApplicant(id);
  }catch(err){
    console.error('[AI]',err);
    toast('AI Error: '+err.message,'error');
  }
};

window.renderAIResults=function(a){
  if(!a.ai_analyzed||!a.ai_summary)return '';
  const r=a.ai_summary;
  const tier=r._tier||'C';
  const total=r._total||0;
  const tierC={S:'#22c55e',A:'#06b6d4',B:'#f59e0b',C:'#ef4444',Reject:'#ef4444'};
  const tierBg=tierC[tier]||'#94a3b8';
  const tierEmoji={S:'🏆',A:'⭐',B:'👍',C:'⚠️',Reject:'❌'};
  const gpa=Number(r.gpa)||0;
  const gpaClr=gpa>=3.50?'#22c55e':gpa>=3.20?'#06b6d4':gpa>=3.00?'#f59e0b':'#ef4444';

  var h='<div style="margin-bottom:20px;border:2px solid '+tierBg+'44;border-radius:var(--r);overflow:hidden">';

  // Header
  h+='<div style="background:linear-gradient(135deg,'+tierBg+'18,'+tierBg+'08);padding:24px;text-align:center">';
  h+='<div style="font-size:2.5rem">'+(tierEmoji[tier]||'🤖')+'</div>';
  h+='<div style="display:inline-block;background:'+tierBg+'22;color:'+tierBg+';padding:6px 28px;border-radius:100px;font-size:1.3rem;font-weight:800;border:2px solid '+tierBg+'44;margin:8px 0">'+tier+' Tier</div>';
  h+='<div style="font-size:2rem;font-weight:900;color:'+tierBg+';margin:4px 0">'+total+'<span style="font-size:.9rem;color:var(--text3)">/25</span></div>';
  if(r.summary)h+='<div style="margin-top:8px;font-size:.85rem;color:var(--text2);max-width:500px;margin:8px auto 0">'+r.summary+'</div>';
  h+='</div><div style="padding:16px">';

  // 1. มหาวิทยาลัย
  var uniHtml='<div style="padding:16px;background:var(--bg2);border-radius:var(--r2);margin-bottom:12px">';
  uniHtml+='<div style="font-size:1.1rem;font-weight:700;margin-bottom:8px">🏫 '+(r.university||'ไม่ระบุ')+'</div>';
  if(r._isTop15){
    uniHtml+='<div style="display:inline-block;padding:4px 16px;border-radius:100px;font-size:.85rem;font-weight:700;background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.3)">🏆 Top 15 มหาวิทยาลัยไทย (+15 คะแนน)</div>';
  }else{
    uniHtml+='<div style="display:inline-block;padding:4px 16px;border-radius:100px;font-size:.85rem;font-weight:600;background:rgba(148,163,184,.1);color:var(--text3)">มหาวิทยาลัยอื่น (+0 คะแนน)</div>';
  }
  if(r.degree||r.major)uniHtml+='<div style="margin-top:8px;font-size:.85rem;color:var(--text2)">'+(r.degree||'')+' '+(r.major||'')+'</div>';
  uniHtml+='</div>';

  // 2. GPA
  uniHtml+='<div style="padding:16px;background:var(--bg2);border-radius:var(--r2);margin-bottom:12px">';
  uniHtml+='<div style="display:flex;align-items:center;gap:12px">';
  uniHtml+='<div style="font-size:.85rem;color:var(--text2)">📊 เกรดเฉลี่ย</div>';
  if(gpa>0){
    uniHtml+='<div style="font-size:1.8rem;font-weight:900;color:'+gpaClr+'">'+gpa.toFixed(2)+'</div>';
    uniHtml+='<div style="padding:3px 12px;border-radius:100px;font-size:.78rem;font-weight:600;background:'+gpaClr+'18;color:'+gpaClr+'">'+(r._gpaLevel||'')+'  (+'+r._gpaScore+' คะแนน)</div>';
  }else{
    uniHtml+='<div style="font-size:1.2rem;font-weight:600;color:var(--text3)">ไม่ระบุใน Resume (+0)</div>';
  }
  uniHtml+='</div></div>';

  // Score summary bar
  uniHtml+='<div style="padding:12px 16px;background:var(--bg2);border-radius:var(--r2);margin-bottom:12px">';
  uniHtml+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:.85rem;color:var(--text2)">คะแนนรวม</span><span style="font-size:1.1rem;font-weight:800;color:'+tierBg+'">'+total+'/25</span></div>';
  var pct=Math.round(total/25*100);
  uniHtml+='<div style="height:12px;background:var(--border2);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+tierBg+';border-radius:6px"></div></div>';
  uniHtml+='<div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.75rem;color:var(--text3)"><span>มหาวิทยาลัย: '+(r._uniScore||0)+'/15</span><span>GPA: '+(r._gpaScore||0)+'/10</span></div>';
  uniHtml+='</div>';

  h+='<details open style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">🎓 การศึกษา & คะแนน — '+tier+' Tier ('+total+'/25)</summary><div style="padding:14px">'+uniHtml+'</div></details>';

  // 3+4 เพศ & อายุ
  var infoHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">';
  infoHtml+='<div style="padding:16px;background:var(--bg2);border-radius:var(--r2);text-align:center"><div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">👤 ชื่อ</div><div style="font-weight:600">'+(r.name||'ไม่ระบุ')+'</div></div>';
  infoHtml+='<div style="padding:16px;background:var(--bg2);border-radius:var(--r2);text-align:center"><div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">⚧ เพศ</div><div style="font-weight:600;font-size:1.1rem">'+(r.gender||'ไม่ระบุ')+'</div></div>';
  infoHtml+='<div style="padding:16px;background:var(--bg2);border-radius:var(--r2);text-align:center"><div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">🎂 อายุ</div><div style="font-weight:600;font-size:1.1rem">'+(r.age?r.age+' ปี':'ไม่ระบุ')+'</div></div>';
  infoHtml+='<div style="padding:16px;background:var(--bg2);border-radius:var(--r2);text-align:center"><div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">💼 ประสบการณ์</div><div style="font-weight:600;font-size:1.1rem">'+(r.experience_years?r.experience_years+' ปี':'ไม่ระบุ')+'</div></div>';
  infoHtml+='</div>';
  h+='<details open style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">👤 ข้อมูลส่วนตัว</summary><div style="padding:14px">'+infoHtml+'</div></details>';

  // ประสบการณ์
  if(r.experience_summary){
    h+='<details style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">💼 ประสบการณ์ & ทักษะ</summary><div style="padding:14px;font-size:.85rem;line-height:1.8;color:var(--text2)">';
    h+='<div style="padding:10px;background:var(--bg2);border-radius:var(--r2);margin-bottom:10px">'+r.experience_summary+'</div>';
    if(r.skills)h+='<div style="margin-top:8px"><b>🎯 ทักษะ:</b> '+r.skills+'</div>';
    h+='</div></details>';
  }

  // จุดแข็ง
  if(r.strengths&&r.strengths.length){
    var stH=r.strengths.map(function(s){return '<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px 12px;background:rgba(34,197,94,.06);border-radius:var(--r2);border-left:3px solid var(--green)"><span>✅</span><span>'+s+'</span></div>';}).join('');
    h+='<details style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">💪 จุดแข็ง ('+r.strengths.length+')</summary><div style="padding:14px">'+stH+'</div></details>';
  }

  // Red Flags
  if(r.red_flags&&r.red_flags.length&&r.red_flags[0]!=='ไม่มี'&&r.red_flags[0]!=='-'){
    var rfH=r.red_flags.map(function(f){return '<div style="display:flex;gap:8px;margin-bottom:6px;padding:8px 12px;background:rgba(239,68,68,.06);border-radius:var(--r2);border-left:3px solid var(--red)"><span>⚠️</span><span>'+f+'</span></div>';}).join('');
    h+='<details style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">🚩 Red Flags ('+r.red_flags.length+')</summary><div style="padding:14px">'+rfH+'</div></details>';
  }

  // คำถามสัมภาษณ์
  if(r.interview_questions&&r.interview_questions.length){
    var iqH=r.interview_questions.map(function(q,i){return '<div style="display:flex;gap:10px;margin-bottom:8px;padding:10px 12px;background:var(--bg2);border-radius:var(--r2)"><span style="color:var(--accent);font-weight:700">'+(i+1)+'.</span><span>'+q+'</span></div>';}).join('');
    h+='<details style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden"><summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">❓ คำถามสัมภาษณ์ ('+r.interview_questions.length+')</summary><div style="padding:14px">'+iqH+'</div></details>';
  }

  h+='</div></div>';
  return h;
};
