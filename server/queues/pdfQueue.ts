import { Queue } from 'bullmq';

const connection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : undefined as any;
export const pdfQueue = new Queue('pdfQueue', { connection });
