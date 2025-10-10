import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { db } from "../firebase";
import { collection, query, where, getDocs, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";

const socket = io.connect("http://localhost:5000");

export default function ChatRoom({ user }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // State for the active chat's messages
  const [onlineUserEmails, setOnlineUserEmails] = useState([]);
  const [allUsersData, setAllUsersData] = useState([]); // State to hold ALL registered users
  const [searchUser, setSearchUser] = useState("");
  const [chatWith, setChatWith] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [unreadSenders, setUnreadSenders] = useState(new Set());
  const bottomRef = useRef(null);

  const styles = {
    messageContainer: { border: "1px solid #ccc", height: 300, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", backgroundColor: "#f0f0f0" },
    messageBubble: { maxWidth: "70%", padding: "8px 12px", borderRadius: "18px", marginBottom: "10px", wordWrap: "break-word" },
    sentBubble: { backgroundColor: "#007bff", color: "white", alignSelf: "flex-end" },
    receivedBubble: { backgroundColor: "#e9e9eb", color: "black", alignSelf: "flex-start" },
    messageUser: { fontWeight: "bold", fontSize: "0.8em", marginBottom: "4px" },
    onlineIndicator: { height: '10px', width: '10px', backgroundColor: 'limegreen', borderRadius: '50%', marginRight: '8px', display: 'inline-block' },
    offlineIndicator: { height: '10px', width: '10px', backgroundColor: 'lightgray', borderRadius: '50%', marginRight: '8px', display: 'inline-block' }
  };

  // Login via socket and get the list of who is currently online
  useEffect(() => {
    if (user) socket.emit("login", user.email);
    socket.on("update_users", (emails) => {
      setOnlineUserEmails(emails);
    });
    return () => socket.off("update_users");
  }, [user]);

  // NEW: Fetch ALL registered users from Firestore once when the component loads
  useEffect(() => {
    if (user) {
      const fetchAllUsers = async () => {
        const usersRef = collection(db, "users");
        // Get all users except for the currently logged-in one
        const q = query(usersRef, where("email", "!=", user.email));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => doc.data());
        setAllUsersData(users);
      };
      fetchAllUsers();
    }
  }, [user]);

  // When a chat is selected, determine the unique room name
  useEffect(() => {
    if (chatWith) {
      const room = [user.email, chatWith.email].sort().join("_");
      setRoomName(room);
    }
  }, [chatWith, user]);

  // NEW: Listen for real-time messages from Firestore for the selected chat room
  useEffect(() => {
    if (!roomName) return;

    const messagesRef = collection(db, "chats", roomName, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    // onSnapshot creates a real-time listener that updates automatically
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => doc.data());
      setMessages(msgs);
    });

    // Clean up the listener when the chat room changes
    return () => unsubscribe();
  }, [roomName]);

  // Handles incoming new message notifications
 useEffect(() => {
  // Destructure both 'from' and 'name' from the notification data
  const handleNotification = ({ from, name }) => { 
    if (!chatWith || from !== chatWith.email) {
      setUnreadSenders((prev) => new Set(prev).add(from));
    }
  };
  socket.on("new_message_notification", handleNotification);
  return () => socket.off("new_message_notification", handleNotification);
}, [chatWith]);

  // Scroll to the bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // NEW: sendMessage now writes the chat message to Firestore
  const sendMessage = async () => {
    if (!message.trim() || !roomName) return;

    const messagesRef = collection(db, "chats", roomName, "messages");
    
    // Add the new message to the Firestore database
    await addDoc(messagesRef, {
      text: message,
      user: user.email,
      name: user.name,
      timestamp: serverTimestamp()
    });

    // Also emit a socket event so the other user gets a real-time notification dot
    socket.emit("send_message", {
      room: roomName,
      user: user.email,
      name: user.name
    });

    setMessage("");
  };
  
  const handleStartChat = (selectedUser) => {
    setChatWith(selectedUser);
    setUnreadSenders((prev) => {
      const newSet = new Set(prev);
      newSet.delete(selectedUser.email);
      return newSet;
    });
  };

  return (
    <div style={{ maxWidth: 500, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h2>AChat</h2>
      <p>Welcome, {user.name}!</p>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Search by username..."
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          style={{ width: "100%", boxSizing: 'border-box', marginBottom: 5, padding: 8 }}
        />
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {/* Display the full list of users from Firestore */}
          {allUsersData
            .filter((u) => u.username.toLowerCase().includes(searchUser.toLowerCase()))
            .map((u) => (
              <li key={u.uid} style={{ display: 'flex', alignItems: 'center', marginBottom: 5, padding: 5, background: '#f9f9f9', borderRadius: 4 }}>
                {/* Show a green or gray dot for online/offline status */}
                <span style={onlineUserEmails.includes(u.email) ? styles.onlineIndicator : styles.offlineIndicator}></span>
                <span style={{ flexGrow: 1 }}>{u.name} ({u.username})</span>
                {unreadSenders.has(u.email) && <span style={{ marginLeft: 'auto', marginRight: '8px' }}>🔴</span>}
                <button onClick={() => handleStartChat(u)}>Chat</button>
              </li>
            ))}
        </ul>
      </div>

      {chatWith ? (
        <>
          <h3>Chatting with: {chatWith.name}</h3>
          <div style={styles.messageContainer}>
            {/* Display messages for the current chat from the 'messages' state */}
            {messages.map((msg, i) => (
              <div key={i} style={{ ...styles.messageBubble, ...(msg.user === user.email ? styles.sentBubble : styles.receivedBubble) }}>
                <div style={styles.messageUser}>
                  {msg.user === user.email ? "You" : msg.name}
                </div>
                {msg.text}
              </div>
            ))}
            <div ref={bottomRef}></div>
          </div>
          <div style={{ display: 'flex', marginTop: 10 }}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." style={{ flex: 1, padding: 8, marginRight: 5 }} onKeyPress={(e) => { if (e.key === "Enter") sendMessage(); }} />
            <button onClick={sendMessage} style={{ padding: "8px 12px" }}>Send</button>
          </div>
        </>
      ) : (
        <p>Select a user from the list to start chatting.</p>
      )}
    </div>
  );
}