const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const admin = require("firebase-admin"); // Ise add karein

// Firebase Admin SDK ko initialize karein
// Ensure you have the 'serviceAccountKey.json' file in this 'server' folder
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

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

  // 'send_message' event ko async banaayein
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
      // Agar user online hai, to sirf real-time notification bhejein
      console.log(`Relaying real-time notification from ${data.from} to ${recipientUsername}`);
      recipientSocket.emit("new_message_notification", { from: data.from, name: data.name });
    } else {
      // Agar user offline hai, to PUSH notification bhejein
      console.log(`User ${recipientUsername} is offline. Attempting to send push notification.`);
      try {
        const db = admin.firestore();
        const usersRef = db.collection('users');
        // Firestore mein recipient ke email se user ko dhoondein
        const querySnapshot = await usersRef.where('email', '==', recipientUsername).get();

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          // Check karein ki user ke paas fcmToken hai ya nahi
          if (userDoc.fcmToken) {
            const payload = {
              notification: {
                title: `New message from ${data.name}`,
                body: "Click to open the chat and read.",
                icon: "/logo.png" // Public folder se icon ka path
              },
              webpush: {
                fcm_options: {
                  link: "https://akchatcc.vercel.app" // App ka URL
                }
              }
            };
            // FCM token par notification bhejein
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
});

app.get("/", (req, res) => {
    res.status(200).send("AChat Server is up and running! ✅");
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});