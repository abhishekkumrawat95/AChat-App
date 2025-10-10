const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://your-app-name.vercel.app"], // Apna Vercel URL yahan daalein
    methods: ["GET", "POST"],
  },
});

const getOnlineUsers = () => {
  const onlineUsers = [];
  for (let [id, socket] of io.sockets.sockets) {
    if (socket.username) {
      onlineUsers.push(socket.username);
    }
  }
  return onlineUsers;
};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("login", (username) => {
    socket.username = username;
    io.emit("update_users", getOnlineUsers());
    console.log(`${username} has logged in.`);
  });

  socket.on("send_message", (data) => {
    const recipientUsername = data.room.split('_').find(u => u !== data.user);
    let recipientSocket = null;
    for (let [id, sock] of io.sockets.sockets) {
      if (sock.username === recipientUsername) {
        recipientSocket = sock;
        break;
      }
    }
    if (recipientSocket) {
      console.log(`Relaying notification from ${data.user} to ${recipientUsername}`);
      recipientSocket.emit("new_message_notification", { from: data.user, name: data.name });
    } else {
      console.log(`FAILED: Could not find online user ${recipientUsername}.`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.username} has disconnected.`);
    io.emit("update_users", getOnlineUsers());
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});