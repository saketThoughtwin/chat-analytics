import "dotenv/config";
import mongoose from "mongoose";
import http from "http";
import app from "./app";
import "@config/redis";
import { initSocketServer } from "@realtime/socket.server";

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("MongoDB Connected"));

const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, () => console.log(`Server running on ${PORT}`));
