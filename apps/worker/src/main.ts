import { BackgroundScheduler } from './scheduler.js';
import { ConsoleNotificationDispatcher } from './notifications.js';

export async function startWorker() {
  console.log('[CIP Worker] Starting Background Scheduler daemon...');
  const dispatcher = new ConsoleNotificationDispatcher();
  const scheduler = new BackgroundScheduler(dispatcher);

  const intervalMs = Number(process.env['CIP_WORKER_INTERVAL_MS']) || 60000;
  console.log(`[CIP Worker] Polling cycle configured for every ${intervalMs}ms.`);

  const runTick = async () => {
    try {
      const now = new Date();
      const result = await scheduler.runCycle([], now);
      if (result.transitionedCount > 0 || result.notificationsSent > 0) {
        console.log(`[CIP Worker] Cycle completed: ${result.transitionedCount} transitions, ${result.notificationsSent} notifications.`);
      }
    } catch (err) {
      console.error('[CIP Worker] Error during scheduler cycle:', err);
    }
  };

  await runTick();
  setInterval(runTick, intervalMs);
}

if (process.env['NODE_ENV'] !== 'test') {
  startWorker().catch((err) => {
    console.error('[CIP Worker] Fatal worker startup error:', err);
    process.exit(1);
  });
}

