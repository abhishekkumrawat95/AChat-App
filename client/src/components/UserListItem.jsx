import React from 'react';
import useLongPress from '../hooks/useLongPress';

const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

const UserListItem = ({ u, isOnline, unreadCount, onClick, onLongPress, onAvatarClick, isSearching, isMuted, isArchived }) => {
  // Prevent opening chat when clicking on avatar
  const handleItemClick = (e) => {
    if (e.target.classList.contains('sidebar-avatar')) {
      return; // Don't trigger onClick if avatar was clicked
    }
    onClick(e);
  };

  // The hook now returns a single object with all the event handlers
  const eventHandlers = useLongPress(onLongPress, handleItemClick);

  return (
    // We spread the single object of event handlers onto the list item
    <li {...eventHandlers} className={`user-list-item ${isMuted ? 'muted' : ''} ${isArchived ? 'archived' : ''}`}>
      <img 
        src={u.photoURL || defaultAvatar} 
        alt={u.name} 
        className="sidebar-avatar"
        onClick={(e) => {
          e.stopPropagation();
          onAvatarClick && onAvatarClick();
        }}
      />
      <div className={isOnline ? 'online-indicator' : 'offline-indicator'}></div>
      <div className="user-info">
        <span className="user-name">{u.name}</span>
        <span className="user-username">
          {isSearching ? `@${u.username}` : (u.lastMessage || `@${u.username}`)}
        </span>
      </div>
      {isMuted && <span className="mute-indicator" title="Muted">🔇</span>}
      {unreadCount > 0 && (
        <div className="unread-count-badge">
          {unreadCount}
        </div>
      )}
    </li>
  );
};

export default UserListItem;
