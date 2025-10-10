import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const fullUserData = { ...currentUser, ...userDoc.data() };
          setUser(fullUserData);
          socket.emit("login", fullUserData.email);
        }
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
  
  // This useEffect fetches the user's chat history
  useEffect(() => {
    if (user) {
      const chatsRef = collection(db, "chats");
      // This query looks for all chat documents that have the current user's email in their 'participants' array.
      const q = query(chatsRef, where("participants", "array-contains", user.email), orderBy("lastMessageTimestamp", "desc"));

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const chats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // DEBUGGING LINE: This will show you exactly what the query above is finding.
        console.log("Fetched Chat Documents from Firestore:", chats);

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

  if (isLoading) return <div>Loading...</div>;

  if (!user) {
    return showLogin ? (
      <div><Login /><p style={{ textAlign: "center", marginTop: 10 }}>Don't have an account? <button onClick={() => setShowLogin(false)}>Register</button></p></div>
    ) : (
      <div><Register /><p style={{ textAlign: "center", marginTop: 10 }}>Already have an account? <button onClick={() => setShowLogin(true)}>Login</button></p></div>
    );
  }

  return (
    <div className={`app-container ${chatWith ? 'mobile-chat-active' : ''}`}>
      <Sidebar
        user={user}
        chatHistory={chatHistory} 
        onlineUserEmails={onlineUserEmails}
        onSelectChat={setChatWith}
        socket={socket}
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