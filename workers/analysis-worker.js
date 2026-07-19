import { processAnalysisJob } from "../functions/lib/analysis-job.js";

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
};

