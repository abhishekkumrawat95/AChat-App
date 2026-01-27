const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const admin = require("firebase-admin");

// Initialize Firebase Admin
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  try {
    serviceAccount = require("../server/serviceAccountKey.json");
  } catch (e) {
    console.error("Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT environment variable.");
    process.exit(1);
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const app = express();
app.use(cors());

// Allowed origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://akchatcc.vercel.app"
];

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

const io = new Server({
  cors: {
    origin: allowedOrigins,
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

  socket.on("send_message", async (data) => {
    const recipientUsername = data.to;
    let recipientSocket = null;
    for (let [id, sock] of io.sockets.sockets) {
      if (sock.username === recipientUsername) {
        recipientSocket = sock;
        break;
      }
    }
    
    if (recipientSocket) {
      console.log(`Relaying real-time notification from ${data.from} to ${recipientUsername}`);
      recipientSocket.emit("new_message_notification", { from: data.from, name: data.name });
    } else {
      console.log(`User ${recipientUsername} is offline. Attempting to send push notification.`);
      try {
        const db = admin.firestore();
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', recipientUsername).get();

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          if (userDoc.fcmToken) {
            const payload = {
              notification: {
                title: `New message from ${data.name}`,
                body: "Click to open the chat and read.",
                icon: "/logo.png"
              },
              webpush: {
                fcm_options: {
                  link: "https://akchatcc.vercel.app"
                }
              }
            };
            await admin.messaging().sendToDevice(userDoc.fcmToken, payload);
            console.log("Push notification sent successfully.");
          } else {
            console.log(`User ${recipientUsername} does not have an FCM token.`);
          }
        } else {
          console.log(`User ${recipientUsername} not found in Firestore.`);
        }
      } catch (error) {
        console.error("Error sending push notification:", error);
      }
    }
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      console.log(`User ${socket.username} has disconnected.`);
      io.emit("update_users", getOnlineUsers());
    } else {
      console.log("A user disconnected:", socket.id);
    }
  });

  // Typing indicator events
  socket.on("typing", (data) => {
    for (let [id, sock] of io.sockets.sockets) {
      if (sock.username === data.to) {
        sock.emit("typing", data);
        break;
      }
    }
  });

  socket.on("stop_typing", (data) => {
    for (let [id, sock] of io.sockets.sockets) {
      if (sock.username === data.to) {
        sock.emit("stop_typing", data);
        break;
      }
    }
  });

  // User online/offline status
  socket.on("user_online", (data) => {
    socket.user_email = data.email;
    socket.user_name = data.name;
    io.emit("user_online", { email: data.email, name: data.name });
    console.log(`${data.email} is now online`);
  });

  socket.on("user_offline", (data) => {
    io.emit("user_offline", { email: data.email });
    console.log(`${data.email} is now offline`);
  });

  // Handle reaction events
  socket.on("add_reaction", (data) => {
    io.emit("reaction_updated", {
      messageId: data.messageId,
      roomName: data.roomName,
      emoji: data.emoji,
      email: data.email,
      name: data.name,
      action: 'add'
    });
    console.log(`Reaction added: ${data.emoji} by ${data.email} on message ${data.messageId}`);
  });

  socket.on("remove_reaction", (data) => {
    io.emit("reaction_updated", {
      messageId: data.messageId,
      roomName: data.roomName,
      emoji: data.emoji,
      email: data.email,
      action: 'remove'
    });
    console.log(`Reaction removed: ${data.emoji} by ${data.email} on message ${data.messageId}`);
  });
});

app.get("/", (req, res) => {
  res.status(200).send("AChat Socket.IO Server is running! ✅");
});

module.exports = { io, app };
