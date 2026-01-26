import React, { useState, useRef, useEffect } from 'react';
import useLongPress from '../hooks/useLongPress';
import './MessageBubble.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
};

const MessageBubble = ({ msg, user, onReply, onLongPress, onAddReaction, chatRoomName }) => {
  const isOwnMessage = msg.user === user.email;
  const longPressEvents = useLongPress((e) => onLongPress(e, msg), () => {}, { delay: 400 });
  const [showImageModal, setShowImageModal] = useState(false);

  const bubbleRef = useRef(null);
  const [swipeX, setSwipeX] = useState(0);

  useEffect(() => {
    let startX = 0;
    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    
    const handleTouchMove = (e) => {
      const currentX = e.touches[0].clientX;
      const change = currentX - startX;
      // Only allow right swipe up to 100px and prevent left swipe
      if (change > 0 && change < 100) {
        setSwipeX(change);
      }
    };

    const handleTouchEnd = () => {
      if (swipeX > 60) {
        onReply(msg);
      }
      // Reset position smoothly
      if (bubbleRef.current) {
        bubbleRef.current.style.transition = 'transform 0.3s ease-out';
      }
      setSwipeX(0);
    };

    const bubble = bubbleRef.current;
    if (bubble) {
      bubble.addEventListener('touchstart', handleTouchStart, { passive: true });
      bubble.addEventListener('touchmove', handleTouchMove, { passive: true });
      bubble.addEventListener('touchend', handleTouchEnd);
      bubble.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      if (bubble) {
        bubble.removeEventListener('touchstart', handleTouchStart);
        bubble.removeEventListener('touchmove', handleTouchMove);
        bubble.removeEventListener('touchend', handleTouchEnd);
        bubble.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [msg, onReply, swipeX]);


  return (
    <div
      ref={bubbleRef}
      {...longPressEvents}
      className={`message-wrapper ${isOwnMessage ? 'sent' : 'received'}`}
      style={{ transform: `translateX(${swipeX}px)` }}
    >
        {/* === THIS IS THE NEW CODE THAT DISPLAYS THE REPLY === */}
        {msg.replyTo && (
            <div className="reply-content-bubble">
                <p className="reply-user">{msg.replyTo.name}</p>
                <p className="reply-text">{msg.replyTo.text}</p>
            </div>
        )}

      <div 
        className={`message-bubble`}
      >
        {msg.imageURL && (
          <>
            <img 
              src={msg.imageURL} 
              alt="shared" 
              className="message-image"
              onClick={() => setShowImageModal(true)}
              style={{ cursor: 'pointer' }}
            />
            {showImageModal && (
              <div className="image-modal" onClick={() => setShowImageModal(false)}>
                <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="image-modal-close" onClick={() => setShowImageModal(false)}>×</button>
                  <img src={msg.imageURL} alt="full size" />
                </div>
              </div>
            )}
          </>
        )}
        <p className="message-text">{msg.text}</p>
        {msg.editedAt && (
          <p className="message-edited-tag">(edited)</p>
        )}
        <div className="message-meta">
          <span className="timestamp">{formatTimestamp(msg.timestamp)}</span>
          {isOwnMessage && (
            <span className={`status-ticks ${msg.status}`}>
              ✓{msg.status === 'seen' && '✓'}
            </span>
          )}
        </div>

        {/* Display Reactions */}
        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
          <div className="message-reactions">
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button
                key={emoji}
                className="reaction-badge"
                title={users.join(', ')}
              >
                {emoji} <span className="reaction-count">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;