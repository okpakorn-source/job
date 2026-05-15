// ─── AI Resume Analyzer v2 ──────────────────────────
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.setAIKey=function(){
  const key=prompt('กรุณาใส่ OpenAI API Key:',sessionStorage.getItem('openai_key')||'');
  if(key){sessionStorage.setItem('openai_key',key.trim());toast('บันทึก API Key เรียบร้อย ✅')}
};

async function getPdfText(resumePath){
  // Use Supabase client to download (handles auth+CORS)
  const {data,error}=await sb.storage.from('resumes').download(resumePath);
  if(error||!data)throw new Error('ดาวน์โหลด PDF ไม่สำเร็จ: '+(error?.message||''));
  const buf=await data.arrayBuffer();
  try{
    const pdf=await pdfjsLib.getDocument({data:buf}).promise;
    let text='';
    for(let i=1;i<=pdf.numPages;i++){
      const pg=await pdf.getPage(i);
      const c=await pg.getTextContent();
      text+=c.items.map(x=>x.str).join(' ')+'\n';
    }
    if(text.trim().length>30)return text.trim();
  }catch(e){console.warn('[AI] pdf.js:',e)}
  return null;
}

function buildPrompt(jobTitle,jobDesc,jobReq,resumeText){
  return `คุณคือผู้เชี่ยวชาญด้าน HR, Talent Acquisition, Business Operator และผู้ประเมินศักยภาพผู้สมัครงานระดับมืออาชีพ

อ่าน Resume ที่ให้มาแล้ววิเคราะห์อย่างละเอียด เพื่อช่วยคัดเลือกผู้สมัครที่ "มีของที่สุด"

ตำแหน่งที่สมัคร: "${jobTitle}"
${jobDesc?'ลักษณะงาน: '+jobDesc:''}
${jobReq?'คุณสมบัติที่ต้องการ: '+jobReq:''}

Resume:
${resumeText}

วิเคราะห์ตาม 10 หัวข้อ แล้วตอบเป็น JSON ตาม format นี้เท่านั้น:
{
  "identity":{"type":"สายงาน","strengths":"จุดแข็งหลัก","top_experience":"ประสบการณ์เด่น","org_fit":"เหมาะกับองค์กรแบบไหน","level":"Junior/Mid/Senior/Lead/Manager"},
  "experience":{"history":"สรุปประวัติงาน","relevance":"ความเกี่ยวข้องกับตำแหน่ง","evidence":"หลักฐานผลงานจริง","authenticity":"ทำจริงหรือคำสวย","progression":"career progression"},
  "skills":{"hard":{"score":1-10,"detail":""},"soft":{"score":1-10,"detail":""},"technical":{"score":1-10,"detail":""},"leadership":{"score":1-10,"detail":""},"problem_solving":{"score":1-10,"detail":""},"communication":{"score":1-10,"detail":""},"analytical":{"score":1-10,"detail":""},"creativity":{"score":1-10,"detail":""}},
  "potential":{"special":"ความพิเศษ","genius_signal":"สัญญาณคนเก่งจริง","rare_ability":"ความสามารถหายาก","ownership":"ความเป็นเจ้าของงาน","growth_mindset":"growth mindset","growth_speed":"โอกาสโตเร็ว"},
  "red_flags":["รายการ red flags ถ้ามี"],
  "job_fit":{"match_pct":0-100,"best_match":"จุดที่ตรงที่สุด","gaps":"จุดที่ยังขาด","interview_topics":"ต้องสัมภาษณ์เพิ่มเรื่องอะไร","starting_role":"ถ้ารับเข้ามาควรเริ่มจากงานแบบไหน"},
  "scores":{"experience":0-20,"proven_results":0-20,"skill_match":0-20,"potential":0-20,"reliability":0-10,"team_fit":0-10,"total":0-100},
  "tier":"S|A|B|C|Reject",
  "tier_reason":"เหตุผลการจัดระดับ",
  "interview_questions":["คำถาม1","คำถาม2","คำถาม3","คำถาม4","คำถาม5","คำถาม6","คำถาม7","คำถาม8","คำถาม9","คำถาม10"],
  "executive_summary":{"should_interview":true/false,"reason":"เหตุผลหลัก","risk":"ความเสี่ยง","ranking_hint":"ลำดับประมาณไหนถ้าเทียบหลายคน"},
  "verdict":"ผ่าน|ไม่ผ่าน"
}`;
}

window.analyzeResume=async function(id){
  let apiKey=sessionStorage.getItem('openai_key');
  if(!apiKey){setAIKey();apiKey=sessionStorage.getItem('openai_key');if(!apiKey)return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume','error');return}
  toast('🤖 กำลังวิเคราะห์ Resume... รอ 15-30 วินาที');
  try{
    const resumeText=await getPdfText(app.resume_path);
    if(!resumeText)throw new Error('ไม่สามารถอ่านข้อความจาก PDF ได้ (อาจเป็นไฟล์ scan)');
    // Get job details
    const jobTitle=app.jobs?app.jobs.title:'ไม่ระบุ';
    let jobDesc='',jobReq='';
    if(app.job_id){
      const jRes=await fetch(SUPABASE_URL+'/rest/v1/jobs?id=eq.'+app.job_id+'&select=description,requirements',{
        headers:{'apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON}
      });
      if(jRes.ok){const jd=await jRes.json();if(jd[0]){jobDesc=jd[0].description||'';jobReq=jd[0].requirements||''}}
    }
    const prompt=buildPrompt(jobTitle,jobDesc,jobReq,resumeText.slice(0,8000));
    const aiRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'gpt-4o-mini',response_format:{type:'json_object'},max_tokens:4000,messages:[{role:'user',content:prompt}]})
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const aiData=await aiRes.json();
    const r=JSON.parse(aiData.choices[0].message.content);
    // Map to DB columns
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
  const id=r.identity||{};
  const exp=r.experience||{};
  const pot=r.potential||{};
  const jf=r.job_fit||{};
  const es=r.executive_summary||{};
  return `<div style="margin-bottom:20px;border:2px solid ${tc}44;border-radius:var(--r);overflow:hidden">
    <div style="background:${tc}15;padding:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div style="font-weight:800;font-size:1.1rem">🤖 AI Resume Analysis</div>
      <div style="display:flex;gap:8px;align-items:center">
        <span style="background:${tierBg}22;color:${tierBg};padding:4px 14px;border-radius:100px;font-size:.85rem;font-weight:700">${r.tier} Tier</span>
        <span style="background:${tc}22;color:${tc};padding:4px 14px;border-radius:100px;font-size:.85rem;font-weight:700">${r.verdict} — ${sc.total||0}/100</span>
      </div>
    </div>
    <div style="padding:16px">
      ${section('👤','สรุปตัวตนผู้สมัคร',`<p><strong>สายงาน:</strong> ${id.type||'-'}</p><p><strong>จุดแข็ง:</strong> ${id.strengths||'-'}</p><p><strong>ประสบการณ์เด่น:</strong> ${id.top_experience||'-'}</p><p><strong>เหมาะกับองค์กร:</strong> ${id.org_fit||'-'}</p><p><strong>ระดับ:</strong> ${id.level||'-'}</p>`)}
      ${section('💼','ประสบการณ์ทำงาน',`<p>${exp.history||'-'}</p><p><strong>ความเกี่ยวข้อง:</strong> ${exp.relevance||'-'}</p><p><strong>หลักฐาน:</strong> ${exp.evidence||'-'}</p><p><strong>ความจริงแท้:</strong> ${exp.authenticity||'-'}</p><p><strong>Career Path:</strong> ${exp.progression||'-'}</p>`)}
      ${section('🎯','Skill Assessment',`${skillBar('Hard Skills',sk.hard)}${skillBar('Soft Skills',sk.soft)}${skillBar('Technical',sk.technical)}${skillBar('Leadership',sk.leadership)}${skillBar('Problem Solving',sk.problem_solving)}${skillBar('Communication',sk.communication)}${skillBar('Analytical',sk.analytical)}${skillBar('Creativity',sk.creativity)}`)}
      ${section('⭐','ความ "มีของ"',`<p><strong>ความพิเศษ:</strong> ${pot.special||'-'}</p><p><strong>สัญญาณคนเก่ง:</strong> ${pot.genius_signal||'-'}</p><p><strong>ความสามารถหายาก:</strong> ${pot.rare_ability||'-'}</p><p><strong>Ownership:</strong> ${pot.ownership||'-'}</p><p><strong>Growth Mindset:</strong> ${pot.growth_mindset||'-'}</p>`)}
      ${r.red_flags?.length?section('🚩','Red Flags',`<ul style="padding-left:18px">${r.red_flags.map(f=>'<li style="margin-bottom:4px;color:var(--red)">'+f+'</li>').join('')}</ul>`):''}
      ${section('📊','ความเหมาะกับตำแหน่ง',`<p><strong>Match:</strong> <span style="font-size:1.2rem;font-weight:800;color:${(jf.match_pct||0)>=70?'var(--green)':'var(--gold)'}">${jf.match_pct||0}%</span></p><p><strong>จุดที่ตรง:</strong> ${jf.best_match||'-'}</p><p><strong>จุดที่ขาด:</strong> ${jf.gaps||'-'}</p><p><strong>ต้องสัมภาษณ์เพิ่ม:</strong> ${jf.interview_topics||'-'}</p><p><strong>ควรเริ่มจาก:</strong> ${jf.starting_role||'-'}</p>`)}
      ${section('📈','คะแนนรวม',`${bar('ประสบการณ์ตรงสาย',sc.experience||0,20)}${bar('ผลงานที่พิสูจน์ได้',sc.proven_results||0,20)}${bar('Skill ตรงตำแหน่ง',sc.skill_match||0,20)}${bar('ศักยภาพเติบโต',sc.potential||0,20)}${bar('ความน่าเชื่อถือ',sc.reliability||0,10)}${bar('เหมาะกับทีม',sc.team_fit||0,10)}<div style="text-align:right;font-size:1.1rem;font-weight:800;margin-top:8px;color:${(sc.total||0)>=70?'var(--green)':'var(--gold)'}">รวม: ${sc.total||0}/100</div>`)}
      ${r.interview_questions?.length?section('❓','คำถามสัมภาษณ์',`<ol style="padding-left:18px">${r.interview_questions.map(q=>'<li style="margin-bottom:6px">'+q+'</li>').join('')}</ol>`):''}
      ${section('📋','สรุปสำหรับผู้บริหาร',`<p><strong>ควรสัมภาษณ์:</strong> <span style="font-weight:700;color:${es.should_interview?'var(--green)':'var(--red)'}">${es.should_interview?'✅ ใช่':'❌ ไม่'}</span></p><p><strong>เหตุผล:</strong> ${es.reason||'-'}</p><p><strong>ความเสี่ยง:</strong> ${es.risk||'-'}</p><p><strong>ลำดับ:</strong> ${es.ranking_hint||'-'}</p>`)}
    </div>
  </div>`;
};
