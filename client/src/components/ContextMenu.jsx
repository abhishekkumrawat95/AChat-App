import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

// MODIFIED: Component now accepts an 'options' array
const ContextMenu = ({ menu, options = [] }) => {
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
        {/* Map over the options to create the menu items */}
        {options.map((option, index) => (
          <li
            key={index}
            className={`${option.className || ''} ${option.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!option.disabled && option.onClick) {
                option.onClick();
              }
              menu.onClose(); // Close menu after click
            }}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContextMenu;