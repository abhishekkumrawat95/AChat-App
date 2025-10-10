import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ProfileSidebar from "./components/ProfileSidebar";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import io from "socket.io-client";
import './App.css';

const socket = io.connect("https://achat-server.onrender.com"); // Aapka Render server URL

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

  const toggleTheme = () => {
    setTheme(currentTheme => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const fullUserData = { ...currentUser, ...doc.data() };
            setUser(fullUserData);
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

  if (isLoading) {
    return (
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return showLogin ? (
      <div>
        <Login 
          registrationSuccess={registrationSuccess}
          clearSuccessMessage={() => setRegistrationSuccess(false)}
        />
        <p style={{ textAlign: "center", marginTop: 10 }}>Don't have an account? <button onClick={() => setShowLogin(false)}>Register</button></p>
      </div>
    ) : (
      <div>
        <Register 
          onSuccess={() => {
            setShowLogin(true);
            setRegistrationSuccess(true);
          }}
        />
        <p style={{ textAlign: "center", marginTop: 10 }}>Already have an account? <button onClick={() => setShowLogin(true)}>Login</button></p>
      </div>
    );
  }

  return (
    <div className={`app-container ${chatWith ? 'mobile-chat-active' : ''} theme-${theme}`}>
      <ProfileSidebar 
        user={user}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onThemeToggle={toggleTheme}
      />
      <Sidebar
        user={user}
        chatHistory={chatHistory} 
        onlineUserEmails={onlineUserEmails}
        onSelectChat={setChatWith}
        socket={socket}
        onProfileOpen={() => setIsProfileOpen(true)}
      />
      <main className="chat-area">
        {chatWith ? (
          <ChatWindow
            user={user}
            chatWith={chatWith}
            socket={socket}
            onBack={() => setChatWith(null)}
          />
        ) : (
          <div className="welcome-screen"><h2>Select a conversation to begin</h2></div>
        )}
      </main>
    </div>
  );
}