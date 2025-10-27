import React from 'react';
import useLongPress from '../hooks/useLongPress';

const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

const UserListItem = ({ u, isOnline, unreadCount, onClick, onLongPress, isSearching }) => {
  // The hook now returns a single object with all the event handlers
  const eventHandlers = useLongPress(onLongPress, onClick);

  return (
    // We spread the single object of event handlers onto the list item
    <li {...eventHandlers} className="user-list-item">
      <img src={u.photoURL || defaultAvatar} alt={u.name} className="sidebar-avatar" />
      <div className={isOnline ? 'online-indicator' : 'offline-indicator'}></div>
      <div className="user-info">
        <span className="user-name">{u.name}</span>
        <span className="user-username">
          {isSearching ? `@${u.username}` : (u.lastMessage || `@${u.username}`)}
        </span>
      </div>
      {unreadCount > 0 && (
        <div className="unread-count-badge">
          {unreadCount}
        </div>
      )}
    </li>
  );
};

export default UserListItem;
