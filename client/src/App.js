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
          } else {
            // Handle case where auth user exists but Firestore doc might not yet (rare)
             console.log("User authenticated but Firestore document not found yet.");
             // Optionally set a minimal user object or wait
          }
        }, (error) => {
             console.error("Error listening to user document:", error); // Log errors
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
            await updateDoc(userDocRef, {
              fcmToken: fcmToken
            });
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

  // === UPDATED CHAT HISTORY USEEFFECT WITH LOGGING ===
  useEffect(() => {
    // Ensure user and user.email are available before proceeding
    if (user && user.email) {
      console.log("Setting up chat history listener for user:", user.email);
      const chatsRef = collection(db, "chats");
      // Query chats where the current user is a participant, order by the last message time
      const q = query(chatsRef, where("participants", "array-contains", user.email), orderBy("lastMessageTimestamp", "desc"));

      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        console.log("Chat listener triggered. Found", querySnapshot.docs.length, "chats."); // Log: How many chats found?

        // Map chat document data
        const chats = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Chat documents data:", chats); // Log: Raw chat data

        // Extract emails of the other participants
        const otherUserEmails = chats
          .map(chat => chat.participants?.find(email => email !== user.email)) // Use optional chaining just in case
          .filter(Boolean); // Remove any undefined entries
        console.log("Other participant emails:", otherUserEmails); // Log: Emails found

        if (otherUserEmails.length > 0) {
          try {
            const usersRef = collection(db, "users");
            // Fetch user profiles for all other participants in one go
            // Note: 'in' queries are limited to 10 elements. For more, you'd need multiple queries.
            const usersQuery = query(usersRef, where("email", "in", otherUserEmails));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.map(doc => doc.data());
            console.log("Fetched user data for participants:", usersData); // Log: User profiles fetched

             // Create a map for quick lookup of user data by email
             const usersDataMap = usersData.reduce((acc, userData) => {
                acc[userData.email] = userData;
                return acc;
            }, {});

            // Combine chat data with user data, ensuring order is preserved from chat query
            const historyWithLastMessage = chats.map(chat => {
                const otherUserEmail = chat.participants?.find(email => email !== user.email);
                const userData = otherUserEmail ? usersDataMap[otherUserEmail] : null;

                if (!userData) {
                     console.warn("Could not find user data for email:", otherUserEmail, "in chat:", chat.id);
                     return null; // Skip this chat if user data is missing
                }

                return {
                 ...userData, // Spread the found user data
                 lastMessage: chat.lastMessage ?? '', // Get last message from chat doc
                 lastMessageTimestamp: chat.lastMessageTimestamp // Keep timestamp for potential future sorting
                };
            }).filter(Boolean); // Filter out any null entries where user data was missing

            console.log("Final chat history being set:", historyWithLastMessage); // Log: The final list

            setChatHistory(historyWithLastMessage);
          } catch (error) {
             console.error("Error fetching user data for chat history:", error); // Log: Errors during user fetch
             setChatHistory([]); // Set to empty on error
          }
        } else {
          console.log("No other participants found, setting chat history to empty."); // Log: Empty case
          setChatHistory([]); // No chats involving other users
        }
      }, (error) => {
        // Handle listener errors (like permission denied after deletion)
        console.error("Error in chat snapshot listener:", error);
      });

      // Cleanup function to detach the listener
      return () => {
        console.log("Detaching chat history listener.");
        unsubscribe();
      };
    } else {
       console.log("User not available, clearing chat history.");
       setChatHistory([]); // Clear history if user logs out
    }
  }, [user]); // Re-run this effect if the user object changes


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