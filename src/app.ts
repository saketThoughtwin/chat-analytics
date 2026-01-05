import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from "./config/swagger"
import authRoutes from "@routes/auth.routes"
import profileRoutes from "@routes/profile.routes";
import chatRoutes from "@routes/chat.routes";
import analyticsRoutes from "@routes/analytics.routes";
const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api',authRoutes);
app.use('/api', profileRoutes);
app.use('/api',chatRoutes);
app.use('/api', analyticsRoutes);
app.get('/', (_, res) => res.send('Chat & Analytics API Running'));

export default app;
