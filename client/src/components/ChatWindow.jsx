import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, writeBatch, setDoc, deleteDoc } from "firebase/firestore";
import ContextMenu from "./ContextMenu";
import MessageBubble from "./MessageBubble";
import './ChatWindow.css';

const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

export default function ChatWindow({ user, chatWith, socket, onBack }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, selectedMessage: null });
  const messageContainerRef = useRef(null);

  useEffect(() => {
    if (!chatWith) return;
    const roomName = [user.email, chatWith.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      const unreadMessages = msgs.filter(msg => msg.user !== user.email && msg.status !== 'seen');
      if (unreadMessages.length > 0) {
        const batch = writeBatch(db);
        unreadMessages.forEach(msg => {
          const msgRef = doc(db, "chats", roomName, "messages", msg.id);
          batch.update(msgRef, { status: 'seen' });
        });
        batch.commit();
      }
    }, (error) => {
      console.error("Error in Message listener:", error);
    });

    return () => unsubscribe();
  }, [chatWith, user.email]);

  useLayoutEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = 0;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !chatWith) return;
    const roomName = [user.email, chatWith.email].sort().join("_");

    const chatDocRef = doc(db, "chats", roomName);
    const messagesRef = collection(db, "chats", roomName, "messages");

    const messageData = {
      text: message,
      user: user.email,
      name: user.name,
      timestamp: serverTimestamp(),
      status: 'sent',
    };

    if (replyingTo) {
      messageData.replyTo = {
        id: replyingTo.id,
        text: replyingTo.text,
        name: replyingTo.name,
      };
    }

    try {
      await setDoc(chatDocRef, {
          participants: [user.email, chatWith.email],
          lastMessage: message,
          lastMessageTimestamp: serverTimestamp()
        }, { merge: true });

      await addDoc(messagesRef, messageData);

      socket.emit("send_message", {
        to: chatWith.email,
        from: user.email,
        name: user.name,
      });
      
      setMessage("");
      setReplyingTo(null);

    } catch (error) {
      console.error("Message bhejne mein error aaya:", error);
    }
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
  };
  
  const handleLongPress = (e, msg) => {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      selectedMessage: msg,
      onClose: () => setMenu({ visible: false }),
    });
  };

  const handleDeleteMessage = async () => {
    if (!menu.selectedMessage) return;
    const roomName = [user.email, chatWith.email].sort().join("_");
    const msgRef = doc(db, "chats", roomName, "messages", menu.selectedMessage.id);
    await deleteDoc(msgRef);
  };
  
  const messageMenuOptions = [
    { label: "Reply", onClick: () => handleReply(menu.selectedMessage) },
    { label: "Delete", className: "destructive", onClick: handleDeleteMessage },
  ];

  return (
    <div className="chat-window-container">
      <ContextMenu menu={menu} options={messageMenuOptions} />
      <header className="chat-header">
        <button className="back-button" onClick={onBack}>←</button>
        <img src={chatWith.photoURL || defaultAvatar} alt="Profile" className="header-avatar" />
        <div className="chat-header-info">
          <h3>{chatWith.name}</h3>
          <span>@{chatWith.username}</span>
        </div>
      </header>
      
      <div ref={messageContainerRef} className="message-container">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            user={user}
            onReply={handleReply}
            onLongPress={handleLongPress}
          />
        ))}
      </div>
      
      {replyingTo && (
        <div className="reply-preview-container">
          <div className="reply-preview-content">
            <p className="reply-preview-user">
              Replying to <span className="reply-to-name">{replyingTo.name}</span>
            </p>
            <p className="reply-preview-text">{replyingTo.text}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="close-reply-btn">&times;</button>
        </div>
      )}

      <div className="input-container">
        {/* === YEH LINE THEEK KAR DI GAYI HAI === */}
        <input type="text" className="message-input" placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => { if (e.key === "Enter") sendMessage(); }}/>
        <button onClick={sendMessage} className="send-button">Send</button>
      </div>
    </div>
  );
}