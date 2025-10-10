import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import './Sidebar.css';

export default function Sidebar({ user, chatHistory, onlineUserEmails, onSelectChat, socket }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({}); // Stores unread counts

  useEffect(() => {
    // This logic now increments the count for the sender
    const handleNotification = ({ from }) => {
      setUnreadCounts((prevCounts) => ({
        ...prevCounts,
        [from]: (prevCounts[from] || 0) + 1,
      }));
    };
    socket.on("new_message_notification", handleNotification);
    return () => socket.off("new_message_notification", handleNotification);
  }, [socket]);
  
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

  const handleSelectChat = (selectedUser) => {
    onSelectChat(selectedUser);
    setSearchTerm("");
    setSearchResults([]);
    
    // When a chat is selected, reset its unread count
    setUnreadCounts((prevCounts) => {
      const newCounts = { ...prevCounts };
      delete newCounts[selectedUser.email]; // Remove the entry for the selected chat
      return newCounts;
    });
  };
  
  const usersToDisplay = searchTerm.trim() !== "" ? searchResults : chatHistory;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <h3>AChat</h3>
      </header>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search for new users..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-input"
        />
      </div>
      <ul className="user-list">
          {usersToDisplay.length === 0 && searchTerm.trim() !== "" && <li className="no-results">No users found.</li>}
          {usersToDisplay.map((u) => (
            <li key={u.uid} onClick={() => handleSelectChat(u)} className="user-list-item">
              <div className={onlineUserEmails.includes(u.email) ? 'online-indicator' : 'offline-indicator'}></div>
              <div className="user-info">
                <span className="user-name">{u.name}</span>
                <span className="user-username">
                    {searchTerm.trim() === "" ? (u.lastMessage || `@${u.username}`) : `@${u.username}`}
                </span>
              </div>
              {/* Display the count if it's greater than 0 */}
              {unreadCounts[u.email] > 0 && (
                <div className="unread-count-badge">
                  {unreadCounts[u.email]}
                </div>
              )}
            </li>
          ))}
      </ul>
    </aside>
  );
}