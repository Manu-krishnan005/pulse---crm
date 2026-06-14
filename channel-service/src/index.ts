import express from 'express';
import { messageQueue, startWorker } from './queue';

const app = express();
app.use(express.json({ limit: '10mb' }));

// CORS — open for all origins (this is a server-to-server microservice)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'channel-service', timestamp: new Date().toISOString() });
});

// Send messages endpoint
app.post('/send', async (req, res) => {
  const { campaignId, messages } = req.body;

  if (!campaignId || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'campaignId and messages[] required' });
  }

  console.log(`📨 Queuing ${messages.length} messages for campaign ${campaignId}`);

  // Add each message to BullMQ queue
  const jobs = messages.map((msg: {
    logId: string;
    customerId: string;
    channel: string;
    content: string;
    subject?: string;
  }) =>
    messageQueue.add('deliver-message', {
      logId: msg.logId,
      customerId: msg.customerId,
      channel: msg.channel,
      content: msg.content,
      subject: msg.subject,
      campaignId,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      // Stagger jobs to simulate realistic traffic
      delay: Math.floor(Math.random() * 2000),
    }),
  );

  await Promise.all(jobs);

  return res.status(202).json({
    accepted: messages.length,
    message: `${messages.length} messages queued for delivery`,
  });
});

const PORT = process.env.PORT || 3001;

// Start BullMQ worker
startWorker();

app.listen(PORT, () => {
  console.log(`\n🚀 Channel Service running on http://localhost:${PORT}`);
  console.log('   📮 POST /send — queue messages');
  console.log('   ❤️  GET /health — health check\n');
});

export default app;
