# 💬 Chat Application - Backend

A robust, real-time chat application backend built with Node.js, Express, and WebSockets. This server provides RESTful APIs for user management, conversation handling, and message storage, along with real-time communication capabilities.

## 🚀 Features

- **User Authentication**: Secure JWT-based authentication system
- **Real-time Messaging**: WebSocket integration for instant message delivery
- **Conversation Management**: Create and manage multiple chat conversations
- **Media Upload**: Profile picture uploads with Cloudinary integration
- **Type Safety**: Built entirely with TypeScript
- **Password Security**: Bcrypt-based password hashing
- **RESTful API**: Clean, versioned API architecture

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (with Mongoose ODM)
- **Authentication**: JSON Web Tokens (JWT)
- **Real-time**: WebSockets (Socket.io)
- **File Upload**: Multer
- **Cloud Storage**: Cloudinary
- **Password Hashing**: Bcrypt

## 📁 Project Structure

```
backend/
├── src/
│   ├── controllers/          # Route controllers
│   │   ├── user.controller.ts
│   │   ├── conversation.controller.ts
│   │   └── message.controller.ts
│   ├── models/               # Database models
│   │   ├── user.model.ts
│   │   ├── conversation.model.ts
│   │   └── message.model.ts
│   ├── routes/               # API routes
│   │   └── v1/
│   ├── middleware/           # Custom middleware
│   │   ├── auth.ts
│   │   └── multer.middleware.ts
│   ├── config/               # Configuration files
│   │   ├── db/
│   │   │   └── connection.ts
│   │   └── jwt.ts
│   └── server.ts             # Entry point
└── package.json
```

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # CORS
   CLIENT_URL=http://localhost:5173
   ```

4. **Start the development server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/users/register` | Register a new user | ❌ |
| POST | `/api/v1/users/login` | Login user and get JWT | ❌ |

### User Profile

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/users/profile` | Get current user profile | ✅ |
| PUT | `/api/v1/users/profile` | Update user profile | ✅ |

### Conversations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/conversations` | Get all user conversations | ✅ |
| POST | `/api/v1/conversations` | Create new conversation | ✅ |

### Messages

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/messages/:conversationId` | Get messages for a conversation | ✅ |
| POST | `/api/v1/messages` | Send a new message | ✅ |

## 🔄 WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_chat` | `{ conversationId }` | Join a conversation room |
| `send_message` | `{ conversationId, message }` | Send a message |
| `typing` | `{ conversationId }` | User started typing |
| `stop_typing` | `{ conversationId }` | User stopped typing |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `connect` | - | Connection established |
| `disconnect` | - | Connection closed |
| `receive_message` | `{ message }` | New message received |
| `typing_broadcast` | `{ userId }` | User is typing |
| `user_online` | `{ userId }` | User came online |
| `user_offline` | `{ userId }` | User went offline |

## 🗄️ Database Models

### User Model
```typescript
{
  username: string,
  email: string,
  password: string (hashed),
  profilePicture?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Model
```typescript
{
  participants: [userId],
  lastMessage?: messageId,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```typescript
{
  conversationId: ObjectId,
  sender: userId,
  content: string,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔐 Authentication Flow

1. User registers with email and password
2. Password is hashed using bcrypt
3. User logs in with credentials
4. Server validates and returns JWT token
5. Client includes JWT in Authorization header for protected routes
6. Middleware validates JWT for each protected request

## 🚦 Scripts

```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm start            # Start production server
npm run lint         # Run linter
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Your Name - [Your GitHub Profile]

---

Built with ❤️ using Node.js and TypeScript
