import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { simulateDelivery } from './simulator';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis connection — supports local (redis://) and Upstash TLS (rediss://)
function createRedisConnection() {
  const isTLS = REDIS_URL.startsWith('rediss://');

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    ...(isTLS ? { tls: {} } : {}),
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.error('❌ Redis error:', err.message));

  return redis;
}

export const connection = createRedisConnection();

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
