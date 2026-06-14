const CRM_WEBHOOK_URL =
  process.env.CRM_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/message-status';

interface DeliveryJob {
  logId: string;
  customerId: string;
  channel: string;
  content: string;
  subject?: string;
  campaignId: string;
}

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWebhook(logId: string, status: string): Promise<void> {
  const payload = { logId, status, timestamp: new Date().toISOString() };
  try {
    const res = await fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`Webhook ${status} for ${logId}: HTTP ${res.status}`);
    } else {
      console.log(`  ↗ ${status.toUpperCase()} → ${logId.slice(0, 8)}…`);
    }
  } catch (err) {
    console.error(`  Webhook send failed for ${logId}:`, (err as Error).message);
  }
}

export async function simulateDelivery(job: DeliveryJob): Promise<void> {
  const { logId, channel } = job;

  // Step 1: pending → delivered (or failed)
  // Simulate network transmission delay: 0.5s - 3s
  await randomDelay(500, 3000);

  const failed = Math.random() < 0.1; // 10% failure rate
  if (failed) {
    await sendWebhook(logId, 'failed');
    return; // stop pipeline for failed messages
  }

  await sendWebhook(logId, 'delivered');

  // Step 2: delivered → opened (~60% chance)
  // People open messages within 5s - 25s (compressed time for demo)
  const willOpen = Math.random() < 0.6;
  if (!willOpen) return;

  await randomDelay(5000, 25000);
  await sendWebhook(logId, 'opened');

  // Step 3: opened → clicked (~40% of openers click)
  const willClick = Math.random() < 0.4;
  if (!willClick) return;

  await randomDelay(8000, 40000);
  await sendWebhook(logId, 'clicked');

  // Step 4: clicked → converted (~25% of clickers convert)
  const willConvert = Math.random() < 0.25;
  if (!willConvert) return;

  await randomDelay(15000, 60000);
  await sendWebhook(logId, 'converted');
}
