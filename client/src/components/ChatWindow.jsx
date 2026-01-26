import React, { useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, writeBatch, setDoc, deleteDoc, updateDoc, getDocs } from "firebase/firestore";
import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import EmojiPicker from 'emoji-picker-react';
import ContextMenu from "./ContextMenu";
import MessageBubble from "./MessageBubble";
import './ChatWindow.css';

const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

const formatLastSeen = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
};

export default function ChatWindow({ user, chatWith, socket, onBack, messageSound }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, selectedMessage: null });
  const [showProfilePicture, setShowProfilePicture] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageContainerRef = useRef(null);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!messageSound) return;
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log("Audio not available");
    }
  }, [messageSound]);

  useEffect(() => {
    if (!chatWith) return;
    
    // Clear previous messages when switching to a new chat
    setMessages([]);
    
    const roomName = [user.email, chatWith.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Messages loaded:", msgs);
      
      // Play sound if there are new incoming messages
      const newUnreadMessages = msgs.filter(msg => msg.user !== user.email && msg.status !== 'seen');
      if (newUnreadMessages.length > 0) {
        playNotificationSound();
      }
      
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
  }, [chatWith, user.email, playNotificationSound]);

  // Listen for typing indicators
  useEffect(() => {
    socket.on("typing", (data) => {
      if (data.from === chatWith?.email) {
        setIsTyping(true);
      }
    });

    socket.on("stop_typing", (data) => {
      if (data.from === chatWith?.email) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [socket, chatWith]);

  // Listen for online status updates
  useEffect(() => {
    socket.on("user_online", (data) => {
      if (data.email === chatWith?.email) {
        setIsOnline(true);
        setLastSeen(null);
      }
    });

    socket.on("user_offline", (data) => {
      if (data.email === chatWith?.email) {
        setIsOnline(false);
      }
    });

    return () => {
      socket.off("user_online");
      socket.off("user_offline");
    };
  }, [socket, chatWith?.email]);

  // Listen for reaction updates from other users
  useEffect(() => {
    const handleReactionUpdate = (data) => {
      if (data.roomName === [user.email, chatWith?.email].sort().join("_")) {
        // Reaction update received, messages will be updated via Firestore listener
        console.log(`Reaction ${data.action}ed by ${data.name}: ${data.emoji}`);
      }
    };

    socket.on("reaction_updated", handleReactionUpdate);

    return () => {
      socket.off("reaction_updated");
    };
  }, [socket, user.email, chatWith?.email]);

  // Fetch last seen time
  useEffect(() => {
    if (!chatWith) return;
    
    const userRef = doc(db, "users", chatWith.uid || chatWith.email);
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const lastSeenTime = docSnapshot.data().lastSeen;
        setLastSeen(lastSeenTime);
      }
    }, () => {});
    
    return () => unsubscribe();
  }, [chatWith]);

  // Filter messages based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(msg =>
        msg.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, searchQuery]);

  useLayoutEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = 0;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || !chatWith) return;
    
    // Stop typing indicator
    socket.emit("stop_typing", {
      to: chatWith.email,
      from: user.email,
    });
    
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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const sendImageMessage = async () => {
    if (!selectedImage) return;
    setUploadingImage(true);
    try {
      const roomName = [user.email, chatWith.email].sort().join("_");
      const storageRef = ref(storage, `chats/${roomName}/${Date.now()}_${selectedImage.name}`);
      
      console.log("Starting image upload...", { roomName, fileName: selectedImage.name, size: selectedImage.size });
      
      // Upload image
      const snapshot = await uploadBytes(storageRef, selectedImage);
      console.log("Image uploaded successfully:", snapshot.ref.fullPath);
      
      const imageURL = await getDownloadURL(snapshot.ref);
      console.log("Image URL obtained:", imageURL);

      // Send message with image
      const chatDocRef = doc(db, "chats", roomName);
      const messagesRef = collection(db, "chats", roomName, "messages");

      const messageData = {
        text: message || "[Image]",
        user: user.email,
        name: user.name,
        timestamp: serverTimestamp(),
        status: 'sent',
        imageURL: imageURL,
        imageFileName: selectedImage.name,
      };

      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text,
          name: replyingTo.name,
        };
      }

      await setDoc(chatDocRef, {
        participants: [user.email, chatWith.email],
        lastMessage: message || "[Image]",
        lastMessageTimestamp: serverTimestamp()
      }, { merge: true });

      await addDoc(messagesRef, messageData);

      socket.emit("send_message", {
        to: chatWith.email,
        from: user.email,
        name: user.name,
      });

      setMessage("");
      setSelectedImage(null);
      setReplyingTo(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      alert("Image sent successfully!");
    } catch (error) {
      console.error("Image upload error:", error.code, error.message);
      console.error("Full error details:", error);
      
      if (error.code === 'storage/unauthorized') {
        alert("Permission denied. Check Firebase Storage Rules.");
      } else if (error.code === 'storage/unauthenticated') {
        alert("You must be logged in to upload images.");
      } else if (error.code === 'storage/unknown') {
        alert("Upload failed. Check your internet connection.");
      } else {
        alert(`Failed to upload image: ${error.message}`);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleReply = (msg) => {
    setReplyingTo(msg);
  };

  const handleAddReaction = async (messageId, emoji, roomName) => {
    if (!roomName) {
      roomName = [user.email, chatWith.email].sort().join("_");
    }
    const msgRef = doc(db, "chats", roomName, "messages", messageId);
    
    try {
      const messageSnapshot = await getDocs(collection(db, "chats", roomName, "messages"));
      const messageDoc = messageSnapshot.docs.find(doc => doc.id === messageId);
      
      if (messageDoc) {
        const reactions = messageDoc.data().reactions || {};
        const userEmail = user.email;
        
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        
        // Toggle reaction (remove if already added, add if not)
        const userIndex = reactions[emoji].indexOf(userEmail);
        let action = 'add';
        
        if (userIndex > -1) {
          reactions[emoji].splice(userIndex, 1);
          action = 'remove';
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji].push(userEmail);
        }
        
        await updateDoc(msgRef, { reactions });
        
        // Broadcast reaction to other users via Socket.IO
        socket.emit(action === 'add' ? 'add_reaction' : 'remove_reaction', {
          messageId,
          roomName,
          emoji,
          email: user.email,
          name: user.name,
          action
        });
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;
    const roomName = [user.email, chatWith.email].sort().join("_");
    const msgRef = doc(db, "chats", roomName, "messages", editingMessage.id);
    await updateDoc(msgRef, {
      text: editText,
      editedAt: serverTimestamp(),
    });
    setEditingMessage(null);
    setEditText("");
    setMenu({ visible: false });
  };

  const handleStartEdit = (msg) => {
    if (msg.user === user.email) {
      setEditingMessage(msg);
      setEditText(msg.text);
      setMenu({ visible: false });
    }
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
    ...(menu.selectedMessage?.user === user.email ? [
      { label: "Edit", onClick: () => handleStartEdit(menu.selectedMessage) },
    ] : []),
    { label: "Delete", className: "destructive", onClick: handleDeleteMessage },
  ];

  return (
    <div className="chat-window-container">
      <ContextMenu menu={menu} options={messageMenuOptions} />
      
      {/* Profile Picture Modal */}
      {showProfilePicture && (
        <div className="profile-picture-modal" onClick={() => setShowProfilePicture(false)}>
          <div className="profile-picture-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="profile-picture-close-btn" onClick={() => setShowProfilePicture(false)}>×</button>
            <img src={chatWith.photoURL || defaultAvatar} alt={chatWith.name} className="profile-picture-large" />
            <p className="profile-picture-name">{chatWith.name}</p>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="edit-message-modal" onClick={() => { setEditingMessage(null); setEditText(""); }}>
          <div className="edit-message-modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Edit Message</h4>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="edit-message-textarea"
              rows="3"
            />
            <div className="edit-message-buttons">
              <button className="edit-cancel-btn" onClick={() => { setEditingMessage(null); setEditText(""); }}>Cancel</button>
              <button className="edit-save-btn" onClick={handleEditMessage}>Save</button>
            </div>
          </div>
        </div>
      )}
      
      <header className="chat-header">
        <button className="back-button" onClick={onBack}>←</button>
        <img 
          src={chatWith.photoURL || defaultAvatar} 
          alt="Profile" 
          className="header-avatar" 
          onClick={() => setShowProfilePicture(true)}
          style={{ cursor: 'pointer' }}
          title="Click to view profile picture"
        />
        <div className="chat-header-info">
          <h3>{chatWith.name}</h3>
          <span className={`user-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            {isOnline ? 'Online' : (lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline')}
          </span>
        </div>
        <button 
          className="search-button"
          onClick={() => setSearchQuery(searchQuery ? "" : " ")}
          title="Search messages"
        >
          🔍
        </button>
      </header>

      {/* Message Search Bar */}
      {searchQuery && (
        <div className="message-search-bar">
          <input
            type="text"
            className="message-search-input"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <span className="search-result-count">{filteredMessages.length} found</span>
          <button 
            className="search-clear-btn"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            ✕
          </button>
        </div>
      )}
      
      <div ref={messageContainerRef} className="message-container">
        {filteredMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            user={user}
            onReply={handleReply}
            onLongPress={handleLongPress}
            onAddReaction={handleAddReaction}
            chatRoomName={[user.email, chatWith.email].sort().join("_")}
          />
        ))}
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker 
            onEmojiClick={(emojiData) => {
              setMessage(message + emojiData.emoji);
              setShowEmojiPicker(false);
            }}
            theme="dark"
            height={350}
          />
        </div>
      )}
      
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
        {isTyping && <div className="typing-indicator">{chatWith.name} is typing...</div>}
        <input 
          type="text" 
          className="message-input" 
          placeholder="Message..." 
          value={message} 
          onChange={(e) => {
            setMessage(e.target.value);
            
            // Emit typing event
            socket.emit("typing", {
              to: chatWith.email,
              from: user.email,
              name: user.name,
            });
            
            // Clear previous timeout
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            
            // Set new timeout to stop typing after 3 seconds of no input
            typingTimeoutRef.current = setTimeout(() => {
              socket.emit("stop_typing", {
                to: chatWith.email,
                from: user.email,
              });
            }, 3000);
          }} 
          onKeyPress={(e) => { if (e.key === "Enter") sendMessage(); }}
        />
        <input 
          ref={imageInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleImageSelect}
          style={{ display: 'none' }}
          id="image-input"
        />
        <button 
          className="image-button" 
          onClick={() => imageInputRef.current?.click()}
          title="Attach image"
          disabled={uploadingImage}
        >
          🖼️
        </button>
        <button 
          className="emoji-button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Add emoji"
        >
          😊
        </button>
        {selectedImage && (
          <div className="selected-image-preview">
            <img src={URL.createObjectURL(selectedImage)} alt="preview" />
            <button onClick={() => { setSelectedImage(null); if (imageInputRef.current) imageInputRef.current.value = ""; }} className="remove-image-btn">✕</button>
          </div>
        )}
        <button 
          onClick={selectedImage ? sendImageMessage : sendMessage} 
          className="send-button"
          disabled={uploadingImage}
        >
          {uploadingImage ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}