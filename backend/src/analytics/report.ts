import 'dotenv/config';
import mongoose from 'mongoose';
import { DailyMetric } from './analytics.js';

const days = Number(process.argv[2] || 30);
if (!Number.isInteger(days) || days < 1 || days > 400) throw new Error('Choose between 1 and 400 days.');
if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in your local environment to read aggregate metrics.');
try {
  await mongoose.connect(process.env.MONGO_URI);
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = await DailyMetric.aggregate([
    { $match: { day: { $gte: from } } },
    { $group: { _id: { landing: '$landing', source: '$source', event: '$event' }, count: { $sum: '$count' } } },
    { $sort: { '_id.landing': 1, '_id.source': 1, '_id.event': 1 } },
  ]);
  console.log(JSON.stringify({ from, note: 'Visits are document loads, not unique people. Signups are client-observed successes; compare with registration totals. No personal data is included.', rows }, null, 2));
} finally { await mongoose.disconnect(); }
