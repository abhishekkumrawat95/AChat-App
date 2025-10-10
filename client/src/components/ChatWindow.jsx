import React, { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, writeBatch, setDoc } from "firebase/firestore";
import './ChatWindow.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
};

export default function ChatWindow({ user, chatWith, socket, onBack }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!chatWith) return;

    const roomName = [user.email, chatWith.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [chatWith, user.email]);

  useEffect(() => {
    if (!chatWith || messages.length === 0) return;

    const roomName = [user.email, chatWith.email].sort().join("_");
    const unreadMessages = messages.filter(msg => msg.user !== user.email && msg.status !== 'seen');

    if (unreadMessages.length > 0) {
      const batch = writeBatch(db);
      unreadMessages.forEach(msg => {
        const msgRef = doc(db, "chats", roomName, "messages", msg.id);
        batch.update(msgRef, { status: 'seen' });
      });
      batch.commit();
    }
  }, [messages, chatWith, user.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !chatWith) return;
    
    const roomName = [user.email, chatWith.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");

    await addDoc(messagesRef, {
      text: message,
      user: user.email,
      name: user.name,
      timestamp: serverTimestamp(),
      status: 'sent',
    });

    const chatDocRef = doc(db, "chats", roomName);
    await setDoc(chatDocRef, {
        participants: [user.email, chatWith.email],
        lastMessage: message,
        lastMessageTimestamp: serverTimestamp()
      }, { merge: true });

    socket.emit("send_message", {
      room: roomName,
      user: user.email,
      name: user.name,
    });

    setMessage("");
  };

  return (
    <>
      <header className="chat-header">
        <button className="back-button" onClick={onBack}>←</button>
        <div className="chat-header-info">
          <h3>{chatWith.name}</h3>
          <span>(@{chatWith.username})</span>
        </div>
      </header>
      <div className="message-container">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.user === user.email ? 'sent' : 'received'}`}>
            {/* The sender name div has been removed from here */}
            <p className="message-text">{msg.text}</p>
            <div className="message-meta">
              <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
              {msg.user === user.email && (
                <span className={`status-ticks ${msg.status}`}>
                  ✓{msg.status === 'seen' && '✓'}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>
      <div className="input-container">
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => { if (e.key === "Enter") sendMessage(); }}
        />
        <button onClick={sendMessage} className="send-button">Send</button>
      </div>
    </>
  );
}