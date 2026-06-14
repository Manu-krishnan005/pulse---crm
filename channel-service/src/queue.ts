import { Queue, Worker, Job } from 'bullmq';
import { simulateDelivery } from './simulator';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const isTLS = REDIS_URL.startsWith('rediss://');

/**
 * Parse a Redis URL into a plain connection options object.
 * BullMQ uses its own bundled ioredis — passing a plain object avoids
 * the "two ioredis versions" TypeScript conflict.
 */
function parseRedisUrl(rawUrl: string) {
  // Normalize rediss:// → redis:// for URL parsing, track TLS separately
  const url = new URL(rawUrl.replace(/^rediss:\/\//, 'redis://'));

  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.username && url.username !== 'default'
      ? { username: decodeURIComponent(url.username) }
      : {}),
    maxRetriesPerRequest: null as null,  // Required by BullMQ
    enableReadyCheck: false,
    ...(isTLS ? { tls: {} } : {}),
  };
}

const connection = parseRedisUrl(REDIS_URL);

console.log(`🔗 Connecting to Redis at ${new URL(REDIS_URL.replace(/^rediss:\/\//, 'redis://')).hostname}${isTLS ? ' (TLS)' : ''}`);

// Queue for delivery jobs
export const messageQueue = new Queue('message-delivery', { connection });

interface DeliveryJob {
  logId: string;
  customerId: string;
  channel: string;
  content: string;
  subject?: string;
  campaignId: string;
}

export function startWorker() {
  const worker = new Worker<DeliveryJob>(
    'message-delivery',
    async (job: Job<DeliveryJob>) => {
      const { logId, channel } = job.data;
      console.log(`📬 Processing message ${logId} via ${channel}`);
      await simulateDelivery(job.data);
    },
    {
      connection,
      concurrency: 10, // Process 10 messages simultaneously
    },
  );

  worker.on('completed', (job) => {
    console.log(`✅ Message ${job.data.logId} processing complete`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Message ${job?.data?.logId} failed:`, err.message);
  });

  console.log('🔄 BullMQ worker started (concurrency: 10)');
  return worker;
}
