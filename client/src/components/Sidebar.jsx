import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import ContextMenu from "./ContextMenu";
import UserListItem from "./UserListItem";
import './Sidebar.css';

// 1. यहाँ chatWith को प्रॉप्स में जोड़ें
export default function Sidebar({ user, chatHistory = [], onlineUserEmails, onSelectChat, socket, onProfileOpen, chatWith }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, selectedUser: null });

  const handleClearChat = async () => {
    if (!menu.selectedUser) return;
    const roomName = [user.email, menu.selectedUser.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");
    
    const querySnapshot = await getDocs(messagesRef);
    if (querySnapshot.empty) {
        setMenu({ visible: false });
        return;
    }
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    const chatDocRef = doc(db, "chats", roomName);
    batch.update(chatDocRef, {
        lastMessage: "",
        lastMessageTimestamp: null
    });

    await batch.commit();
    setMenu({ visible: false });
  };

  const onLongPress = (e, u) => {
    e.preventDefault();
    const options = [
      { label: "Clear Chat", onClick: handleClearChat },
      { label: "Delete Chat (coming soon)", disabled: true },
    ];
    setMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      selectedUser: u,
      onClose: () => setMenu({ visible: false }),
      options, // Use dynamic options
    });
  };

  const handleSelectChat = (selectedUser) => {
    onSelectChat(selectedUser);
    setSearchTerm("");
    setSearchResults([]);
    setUnreadCounts((prev) => {
      const newCounts = { ...prev };
      delete newCounts[selectedUser.email];
      return newCounts;
    });
  };
  
  // 2. इस useEffect को बदलें
  useEffect(() => {
    const handleNotification = ({ from }) => {
      // अगर चैट खुली हुई है और मैसेज भेजने वाला वही है, तो कुछ न करें
      if (chatWith && chatWith.email === from) {
        return;
      }
      setUnreadCounts((prev) => ({...prev, [from]: (prev[from] || 0) + 1 }));
    };

    socket.on("new_message_notification", handleNotification);

    return () => socket.off("new_message_notification", handleNotification);
  }, [socket, chatWith]); // 3. chatWith को डिपेन्डन्सी में जोड़ें

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim() === "") {
        setSearchResults([]);
        return;
    }
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", ">=", term.toLowerCase()), where("username", "<=", term.toLowerCase() + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => doc.data()).filter(u => u.email !== user.email);
    setSearchResults(users);
  };
  
  const isSearching = searchTerm.trim() !== "";
  const usersToDisplay = isSearching ? searchResults : chatHistory;

  return (
    <>
      <ContextMenu menu={menu} options={menu.options} />
      <aside className="sidebar">
        <header className="sidebar-header">
          <button className="menu-button" onClick={onProfileOpen}>☰</button>
          <h3>AChat</h3>
        </header>
        <div className="search-container">
          <input type="text" placeholder="Search for new users..." value={searchTerm} onChange={handleSearch} className="search-input"/>
        </div>
        <ul className="user-list">
            {usersToDisplay.length === 0 && isSearching && <li className="no-results">No users found.</li>}
            {usersToDisplay.map((u) => (
              <UserListItem
                key={u.uid}
                u={u}
                isOnline={onlineUserEmails.includes(u.email)}
                unreadCount={unreadCounts[u.email] || 0}
                onClick={() => handleSelectChat(u)}
                onLongPress={(e) => onLongPress(e, u)}
                isSearching={isSearching}
              />
            ))}
        </ul>
      </aside>
    </>
  );
}