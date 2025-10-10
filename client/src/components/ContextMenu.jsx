import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ menu, onClearChat, onDeleteChat }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        menu.onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menu]);

  if (!menu.visible) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ top: menu.y, left: menu.x }}
    >
      <ul>
        <li onClick={onClearChat}>Clear Chat</li>
        <li className="disabled">Delete Chat (coming soon)</li>
      </ul>
    </div>
  );
};

export default ContextMenu;