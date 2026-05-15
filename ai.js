// ─── AI Resume Analyzer v4 — Vision-based ──────────
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.setAIKey=function(){
  const key=prompt('กรุณาใส่ OpenAI API Key:\n(จะถูกบันทึกไว้ในเครื่องนี้ กรอกครั้งเดียว)',localStorage.getItem('openai_key')||'');
  if(key){localStorage.setItem('openai_key',key.trim());toast('บันทึก API Key เรียบร้อย ✅ (จำไว้ถาวร)')}
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

function buildPrompt(jobTitle,jobDesc,jobReq){
  return `คุณคือผู้เชี่ยวชาญด้าน HR ระดับมืออาชีพ อ่าน Resume จากภาพแล้ววิเคราะห์อย่างละเอียด

ตำแหน่งที่สมัคร: "${jobTitle}"
${jobDesc?'ลักษณะงาน: '+jobDesc:''}
${jobReq?'คุณสมบัติ: '+jobReq:''}

ตอบเป็น JSON ตามโครงสร้างนี้เท่านั้น (ห้ามตอบนอกรูปแบบ):
{
  "profile": {
    "name": "ชื่อ-นามสกุล (ถ้าอ่านได้)",
    "gender": "ชาย/หญิง/ไม่ระบุ",
    "age": 0,
    "age_note": "อายุประมาณจากปีเกิดหรือปีจบการศึกษา ถ้าไม่มีข้อมูลใส่ 0",
    "university": "ชื่อมหาวิทยาลัย",
    "is_top20": false,
    "top20_note": "อธิบายว่าเป็น Top 20 ไทยหรือไม่ (จุฬา มธ. มก. มข. มช. มอ. มน. มจพ. พระจอมเกล้าลาดกระบัง พระจอมเกล้าธนบุรี ศิลปากร ขอนแก่น แม่ฟ้าหลวง บูรพา ศรีนครินทรฯ ม.รังสิต ม.กรุงเทพ ม.อัสสัมชัญ ม.หอการค้า ม.เกษตรศาสตร์)",
    "degree": "ป.ตรี/ป.โท/ป.เอก/อื่นๆ",
    "major": "สาขาวิชา",
    "gpa": 0.0,
    "gpa_note": "GPA จาก Resume ถ้าไม่ระบุใส่ 0"
  },
  "experience": {
    "total_years": 0,
    "summary": "สรุปประสบการณ์ทำงาน 2-3 ประโยค",
    "companies": "บริษัทที่เคยทำงาน",
    "relevance": "ความเกี่ยวข้องกับตำแหน่งที่สมัคร",
    "key_achievements": "ผลงานเด่น/ตัวเลขที่พิสูจน์ได้",
    "is_real": "ทำจริงหรือเขียนสวย — วิเคราะห์ตรงๆ"
  },
  "skills": {
    "hard_skills": "ทักษะเฉพาะทาง (เช่น Programming, Design, Marketing)",
    "soft_skills": "ทักษะด้านคน (Communication, Leadership, Teamwork)",
    "tools": "เครื่องมือที่ใช้ได้ (Software, Platform)",
    "languages": "ภาษาที่ใช้ได้ (ไทย อังกฤษ อื่นๆ)"
  },
  "scores": {
    "university": {"score": 0, "max": 15, "note": "Top 20 = 12-15, มหาลัยดี = 8-11, ทั่วไป = 4-7, ไม่ระบุ = 3"},
    "gpa": {"score": 0, "max": 10, "note": "3.5+ = 9-10, 3.0-3.49 = 6-8, 2.5-2.99 = 4-5, <2.5 = 1-3, ไม่ระบุ = 3"},
    "experience": {"score": 0, "max": 25, "note": "5ปี+ ตรงสาย = 20-25, 3-5ปี = 13-19, 1-3ปี = 7-12, <1ปี = 1-6"},
    "skill_match": {"score": 0, "max": 20, "note": "ตรงตำแหน่งมาก = 16-20, ค่อนข้างตรง = 10-15, พอได้ = 5-9, ไม่ตรง = 1-4"},
    "achievements": {"score": 0, "max": 15, "note": "มีผลงานพิสูจน์ชัด = 12-15, พอมี = 7-11, น้อย = 1-6"},
    "potential": {"score": 0, "max": 15, "note": "มีศักยภาพสูง = 12-15, ปานกลาง = 7-11, ต่ำ = 1-6"},
    "total": 0
  },
  "red_flags": ["จุดที่ต้องระวัง"],
  "strengths": ["จุดแข็ง 3-5 ข้อ"],
  "tier": "S",
  "tier_reason": "เหตุผลที่จัดอยู่ Tier นี้",
  "verdict": "ผ่าน",
  "should_interview": true,
  "interview_reason": "เหตุผลที่ควร/ไม่ควรเรียกสัมภาษณ์",
  "interview_questions": ["คำถามสัมภาษณ์ 5 ข้อที่ควรถาม"],
  "one_line_summary": "สรุป 1 ประโยคว่าคนนี้เป็นใคร เก่งอะไร"
}

กฎสำคัญ:
1. score ทุกตัวต้องเป็นตัวเลข ห้ามเป็น string
2. total = ผลรวมทุก score (เต็ม 100)
3. tier: S(80-100) A(65-79) B(50-64) C(35-49) Reject(<35)
4. ถ้าไม่มีข้อมูลบอกตรงๆว่า "ไม่ระบุใน Resume"
5. อย่าชมเกินจริง วิเคราะห์ตามหลักฐานที่เห็นเท่านั้น`;
}

window.analyzeResume=async function(id,promptId){
  let apiKey=localStorage.getItem('openai_key');
  if(!apiKey){setAIKey();apiKey=localStorage.getItem('openai_key');if(!apiKey)return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume','error');return}
  if(!promptId){showPromptSelector(id);return}
  const prompts=getPrompts();
  const selPrompt=prompts.find(p=>p.id===promptId)||prompts[0];
  toast('🤖 กำลังวิเคราะห์ด้วย "'+selPrompt.name+'"... รอ 15-30 วินาที');
  try{
    console.log('[AI] Downloading:',app.resume_path);
    const {data:blob,error:dlErr}=await sb.storage.from('resumes').download(app.resume_path);
    if(dlErr||!blob)throw new Error('ดาวน์โหลด PDF ไม่ได้: '+(dlErr?.message||'ไม่พบไฟล์'));
    console.log('[AI] PDF size:',blob.size,'bytes');
    let images;
    try{
      images=await pdfToImages(blob,4);
      console.log('[AI] Rendered',images.length,'pages');
    }catch(e){
      console.error('[AI] Render error:',e);
      throw new Error('ไม่สามารถแปลง PDF เป็นภาพได้: '+e.message);
    }
    if(!images.length)throw new Error('PDF ไม่มีหน้า');
    const jobTitle=app.jobs?app.jobs.title:'ไม่ระบุ';
    let jobDesc='',jobReq='';
    if(app.job_id){
      const jRes=await fetch(SUPABASE_URL+'/rest/v1/jobs?id=eq.'+app.job_id+'&select=description,requirements',{
        headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON}
      });
      if(jRes.ok){const jd=await jRes.json();if(jd[0]){jobDesc=jd[0].description||'';jobReq=jd[0].requirements||''}}
    }
    const promptText=selPrompt.content.replace(/\{\{JOB_TITLE\}\}/g,jobTitle).replace(/\{\{JOB_DESC\}\}/g,jobDesc?'ลักษณะงาน: '+jobDesc:'').replace(/\{\{JOB_REQ\}\}/g,jobReq?'คุณสมบัติ: '+jobReq:'');
    const content=[{type:'text',text:promptText}];
    images.forEach(img=>content.push({type:'image_url',image_url:{url:img,detail:'high'}}));
    const aiRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},max_tokens:4000,messages:[{role:'system',content:'คุณเป็นผู้เชี่ยวชาญด้าน HR วิเคราะห์ Resume ตอบเป็น JSON เท่านั้น ทุก score ต้องเป็นตัวเลข'},{role:'user',content:content}]})
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const aiData=await aiRes.json();
    const raw=aiData.choices[0].message.content;
    console.log('[AI] Raw response:',raw);
    const r=JSON.parse(raw);
    // Calculate total if not provided
    if(r.scores){
      let t=0;
      ['university','gpa','experience','skill_match','achievements','potential'].forEach(k=>{
        if(r.scores[k]){
          const s=typeof r.scores[k]==='object'?Number(r.scores[k].score)||0:Number(r.scores[k])||0;
          t+=s;
        }
      });
      if(!r.scores.total||r.scores.total===0)r.scores.total=t;
    }
    const total=r.scores?.total||0;
    const tierMap={S:'top',A:'strong',B:'average',C:'weak',Reject:'weak'};
    await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+id,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body:JSON.stringify({ai_analyzed:true,ai_analyzed_at:new Date().toISOString(),ai_summary:r,ai_score_overall:total,ai_tier:tierMap[r.tier]||'average',ai_recommendation:r.interview_reason||r.one_line_summary||''})
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
  const p=r.profile||{};const ex=r.experience||{};const sk=r.skills||{};const sc=r.scores||{};
  const tc=r.verdict==='ผ่าน'?'#22c55e':'#ef4444';
  const tierC={S:'#22c55e',A:'#06b6d4',B:'#f59e0b',C:'#ef4444',Reject:'#ef4444'};
  const tierBg=tierC[r.tier]||'#94a3b8';
  const tierEmoji={S:'🏆',A:'⭐',B:'👍',C:'⚠️',Reject:'❌'};
  const total=sc.total||0;
  const totalClr=total>=70?'var(--green)':total>=40?'var(--gold)':'var(--red)';

  // Score bar helper
  const sbar=function(label,obj){
    if(!obj)return '';
    const v=typeof obj==='object'?(Number(obj.score)||0):Number(obj)||0;
    const mx=typeof obj==='object'?(Number(obj.max)||10):10;
    const pct=mx>0?Math.round(v/mx*100):0;
    const c=pct>=70?'var(--green)':pct>=40?'var(--gold)':'var(--red)';
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:.85rem">'
      +'<span style="width:130px;color:var(--text2);flex-shrink:0">'+label+'</span>'
      +'<div style="flex:1;height:10px;background:var(--border2);border-radius:5px;overflow:hidden">'
      +'<div style="height:100%;width:'+pct+'%;background:'+c+';border-radius:5px"></div></div>'
      +'<span style="width:50px;text-align:right;font-weight:700;color:'+c+'">'+v+'/'+mx+'</span></div>';
  };

  // Section helper
  var sec=function(icon,title,html,open){
    return '<details'+(open?' open':'')+' style="margin-bottom:8px;border:1px solid var(--border2);border-radius:var(--r2);overflow:hidden">'
      +'<summary style="padding:12px 14px;cursor:pointer;font-weight:600;font-size:.9rem;background:var(--bg2)">'+icon+' '+title+'</summary>'
      +'<div style="padding:14px;font-size:.85rem;line-height:1.8;color:var(--text2)">'+html+'</div></details>';
  };

  // Info row helper
  var row=function(label,val,color){
    if(!val||val==='-'||val==='ไม่ระบุ'||val==='ไม่ระบุใน Resume'||val===0||val==='0')return '';
    return '<div style="display:flex;gap:8px;margin-bottom:8px;align-items:start">'
      +'<span style="color:var(--text3);min-width:100px;flex-shrink:0;font-size:.82rem">'+label+'</span>'
      +'<span style="color:'+(color||'var(--text)')+';font-weight:500">'+val+'</span></div>';
  };

  // Badge helper
  var badge=function(text,color,bg){
    return '<span style="display:inline-block;padding:3px 12px;border-radius:100px;font-size:.78rem;font-weight:600;background:'+bg+';color:'+color+';margin-right:6px;margin-bottom:4px">'+text+'</span>';
  };

  var html='<div style="margin-bottom:20px;border:2px solid '+tc+'44;border-radius:var(--r);overflow:hidden">';

  // ===== HEADER =====
  html+='<div style="background:linear-gradient(135deg,'+tierBg+'18,'+tc+'12);padding:24px;text-align:center">';
  html+='<div style="font-size:2.5rem;margin-bottom:4px">'+(tierEmoji[r.tier]||'🤖')+'</div>';
  html+='<div style="display:inline-block;background:'+tierBg+'22;color:'+tierBg+';padding:6px 24px;border-radius:100px;font-size:1.3rem;font-weight:800;border:2px solid '+tierBg+'44;margin-bottom:8px">'+r.tier+' Tier</div>';
  html+='<div style="font-size:2.2rem;font-weight:900;color:'+tc+';margin:8px 0">'+total+'<span style="font-size:1rem;color:var(--text3)">/100</span></div>';
  html+='<div style="font-size:.9rem;font-weight:600;color:'+tc+'">'+(r.verdict==='ผ่าน'?'✅ ผ่านการคัดกรอง':'❌ ไม่ผ่านการคัดกรอง')+'</div>';
  if(r.one_line_summary)html+='<div style="margin-top:10px;font-size:.85rem;color:var(--text2);max-width:500px;margin-left:auto;margin-right:auto">💡 '+r.one_line_summary+'</div>';
  html+='</div>';

  html+='<div style="padding:16px">';

  // ===== 1. ข้อมูลส่วนตัว =====
  var profileHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  profileHtml+=row('👤 ชื่อ',p.name);
  profileHtml+=row('⚧ เพศ',p.gender);
  profileHtml+=row('🎂 อายุ',p.age?p.age+' ปี':'');
  profileHtml+=row('🎓 วุฒิ',p.degree);
  profileHtml+='</div>';
  profileHtml+=row('🏫 มหาวิทยาลัย',p.university, p.is_top20?'var(--green)':'var(--text)');
  if(p.is_top20)profileHtml+='<div style="margin:4px 0 8px">'+badge('🏆 Top 20 มหาวิทยาลัยไทย','#22c55e','rgba(34,197,94,.12)')+'</div>';
  if(p.top20_note)profileHtml+='<div style="font-size:.78rem;color:var(--text3);margin-bottom:8px">'+p.top20_note+'</div>';
  profileHtml+=row('📚 สาขา',p.major);
  profileHtml+=row('📊 เกรดเฉลี่ย',p.gpa?p.gpa.toString():'',p.gpa>=3.5?'var(--green)':p.gpa>=3.0?'var(--accent)':p.gpa>=2.5?'var(--gold)':'var(--red)');
  if(p.gpa_note&&p.gpa_note!=='ไม่ระบุ')profileHtml+='<div style="font-size:.78rem;color:var(--text3);margin-bottom:4px">'+p.gpa_note+'</div>';
  html+=sec('👤','ข้อมูลผู้สมัคร'+(p.name?' — '+p.name:''),profileHtml,true);

  // ===== 2. คะแนนรวม 6 ด้าน =====
  var scoreHtml='';
  scoreHtml+=sbar('🏫 มหาวิทยาลัย',sc.university);
  scoreHtml+=sbar('📊 เกรดเฉลี่ย',sc.gpa);
  scoreHtml+=sbar('💼 ประสบการณ์',sc.experience);
  scoreHtml+=sbar('🎯 Skill ตรงตำแหน่ง',sc.skill_match);
  scoreHtml+=sbar('🏆 ผลงานเด่น',sc.achievements);
  scoreHtml+=sbar('🚀 ศักยภาพ',sc.potential);
  scoreHtml+='<div style="text-align:right;font-size:1.3rem;font-weight:900;margin-top:14px;padding-top:14px;border-top:2px solid var(--border2);color:'+totalClr+'">รวม: '+total+'/100</div>';
  html+=sec('📊','คะแนนรวม 6 ด้าน — '+total+'/100',scoreHtml,true);

  // ===== 3. ควรเรียกสัมภาษณ์? =====
  var intHtml='<div style="display:flex;align-items:center;gap:12px;padding:14px;background:'+(r.should_interview?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)')+';border-radius:var(--r2);border:1px solid '+(r.should_interview?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)')+'">';
  intHtml+='<span style="font-size:2.2rem">'+(r.should_interview?'✅':'❌')+'</span>';
  intHtml+='<div><div style="font-weight:700;font-size:1.05rem;color:'+(r.should_interview?'var(--green)':'var(--red)')+'">'+(r.should_interview?'ควรเรียกสัมภาษณ์':'ไม่แนะนำให้สัมภาษณ์')+'</div>';
  intHtml+='<div style="font-size:.85rem;color:var(--text2);margin-top:4px">'+(r.interview_reason||'')+'</div></div></div>';
  if(r.tier_reason)intHtml+='<div style="margin-top:10px;font-size:.82rem;color:var(--text3)">📋 '+r.tier_reason+'</div>';
  html+=sec('📋','สรุปสำหรับผู้บริหาร',intHtml,true);

  // ===== 4. ประสบการณ์ทำงาน =====
  var expHtml='';
  expHtml+=row('📅 ประสบการณ์',ex.total_years?ex.total_years+' ปี':'');
  if(ex.summary)expHtml+='<div style="padding:10px;background:var(--bg2);border-radius:var(--r2);margin-bottom:10px">'+ex.summary+'</div>';
  expHtml+=row('🏢 บริษัท',ex.companies);
  expHtml+=row('🔗 ความเกี่ยวข้อง',ex.relevance);
  expHtml+=row('🏆 ผลงานเด่น',ex.key_achievements,'var(--green)');
  expHtml+=row('🔍 ทำจริงหรือคำสวย',ex.is_real);
  html+=sec('💼','ประสบการณ์ทำงาน'+(ex.total_years?' — '+ex.total_years+' ปี':''),expHtml);

  // ===== 5. ทักษะ =====
  var skHtml='';
  skHtml+=row('💻 Hard Skills',sk.hard_skills);
  skHtml+=row('🤝 Soft Skills',sk.soft_skills);
  skHtml+=row('🛠 เครื่องมือ',sk.tools);
  skHtml+=row('🌐 ภาษา',sk.languages);
  html+=sec('🎯','ทักษะ',skHtml);

  // ===== 6. จุดแข็ง =====
  if(r.strengths&&r.strengths.length){
    var stHtml=r.strengths.map(function(s){return '<div style="display:flex;gap:8px;margin-bottom:8px;padding:8px 12px;background:rgba(34,197,94,.06);border-radius:var(--r2);border-left:3px solid var(--green)"><span style="color:var(--green)">✅</span><span>'+s+'</span></div>';}).join('');
    html+=sec('💪','จุดแข็ง ('+r.strengths.length+')',stHtml);
  }

  // ===== 7. Red Flags =====
  if(r.red_flags&&r.red_flags.length&&r.red_flags[0]!=='ไม่มี'){
    var rfHtml=r.red_flags.map(function(f){return '<div style="display:flex;gap:8px;margin-bottom:8px;padding:8px 12px;background:rgba(239,68,68,.06);border-radius:var(--r2);border-left:3px solid var(--red)"><span style="color:var(--red)">⚠️</span><span>'+f+'</span></div>';}).join('');
    html+=sec('🚩','Red Flags ('+r.red_flags.length+')',rfHtml);
  }

  // ===== 8. คำถามสัมภาษณ์ =====
  if(r.interview_questions&&r.interview_questions.length){
    var iqHtml=r.interview_questions.map(function(q,i){return '<div style="display:flex;gap:10px;margin-bottom:10px;padding:10px 12px;background:var(--bg2);border-radius:var(--r2)"><span style="color:var(--accent);font-weight:700;flex-shrink:0">'+(i+1)+'.</span><span>'+q+'</span></div>';}).join('');
    html+=sec('❓','คำถามสัมภาษณ์ ('+r.interview_questions.length+' ข้อ)',iqHtml);
  }

  html+='</div></div>';
  return html;
};
