export async function cleanupExpiredLostItems(env) {
  const expired = await env.DB.prepare(`
    SELECT id, image_key FROM lost_items
    WHERE status = 'resolved' AND expires_at IS NOT NULL AND datetime(expires_at) <= CURRENT_TIMESTAMP
    LIMIT 100
  `).all();

  if (!expired.results.length) return 0;

  if (env.UPLOADS) {
    await Promise.allSettled(expired.results.filter((item) => item.image_key).map((item) => env.UPLOADS.delete(item.image_key)));
  }

  await env.DB.batch(expired.results.map((item) => env.DB.prepare("DELETE FROM lost_items WHERE id = ?").bind(item.id)));
  return expired.results.length;
}
