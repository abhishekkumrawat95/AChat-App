import React from 'react';
import useLongPress from '../hooks/useLongPress';

const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

const UserListItem = ({ u, isOnline, unreadCount, onClick, onLongPress, isSearching }) => {
  // Now the hook is called correctly at the top level of a component
  const longPressEvents = useLongPress(onLongPress, onClick);

  return (
    <li {...longPressEvents} className="user-list-item">
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