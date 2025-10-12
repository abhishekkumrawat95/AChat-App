const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://akchatcc.vercel.app"],
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

  // === MODIFIED: Use direct recipient info ===
  socket.on("send_message", (data) => {
    // अब हम सीधे 'data.to' से प्राप्तकर्ता का नाम लेते हैं
    const recipientUsername = data.to;
    
    let recipientSocket = null;
    for (let [id, sock] of io.sockets.sockets) {
      if (sock.username === recipientUsername) {
        recipientSocket = sock;
        break;
      }
    }
    
    if (recipientSocket) {
      console.log(`Relaying notification from ${data.from} to ${recipientUsername}`);
      // नोटिफिकेशन भेजने वाले (data.from) के बारे में है
      recipientSocket.emit("new_message_notification", { from: data.from, name: data.name });
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