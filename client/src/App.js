import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import ProfileSidebar from "./components/ProfileSidebar";
import { auth, db, requestForToken, messaging } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, collection, query, where, getDocs, orderBy, onSnapshot, updateDoc } from "firebase/firestore";
import { onMessage } from "firebase/messaging";
import io from "socket.io-client";
import './App.css';

// Determine socket connection URL based on environment
const getSocketURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use the same origin (Vercel handles routing)
    return window.location.origin;
  }
  // In development, connect to local server
  return "http://localhost:5000";
};

const socket = io.connect(getSocketURL(), {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

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
  const [fontSize, setFontSize] = useState('medium');
  const [messageSound, setMessageSound] = useState(true);

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
            setIsLoading(false); // Set to false only after user data is loaded
          } else {
            console.log("User authenticated but Firestore document not found yet.");
            setIsLoading(false);
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
          setIsLoading(false);
        });
        socket.emit("login", currentUser.email);
        socket.emit("user_online", { email: currentUser.email, name: currentUser.displayName || 'User' });
        
        // Update last seen (reuse userDocRef)
        updateDoc(userDocRef, { lastSeen: new Date() }).catch(err => console.log("Last seen update skipped:", err));
      } else {
        setUser(null);
        setIsLoading(false);
      }
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

          // Set up listener for foreground messages
          onMessage(messaging, (payload) => {
            console.log("Message received in foreground:", payload);
            
            const notificationTitle = payload.notification?.title || "New Message";
            const notificationOptions = {
              body: payload.notification?.body || "You have a new message",
              icon: payload.notification?.icon || "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg",
              badge: "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg",
              tag: "chat-notification",
              requireInteraction: false
            };

            if (Notification.permission === 'granted') {
              new Notification(notificationTitle, notificationOptions);
              console.log("Notification displayed in foreground");
            }
          });
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
    <div className={`app-container ${chatWith ? 'mobile-chat-active' : ''} theme-${theme}`} style={{ fontSize: fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px' }}>
      <ProfileSidebar 
        user={user} 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        onThemeToggle={toggleTheme}
        onFontSizeChange={setFontSize}
        onMessageSoundChange={setMessageSound}
        socket={socket}
      />
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
          <ChatWindow user={user} chatWith={chatWith} socket={socket} onBack={handleBack} messageSound={messageSound} />
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