// ─── AI Resume Analyzer ──────────────────────────────
if(typeof pdfjsLib!=='undefined')pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

window.setAIKey=function(){
  const key=prompt('กรุณาใส่ OpenAI API Key:',sessionStorage.getItem('openai_key')||'');
  if(key){sessionStorage.setItem('openai_key',key.trim());toast('บันทึก API Key เรียบร้อย ✅')}
};

async function extractPdfText(url){
  const pdf=await pdfjsLib.getDocument(url).promise;
  let text='';
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i);
    const c=await page.getTextContent();
    text+=c.items.map(x=>x.str).join(' ')+'\n';
  }
  return text.trim();
}

window.analyzeResume=async function(id){
  const apiKey=sessionStorage.getItem('openai_key');
  if(!apiKey){setAIKey();if(!sessionStorage.getItem('openai_key'))return}
  const app=(window._adminApps||[]).find(a=>a.id===id);
  if(!app||!app.resume_path){toast('ไม่พบ Resume สำหรับวิเคราะห์','error');return}
  toast('🤖 กำลังวิเคราะห์ Resume... รอสักครู่');
  try{
    // 1. Get signed URL
    const signRes=await fetch(SUPABASE_URL+'/storage/v1/object/sign/resumes/'+app.resume_path,{
      method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON},
      body:JSON.stringify({expiresIn:600})
    });
    if(!signRes.ok)throw new Error('ไม่สามารถเข้าถึง Resume ได้');
    const signData=await signRes.json();
    const pdfUrl=SUPABASE_URL+'/storage/v1'+signData.signedURL;
    // 2. Extract text
    const resumeText=await extractPdfText(pdfUrl);
    if(!resumeText||resumeText.length<20)throw new Error('ไม่สามารถอ่านข้อความจาก PDF ได้');
    const jobTitle=app.jobs?app.jobs.title:'ไม่ระบุตำแหน่ง';
    // 3. Call OpenAI
    const aiRes=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+sessionStorage.getItem('openai_key')},
      body:JSON.stringify({
        model:'gpt-4o-mini',
        response_format:{type:'json_object'},
        messages:[
          {role:'system',content:'คุณเป็นผู้เชี่ยวชาญ HR ด้านการคัดกรอง Resume ให้คะแนนและวิเคราะห์ผู้สมัครงาน ตอบเป็น JSON เท่านั้น'},
          {role:'user',content:`วิเคราะห์ Resume นี้สำหรับตำแหน่ง "${jobTitle}"\n\nResume:\n${resumeText.slice(0,4000)}\n\nตอบเป็น JSON:\n{"overall_score":0-100,"skill_score":0-100,"experience_score":0-100,"education_score":0-100,"communication_score":0-100,"tier":"top|strong|average|weak","summary":"สรุปภาพรวม 2-3 ประโยค","recommendation":"คำแนะนำ 1-2 ประโยค","strengths":["จุดแข็ง1","จุดแข็ง2"],"improvements":["จุดที่ควรพัฒนา1"]}`}
        ]
      })
    });
    if(!aiRes.ok){const e=await aiRes.json();throw new Error(e.error?.message||'OpenAI Error')}
    const aiData=await aiRes.json();
    const analysis=JSON.parse(aiData.choices[0].message.content);
    // 4. Save to Supabase
    await fetch(SUPABASE_URL+'/rest/v1/applicants?id=eq.'+id,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON,'Authorization':'Bearer '+SUPABASE_ANON,'Prefer':'return=minimal'},
      body:JSON.stringify({
        ai_analyzed:true,ai_analyzed_at:new Date().toISOString(),ai_summary:analysis,
        ai_score_overall:analysis.overall_score,ai_score_skill:analysis.skill_score,
        ai_score_exp:analysis.experience_score,ai_score_edu:analysis.education_score,
        ai_score_comm:analysis.communication_score,ai_tier:analysis.tier,
        ai_recommendation:analysis.recommendation
      })
    });
    // 5. Update local data
    Object.assign(app,{ai_analyzed:true,ai_summary:analysis,ai_score_overall:analysis.overall_score,ai_tier:analysis.tier,ai_recommendation:analysis.recommendation,ai_score_skill:analysis.skill_score,ai_score_exp:analysis.experience_score,ai_score_edu:analysis.education_score,ai_score_comm:analysis.communication_score});
    toast('วิเคราะห์สำเร็จ! คะแนน: '+analysis.overall_score+'/100 🎯');
    filterApplicants();
    viewApplicant(id);
  }catch(err){
    console.error('[AI]',err);
    toast('AI Error: '+err.message,'error');
  }
};

window.renderAIResults=function(a){
  if(!a.ai_analyzed||!a.ai_summary)return '';
  const s=a.ai_summary;
  const tierColors={top:'#22c55e',strong:'#06b6d4',average:'#f59e0b',weak:'#ef4444'};
  const tierLabels={top:'🏆 Top',strong:'💪 Strong',average:'📊 Average',weak:'⚠️ Weak'};
  const tc=tierColors[s.tier]||'#94a3b8';
  const scoreBar=(label,val)=>`<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px"><span>${label}</span><span style="font-weight:700;color:${val>=70?'var(--green)':val>=40?'var(--gold)':'var(--red)'}">${val}/100</span></div><div style="height:6px;background:var(--border2);border-radius:3px;overflow:hidden"><div style="height:100%;width:${val}%;background:${val>=70?'var(--green)':val>=40?'var(--gold)':'var(--red)'};border-radius:3px;transition:width .5s"></div></div></div>`;
  return `<div style="margin-bottom:20px;border:1px solid ${tc}33;border-radius:var(--r);overflow:hidden">
    <div style="background:${tc}15;padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
      <div style="font-weight:700;font-size:.95rem">🤖 AI Resume Analysis</div>
      <span style="background:${tc}22;color:${tc};padding:4px 12px;border-radius:100px;font-size:.8rem;font-weight:700">${tierLabels[s.tier]||s.tier} — ${s.overall_score}/100</span>
    </div>
    <div style="padding:16px">
      ${scoreBar('🎯 ทักษะ (Skill)',s.skill_score)}
      ${scoreBar('💼 ประสบการณ์ (Experience)',s.experience_score)}
      ${scoreBar('🎓 การศึกษา (Education)',s.education_score)}
      ${scoreBar('💬 การสื่อสาร (Communication)',s.communication_score)}
      <div style="margin-top:14px;padding:12px;background:var(--bg2);border-radius:var(--r2);font-size:.88rem;line-height:1.6;color:var(--text2)"><strong>สรุป:</strong> ${s.summary||''}</div>
      ${s.recommendation?`<div style="margin-top:8px;padding:12px;background:rgba(99,102,241,.06);border-radius:var(--r2);font-size:.85rem;color:var(--accent)"><strong>💡 คำแนะนำ:</strong> ${s.recommendation}</div>`:''}
      ${s.strengths?`<div style="margin-top:8px;font-size:.83rem"><strong style="color:var(--green)">✅ จุดแข็ง:</strong> ${s.strengths.join(', ')}</div>`:''}
      ${s.improvements?`<div style="margin-top:4px;font-size:.83rem"><strong style="color:var(--gold)">📌 ควรพัฒนา:</strong> ${s.improvements.join(', ')}</div>`:''}
    </div>
  </div>`;
};
