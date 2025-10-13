import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ProfileSidebar from "./components/ProfileSidebar";
import { auth, db, requestForToken } from "./firebase"; // requestForToken ko import karein
import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, query, where, getDocs, orderBy, onSnapshot, updateDoc } from "firebase/firestore"; // updateDoc ko import karein
import io from "socket.io-client";
import './App.css';

const socket = io.connect("https://achat-server.onrender.com");

export default function App() {
  const [user, setUser] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [onlineUserEmails, setOnlineUserEmails] = useState([]);
  const [chatWith, setChatWith] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [isChatRendered, setIsChatRendered] = useState(false);

  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectChat = (selectedUser) => {
    if (!selectedUser) return;
    setChatWith(selectedUser);
    setTimeout(() => {
      setIsChatRendered(true);
    }, 300);
  };

  const handleBack = () => {
    setIsChatRendered(false);
    setChatWith(null);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUser({ ...currentUser, ...doc.data() });
          }
        });
        socket.emit("login", currentUser.email);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    socket.on("update_users", (emails) => setOnlineUserEmails(emails));
    return () => {
      unsubscribeAuth();
      socket.off("update_users");
    };
  }, []);

  // Page visibility ko handle karne ke liye
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (socket.disconnected) {
          socket.connect();
          if (auth.currentUser) {
            socket.emit("login", auth.currentUser.email);
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // === NEW HOOK FOR PUSH NOTIFICATIONS ===
  useEffect(() => {
    const setupNotifications = async () => {
      // 1. User se permission maangein
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && user) {
        // 2. Agar permission mil gayi, to token lein
        const fcmToken = await requestForToken();
        if (fcmToken) {
          // 3. Token ko user ke document mein Firestore mein save karein
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, {
            fcmToken: fcmToken // Token ko save/update karein
          });
        }
      }
    };
    // Sirf jab user login kare, tab yeh function chalaayein
    if (user) {
      setupNotifications();
    }
  }, [user]); // Yeh hook tab chalega jab user state change hogi

  useEffect(() => {
    if (user) {
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", user.email), orderBy("lastMessageTimestamp", "desc"));
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const chats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const otherUserEmails = chats.map(chat => chat.participants.find(email => email !== user.email)).filter(Boolean);
        if (otherUserEmails.length > 0) {
          const usersRef = collection(db, "users");
          const usersQuery = query(usersRef, where("email", "in", otherUserEmails));
          const usersSnapshot = await getDocs(usersQuery);
          const usersData = usersSnapshot.docs.map(doc => doc.data());
          const historyWithLastMessage = usersData.map(userData => {
            const relevantChat = chats.find(chat => chat.participants.includes(userData.email));
            return { ...userData, lastMessage: relevantChat ? relevantChat.lastMessage : '' };
          });
          setChatHistory(historyWithLastMessage);
        } else {
          setChatHistory([]);
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    const handlePopState = () => {
      handleBack();
    };
    if (chatWith) {
      window.history.pushState({ onChatScreen: true }, "");
      window.addEventListener('popstate', handlePopState);
    }
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [chatWith]);

  if (isLoading) {
    return <div className="loading-container"><div>Loading...</div></div>;
  }

  if (!user) {
    return showLogin ? (
      <div>
        <Login registrationSuccess={registrationSuccess} clearSuccessMessage={() => setRegistrationSuccess(false)} />
        <p style={{ textAlign: "center", marginTop: 10 }}>Don't have an account? <button onClick={() => setShowLogin(false)}>Register</button></p>
      </div>
    ) : (
      <div>
        <Register onSuccess={() => { setShowLogin(true); setRegistrationSuccess(true); }} />
        <p style={{ textAlign: "center", marginTop: 10 }}>Already have an account? <button onClick={() => setShowLogin(true)}>Login</button></p>
      </div>
    );
  }

  return (
    <div className={`app-container ${chatWith ? 'mobile-chat-active' : ''} theme-${theme}`}>
      <ProfileSidebar user={user} isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} onThemeToggle={toggleTheme} />
      <Sidebar
        user={user}
        chatHistory={chatHistory}
        onlineUserEmails={onlineUserEmails}
        onSelectChat={handleSelectChat}
        socket={socket}
        onProfileOpen={() => setIsProfileOpen(true)}
        chatWith={chatWith}
      />
      <main className="chat-area">
        {chatWith && isChatRendered ? (
          <ChatWindow user={user} chatWith={chatWith} socket={socket} onBack={handleBack} />
        ) : (
          !chatWith && (
            <div className="welcome-screen">
                <h2>AChat</h2>
                <p>Select a conversation to begin chatting.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}

