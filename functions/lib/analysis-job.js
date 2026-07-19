import { compareDocumentText, extractDocumentText, normalizeText, reportRecommendations } from "./originality.js";

export async function processAnalysisJob(env, jobId) {
  const job = await env.DB.prepare(`
    SELECT analysis_jobs.*, analysis_documents.object_key, analysis_documents.original_name
    FROM analysis_jobs JOIN analysis_documents ON analysis_documents.id = analysis_jobs.document_id
    WHERE analysis_jobs.id = ?
  `).bind(jobId).first();
  if (!job || job.status === "completed") return;

  const timestamp = new Date().toISOString();
  await env.DB.prepare("UPDATE analysis_jobs SET status = 'processing', progress = 15, attempts = attempts + 1, started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ?")
    .bind(timestamp, timestamp, jobId).run();

  try {
    const object = await env.UPLOADS.get(job.object_key);
    if (!object) throw new Error("Uploaded thesis file was not found in R2.");
    const text = normalizeText(await extractDocumentText(await object.arrayBuffer(), job.original_name));
    if (text.split(" ").length < 40) throw new Error("Too little readable text was extracted. Upload a text-based PDF or DOCX file.");

    await env.DB.prepare("UPDATE analysis_documents SET extracted_text = ?, word_count = ? WHERE id = ?")
      .bind(text.slice(0, 750000), text.split(" ").length, job.document_id).run();
    await env.DB.prepare("UPDATE analysis_jobs SET progress = 55, updated_at = ? WHERE id = ?").bind(new Date().toISOString(), jobId).run();

    const sourceRows = await env.DB.prepare("SELECT id, extracted_text FROM analysis_documents WHERE id <> ? AND extracted_text IS NOT NULL ORDER BY created_at DESC LIMIT 100").bind(job.document_id).all();
    const result = compareDocumentText(text, sourceRows.results || []);
    const recommendations = reportRecommendations(result);

    const statements = [
      env.DB.prepare("DELETE FROM analysis_matches WHERE job_id = ?").bind(jobId),
      env.DB.prepare("DELETE FROM analysis_reports WHERE job_id = ?").bind(jobId),
    ];
    for (const match of result.matches.slice(0, 20)) {
      statements.push(env.DB.prepare("INSERT INTO analysis_matches (id, job_id, source_document_id, similarity_percent, matched_shingles, excerpt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(`match_${crypto.randomUUID()}`, jobId, match.sourceDocumentId, match.similarityPercent, match.matchedShingles, match.excerpt, new Date().toISOString()));
    }
    statements.push(env.DB.prepare("INSERT INTO analysis_reports (id, job_id, similarity_percent, matched_shingles, total_shingles, coverage_note, recommendations_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(`report_${crypto.randomUUID()}`, jobId, result.similarityPercent, result.matchedShingles, result.totalShingles, result.coverageNote, JSON.stringify(recommendations), new Date().toISOString()));
    statements.push(env.DB.prepare("UPDATE analysis_jobs SET status = 'completed', progress = 100, completed_at = ?, updated_at = ?, error_message = NULL WHERE id = ?")
      .bind(new Date().toISOString(), new Date().toISOString(), jobId));
    await env.DB.batch(statements);
  } catch (error) {
    await env.DB.prepare("UPDATE analysis_jobs SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?")
      .bind(String(error.message || error).slice(0, 500), new Date().toISOString(), jobId).run();
    throw error;
  }
}

