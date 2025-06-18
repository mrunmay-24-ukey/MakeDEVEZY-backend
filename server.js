const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['GITHUB_TOKEN', 'GEMINI_API_KEY', 'MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

//routes initailization 
const snippetRoutes = require('./routes/snippetRoutes');
const envVariableRoutes = require('./routes/envVariableRoutes');
const docRoutes = require('./routes/documentationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const diagramRoutes = require('./routes/diagramRoutes');
const authRoutes = require('./routes/authRoutes');

const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const axios = require('axios');

connectDB();

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = socketIo(server, { cors: { origin: '*' } }); // Attach Socket.io to the server

// Configure CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'https://makedevezy.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/snippets', snippetRoutes);
app.use('/api/env', envVariableRoutes);
app.use('/api/documentation', docRoutes);
app.use('/api/ai' , aiRoutes);
app.use('/api/diagram', diagramRoutes);

// Socket.io for real-time collaboration
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  let currentRoom = null;
  let currentUser = null;

  socket.on('join', ({ roomId, userName }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom)));
    }

    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    rooms.get(roomId).add(userName);

    io.to(roomId).emit('userJoined', Array.from(rooms.get(currentRoom)));
    console.log('User joined the room:', roomId);
  });

  socket.on('codeChange', ({ roomId, code }) => {
    socket.to(roomId).emit('codeUpdate', code);
  });

  socket.on('leaveRoom', () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom)));

      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    }
  });

  socket.on('typing', ({ roomId, userName }) => {
    socket.to(roomId).emit('userTyping', userName);
  });

  socket.on('languageChange', ({ roomId, language }) => {
    io.to(roomId).emit('languageUpdate', language);
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit('userJoined', Array.from(rooms.get(currentRoom)));
    }
    console.log('User disconnected');
  });

  socket.on('compileCode' , async ({code , roomId , language , version}) => {
    if(rooms.has(roomId)){
      const room = rooms.get(roomId);
      const response = await axios.post('https://emkc.org/api/v2/piston/execute' , {
        language,
        version,
        files:[
          {
            content : code ,

          }
        ]
      })

      room.output = response.data.run.output;
      io.to(roomId).emit('codeResponse' , response.data)
    }
  })

  socket.on('joinDocRoom', ({ roomId, userName }) => {
    socket.join(`doc_${roomId}`);
    if (!rooms.has(`doc_${roomId}`)) {
      rooms.set(`doc_${roomId}`, {
        users: new Set(),
        content: '',
        repoFiles: [],
        selectedFiles: [],
        repoUrl: '',
        fileContent: null
      });
    }
    const room = rooms.get(`doc_${roomId}`);
    room.users.add(userName);
    
    // Send current room state to the newly joined user
    socket.emit('syncRoomState', {
      users: Array.from(room.users),
      content: room.content,
      repoFiles: room.repoFiles,
      selectedFiles: room.selectedFiles,
      repoUrl: room.repoUrl,
      fileContent: room.fileContent
    });
    
    io.to(`doc_${roomId}`).emit('docUsersUpdate', Array.from(room.users));
  });

  socket.on('leaveDocRoom', ({ roomId, userName }) => {
    if (rooms.has(`doc_${roomId}`)) {
      rooms.get(`doc_${roomId}`).users.delete(userName);
      socket.leave(`doc_${roomId}`);
      io.to(`doc_${roomId}`).emit('docUsersUpdate', Array.from(rooms.get(`doc_${roomId}`).users));
    }
  });

  socket.on('docContentChange', ({ roomId, content, userName }) => {
    if (rooms.has(`doc_${roomId}`)) {
      rooms.get(`doc_${roomId}`).content = content;
      socket.to(`doc_${roomId}`).emit('docContentUpdate', { content, userName });
    }
  });

  socket.on('docUserTyping', ({ roomId, userName }) => {
    socket.to(`doc_${roomId}`).emit('docUserTyping', userName);
  });

  socket.on('repoFetched', ({ roomId, files, repoUrl }) => {
    if (rooms.has(`doc_${roomId}`)) {
      const room = rooms.get(`doc_${roomId}`);
      room.repoFiles = files;
      room.repoUrl = repoUrl;
      socket.to(`doc_${roomId}`).emit('repoUpdate', { files, repoUrl });
    }
  });

  socket.on('filesSelected', ({ roomId, selectedFiles }) => {
    if (rooms.has(`doc_${roomId}`)) {
      const room = rooms.get(`doc_${roomId}`);
      room.selectedFiles = selectedFiles;
      socket.to(`doc_${roomId}`).emit('selectedFilesUpdate', selectedFiles);
    }
  });

  socket.on('fileContentFetched', ({ roomId, fileContent }) => {
    if (rooms.has(`doc_${roomId}`)) {
      const room = rooms.get(`doc_${roomId}`);
      room.fileContent = fileContent;
      socket.to(`doc_${roomId}`).emit('fileContentUpdate', fileContent);
    }
  });

  socket.on('documentationGenerated', ({ roomId, documentation }) => {
    if (rooms.has(`doc_${roomId}`)) {
      const room = rooms.get(`doc_${roomId}`);
      room.content = documentation;
      socket.to(`doc_${roomId}`).emit('documentationUpdate', documentation);
    }
  });

});

// Define PORT
const PORT = process.env.PORT || 6000;

// Serve Frontend from `frontend/dist`
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
/* 
app.use(express.static(frontendPath)); */

/* app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
}); */

app.get('/' , {message : 'Are you lost baby gurl?'})

// Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
