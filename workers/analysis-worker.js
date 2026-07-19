import { processAnalysisJob } from "../functions/lib/analysis-job.js";
import { cleanupExpiredLostItems } from "../functions/lib/lost-found-cleanup.js";

export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await processAnalysisJob(env, message.body.jobId);
        message.ack();
      } catch (error) {
        console.error("Analysis job failed", message.body.jobId, error);
        message.retry({ delaySeconds: 30 });
      }
    }
  },
  async scheduled(_controller, env, context) {
    context.waitUntil(cleanupExpiredLostItems(env));
  },
};
