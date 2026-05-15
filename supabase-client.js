// Initialize Supabase client using CDN (loaded in index.html)
const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── JOBS ─────────────────────────────────────────────────
async function fetchOpenJobs() {
  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('posted_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function fetchJobById(id) {
  const { data, error } = await sb
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ─── SUBMIT APPLICATION ────────────────────────────────────
async function submitApplication({ fields, file }) {
  // UUID validation — reject numeric/local IDs, use null instead
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v || '');
  const safeJobId = isUuid(fields.jobId) ? fields.jobId : null;

  // 1. Insert applicant row (get ID first)
  const { data: applicant, error: insertErr } = await sb
    .from('applicants')
    .insert([{
      job_id: safeJobId,
      full_name: fields.fullName,
      email: fields.email,
      phone: fields.phone,
      linkedin_url: fields.linkedin || null,
      portfolio_url: fields.portfolio || null,
      cover_letter: fields.coverLetter || null,
      expected_salary: fields.salary ? parseInt(fields.salary) : null,
      years_experience: fields.experience ? parseInt(fields.experience) : null,
    }])
    .select('id')
    .single();

  console.log('INSERT RESPONSE', applicant);
  console.error('INSERT ERROR', insertErr);
  if (insertErr) { alert(JSON.stringify(insertErr)); throw insertErr; }

  // 2. Upload PDF to storage: resumes/{applicant_id}/resume.pdf
  if (file) {
    const filePath = `${applicant.id}/resume.pdf`;
    const { error: uploadErr } = await sb.storage
      .from('resumes')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadErr) throw uploadErr;

    // 3. Save resume path back to applicants row
    await sb
      .from('applicants')
      .update({ resume_path: filePath, resume_filename: file.name })
      .eq('id', applicant.id);
  }

  return applicant;
}
