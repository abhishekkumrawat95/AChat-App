import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ProfileSidebar from "./components/ProfileSidebar";
import { auth, db, requestForToken } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, query, where, getDocs, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
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
          } else {
            console.log("User authenticated but Firestore document not found yet.");
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
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

  useEffect(() => {
    const setupNotifications = async () => {
      console.log("setupNotifications function ke andar.");
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && user) {
          console.log("Notification permission mil gayi.");
          const fcmToken = await requestForToken();
          console.log("Token mila:", fcmToken);
          if (fcmToken) {
            console.log("Token ko Firestore mein save karne ki koshish...");
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { fcmToken: fcmToken });
            console.log("SUCCESS: Token Firestore mein save ho gaya!");
          }
        }
      } catch (error) {
        console.error("ERROR: Token save karte waqt error aaya:", error);
      }
    };
    if (user) {
      setupNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (user && user.email) {
      console.log("Setting up chat history listener for user:", user.email);
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("participants", "array-contains", user.email), orderBy("lastMessageTimestamp", "desc"));

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        console.log("Chat listener triggered. Found", querySnapshot.docs.length, "chats.");
        const chats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const otherUserEmails = chats
          .map(chat => chat.participants?.find(email => email !== user.email))
          .filter(Boolean);

        console.log("Other participant emails:", otherUserEmails);

        if (otherUserEmails.length > 0) {
          try {
            const usersRef = collection(db, "users");
            const usersQuery = query(usersRef, where("email", "in", otherUserEmails));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.map(doc => doc.data());
            
            const usersDataMap = usersData.reduce((acc, userData) => {
              acc[userData.email] = userData;
              return acc;
            }, {});

            const historyWithLastMessage = chats.map(chat => {
              const otherUserEmail = chat.participants?.find(email => email !== user.email);
              const userData = otherUserEmail ? usersDataMap[otherUserEmail] : null;

              if (!userData) {
                console.warn("Could not find user data for email:", otherUserEmail, "in chat:", chat.id);
                return null;
              }

              return {
                ...userData,
                lastMessage: chat.lastMessage ?? '',
                lastMessageTimestamp: chat.lastMessageTimestamp
              };
            }).filter(Boolean);

            console.log("Final chat history being set:", historyWithLastMessage);
            setChatHistory(historyWithLastMessage);
          } catch (error) {
            console.error("Error fetching user data for chat history:", error);
            setChatHistory([]);
          }
        } else {
          console.log("No other participants found, setting chat history to empty.");
          setChatHistory([]);
        }
      }, (error) => {
        console.error("Error in chat snapshot listener:", error);
      });

      return () => {
        console.log("Detaching chat history listener.");
        unsubscribe();
      };
    } else {
      setChatHistory([]);
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
      <Login 
        registrationSuccess={registrationSuccess} 
        clearSuccessMessage={() => setRegistrationSuccess(false)} 
        onSwitch={() => setShowLogin(false)}
      />
    ) : (
      <Register 
        onSuccess={() => { setShowLogin(true); setRegistrationSuccess(true); }} 
        onSwitch={() => setShowLogin(true)}
      />
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