const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Helper function to get a fresh list of online users at any time
const getOnlineUsers = () => {
  const onlineUsers = [];
  // io.sockets.sockets is a Map of all connected sockets
  for (let [id, socket] of io.sockets.sockets) {
    if (socket.username) {
      onlineUsers.push(socket.username);
    }
  }
  return onlineUsers;
};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // When a user logs in, attach their username to the socket instance itself
  socket.on("login", (username) => {
    socket.username = username; // This is more reliable than a separate object
    io.emit("update_users", getOnlineUsers());
    console.log(`${username} has logged in.`);
  });

  socket.on("join_room", ({ room }) => {
    socket.join(room);
    console.log(`User ${socket.username} joined room: ${room}`);
  });

// This handler's only job is to relay a notification to the correct recipient.
socket.on("send_message", (data) => {
  // data contains { room, user, name } from the client
  const recipientUsername = data.room.split('_').find(u => u !== data.user);

  // Find the recipient's socket by iterating through all connected clients
  let recipientSocket = null;
  for (let [id, sock] of io.sockets.sockets) {
    if (sock.username === recipientUsername) {
      recipientSocket = sock;
      break;
    }
  }

  // If we found the recipient and they are online, send them a notification
  if (recipientSocket) {
    console.log(`Relaying notification from ${data.user} to ${recipientUsername}`);
    recipientSocket.emit("new_message_notification", { 
      from: data.user, // The sender's email
      name: data.name  // The sender's name
    });
  } else {
    console.log(`Could not find online user ${recipientUsername} to send notification.`);
  }
});

  socket.on("disconnect", () => {
    console.log(`User ${socket.username} has disconnected.`);
    // When a user disconnects, broadcast the new fresh list of users
    io.emit("update_users", getOnlineUsers());
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});