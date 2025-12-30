import 'dotenv/config';
import app from './app';
import mongoose from 'mongoose';
import { createClient } from 'redis';

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('MongoDB Connected'));

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().then(() => console.log('Redis Connected'));

app.listen(PORT, () => console.log(`Server running on ${PORT}`));
