# Chat Analytics

A production-ready real-time chat application with comprehensive analytics, built with Node.js, Express, Socket.IO, MongoDB, and Redis.

## 🚀 Features

### Real-Time Chat
- **Direct Messaging**: One-on-one chat with deterministic room creation
- **WebSocket Communication**: Real-time message delivery using Socket.IO
- **Typing Indicators**: Live typing status updates
- **Read Receipts**: Message delivery and read status tracking
- **Message Persistence**: All messages saved to MongoDB
- **Message Pagination**: Efficient loading of chat history
- **Unread Message Counts**: Track unread messages per room and globally

### Analytics & Monitoring
- **User Message Counts**: Track messages sent per user with Redis caching
- **Active Users Tracking**: Monitor active users in each chat room
- **Room Statistics**: Comprehensive stats for chat rooms
- **User Statistics**: Detailed user engagement metrics
- **System Dashboard**: Overview of system-wide analytics

### Security & Performance
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Per-user rate limiting for message sending
- **Redis Caching**: High-performance caching for analytics
- **Helmet.js**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing

### Developer Experience
- **Swagger Documentation**: Interactive API documentation at `/api-docs`
- **TypeScript**: Full type safety and better developer experience
- **Path Aliases**: Clean imports with `@` prefix
- **Hot Reload**: Development server with nodemon

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Redis (v6 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/saketThoughtwin/chat-analytics.git
   cd chat-analytics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/chat-analytics
   REDIS_HOST=localhost
   REDIS_PORT=6379
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   ```

4. **Start MongoDB and Redis**
   ```bash
   # MongoDB
   mongod
   
   # Redis
   redis-server
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

The server will start on `http://localhost:5000` (or your configured PORT).

## 📚 API Documentation

Once the server is running, access the interactive Swagger documentation at:
```
http://localhost:5000/api-docs
```

### Main API Endpoints

#### Authentication
- `POST /api/register` - Register a new user
- `POST /api/login` - Login and receive JWT token

#### Chat Rooms
- `POST /api/chat/rooms` - Create or get a direct chat room
- `GET /api/chat/rooms` - Get all user's chat rooms
- `GET /api/chat/rooms/:roomId` - Get room details

#### Messaging
- `POST /api/chat/rooms/:roomId/messages` - Send a message
- `GET /api/chat/rooms/:roomId/messages` - Get messages with pagination

#### Read Receipts
- `PUT /api/chat/messages/read` - Mark specific messages as read
- `PUT /api/chat/rooms/:roomId/read` - Mark all room messages as read
- `GET /api/chat/unread` - Get total unread count
- `GET /api/chat/rooms/:roomId/unread` - Get room unread count

#### Analytics
- `GET /api/analytics/dashboard` - System analytics dashboard
- `GET /api/analytics/chat/:roomId/active` - Active users in room
- `GET /api/analytics/users/:userId/messages` - User message count
- `GET /api/analytics/rooms/:roomId/stats` - Room statistics
- `GET /api/analytics/users/:userId/stats` - User statistics

## 🔌 WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `roomId: string` | Join a chat room |
| `leave_room` | `roomId: string` | Leave a chat room |
| `typing` | `{ roomId: string }` | Indicate user is typing |
| `stop_typing` | `{ roomId: string }` | Stop typing indicator |
| `send_message` | `{ roomId: string, message: string }` | Send a message |
| `message_delivered` | `{ messageId: string }` | Acknowledge message delivery |
| `messages_read` | `{ roomId: string, messageIds: string[] }` | Mark messages as read |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `user_online` | `{ userId: string }` | User came online |
| `user_offline` | `{ userId: string }` | User went offline |
| `user_joined_room` | `{ userId: string, roomId: string }` | User joined room |
| `user_left_room` | `{ userId: string, roomId: string }` | User left room |
| `room_active_count` | `{ roomId: string, count: number }` | Active users count |
| `typing` | `{ from: string, roomId: string }` | User is typing |
| `stop_typing` | `{ from: string, roomId: string }` | User stopped typing |
| `receive_message` | `Message object` | New message received |
| `message_sent` | `{ messageId: string, timestamp: Date }` | Message sent confirmation |
| `message_delivered` | `{ messageId: string }` | Message delivered |
| `messages_read` | `{ messageIds: string[], readBy: string }` | Messages read by user |
| `message_error` | `{ error: string }` | Error sending message |

## 🔐 Authentication

All API endpoints (except registration and login) require JWT authentication.

**Include the token in the Authorization header:**
```
Authorization: Bearer <your_jwt_token>
```

**For WebSocket connections:**
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

## 🏗️ Project Structure

```
chat-analytics/
├── src/
│   ├── analytics/           # Analytics controllers and services
│   ├── config/              # Configuration files (Redis, Swagger)
│   ├── middlewares/         # Auth and rate limiting middleware
│   ├── modules/
│   │   ├── chat/           # Chat models, repositories, services
│   │   └── users/          # User models, repositories, services
│   ├── realtime/           # Socket.IO server setup
│   ├── routes/             # API route definitions
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions (JWT, room ID generator)
│   ├── app.ts              # Express app configuration
│   └── server.ts           # Server entry point
├── .env                    # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Testing

Connect to the WebSocket server using a client:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});

// Join a room
socket.emit('join_room', 'room_id_here');

// Send a message
socket.emit('send_message', {
  roomId: 'room_id_here',
  message: 'Hello, World!'
});

// Listen for messages
socket.on('receive_message', (message) => {
  console.log('New message:', message);
});
```

## 🔧 Technologies Used

- **Backend Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **Database**: MongoDB with Mongoose ODM
- **Caching**: Redis with ioredis
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet.js, bcrypt
- **API Documentation**: Swagger (swagger-jsdoc, swagger-ui-express)
- **Language**: TypeScript
- **Development**: Nodemon, ts-node

## 📊 Key Features Explained

### Deterministic Room Creation
For 1-on-1 chats, room IDs are generated deterministically by sorting user IDs alphabetically and hashing them. This ensures the same room is always used for the same pair of users.

### Message Pagination
Messages are paginated to improve performance. The API supports `page` and `limit` query parameters for efficient data loading.

### Redis Caching
Analytics data (message counts, active users) are cached in Redis for fast retrieval and reduced database load.

### Rate Limiting
Per-user rate limiting prevents spam and ensures fair resource usage. Configured via middleware.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

ISC

## 👤 Author

GitHub: [@saketThoughtwin](https://github.com/saketThoughtwin)

## 🐛 Issues

Report issues at: [GitHub Issues](https://github.com/saketThoughtwin/chat-analytics/issues)

## 📞 Support

For support, please open an issue in the GitHub repository.
