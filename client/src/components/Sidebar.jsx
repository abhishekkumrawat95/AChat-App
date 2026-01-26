import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import ContextMenu from "./ContextMenu";
import UserListItem from "./UserListItem";
import ConfirmationModal from "./ConfirmationModal";
import './Sidebar.css';

export default function Sidebar({ user, chatHistory = [], onlineUserEmails, onSelectChat, socket, onProfileOpen, chatWith }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, contextData: null, options: [] }); // Use contextData instead of selectedUser
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Modified to accept the userToDelete directly
  const performChatDeletion = async (userToDelete) => {
    if (!userToDelete) return;
    const roomName = [user.email, userToDelete.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");
    const chatDocRef = doc(db, "chats", roomName);

    try {
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(messagesRef);
      querySnapshot.docs.forEach(docRef => batch.delete(docRef.ref));
      batch.delete(chatDocRef);
      await batch.commit();
      console.log(`Chat with ${userToDelete.email} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
    setConfirmModal({ isOpen: false, onConfirm: () => {} });
  };

  // Modified to accept the userToDelete directly
  const handleDeleteChat = (userToDelete) => {
    console.log("handleDeleteChat function called! User to delete:", userToDelete); // Updated log
    if (!userToDelete) {
        console.log("No user provided for deletion.");
        return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Chat?",
      message: `Are you sure you want to permanently delete your chat with ${userToDelete.name}? This cannot be undone.`,
      // Pass the userToDelete to the confirmation action
      onConfirm: () => performChatDeletion(userToDelete)
    });
  };

  // Modified to accept the userToClear directly
  const handleClearChat = async (userToClear) => {
    if (!userToClear) return;
    const roomName = [user.email, userToClear.email].sort().join("_");
    const messagesRef = collection(db, "chats", roomName, "messages");
    const chatDocRef = doc(db, "chats", roomName);
    const batch = writeBatch(db);
    const querySnapshot = await getDocs(messagesRef);
    querySnapshot.docs.forEach(docRef => batch.delete(docRef.ref));
    batch.update(chatDocRef, { lastMessage: "", lastMessageTimestamp: null });
    await batch.commit();
     console.log(`Chat with ${userToClear.email} cleared successfully.`);
  };

  // Modified: Options now get the user passed directly into their onClick
  const onLongPress = (e, userPressed) => { // Renamed 'u' to 'userPressed' for clarity
    e.preventDefault();
    const touchOrMouseEvent = e.touches ? e.touches[0] : e;

    const options = [
      // Pass userPressed directly to the handler
      { label: "Clear Chat", onClick: () => handleClearChat(userPressed) },
      // Pass userPressed directly to the handler
      { label: "Delete Chat", className: "destructive", onClick: () => handleDeleteChat(userPressed) },
    ];

    setMenu({
      visible: true,
      x: touchOrMouseEvent.clientX,
      y: touchOrMouseEvent.clientY,
      contextData: userPressed, // Store the user data here if needed elsewhere, but handlers get it directly
      onClose: () => setMenu({ visible: false, contextData: null, options: [] }),
      options,
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

  useEffect(() => {
    const handleNotification = ({ from }) => {
      if (chatWith && chatWith.email === from) return;
      setUnreadCounts((prev) => ({...prev, [from]: (prev[from] || 0) + 1 }));
    };
    socket.on("new_message_notification", handleNotification);
    return () => socket.off("new_message_notification", handleNotification);
  }, [socket, chatWith]);

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.trim() === "") {
        setSearchResults([]);
        return;
    }
    const usersRef = collection(db, "users");
    const lowerCaseTerm = term.toLowerCase();
    const q = query(usersRef, where("username", ">=", lowerCaseTerm), where("username", "<=", lowerCaseTerm + '\uf8ff'));
    try {
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })).filter(u => u.email !== user.email);
        setSearchResults(users);
    } catch (error) {
        console.error("Error searching users:", error);
    }
  };

  const isSearching = searchTerm.trim() !== "";
  const usersToDisplay = isSearching ? searchResults : chatHistory;

  return (
    <>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      {/* ContextMenu now receives options directly from menu state */}
      <ContextMenu menu={menu} options={menu.options} />
      <aside className="sidebar">
        <header className="sidebar-header">
          <button className="menu-button" onClick={onProfileOpen}>☰</button>
          <h3>AChat</h3>
        </header>
        <div className="search-container">
          <input type="text" placeholder="Search for users..." value={searchTerm} onChange={handleSearch} className="search-input"/>
        </div>
        <ul className="user-list">
            {usersToDisplay.length === 0 && !isSearching && <li className="no-results">No chats yet. Search to begin.</li>}
            {usersToDisplay.length === 0 && isSearching && <li className="no-results">No users found.</li>}
            {usersToDisplay.map((u) => (
              <UserListItem
                key={u.uid || u.email}
                u={u}
                isOnline={onlineUserEmails.includes(u.email)}
                unreadCount={unreadCounts[u.email] || 0}
                onClick={() => handleSelectChat(u)}
                // Pass the event and user object to onLongPress
                onLongPress={(event) => onLongPress(event, u)}
                isSearching={isSearching}
              />
            ))}
        </ul>
      </aside>
    </>
  );
}