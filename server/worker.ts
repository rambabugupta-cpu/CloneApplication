import { Worker } from 'bullmq';

const connection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined as any;

new Worker('pdfQueue', async (job) => {
  console.log('[worker] pdf job', job.id, job.name, job.data);
}, { connection });

new Worker('notificationQueue', async (job) => {
  console.log('[worker] notification job', job.id, job.name, job.data);
}, { connection });

console.log('[worker] started');
