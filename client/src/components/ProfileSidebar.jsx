import React, { useRef, useState } from 'react';
import './ProfileSidebar.css';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

// Your new default avatar URL
const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

export default function ProfileSidebar({ user, isOpen, onClose, onThemeToggle, onFontSizeChange, onMessageSoundChange, socket }) {
  const fileInputRef = useRef(null);
  const [currentView, setCurrentView] = useState('main'); // 'main', 'settings', 'privacy', 'notifications'
  const [settings, setSettings] = useState({
    notifications: true,
    onlineStatus: true,
    readReceipts: true,
    blockUnknownUsers: false,
    messageAutoDelete: false,
    messageSound: true,
    showImages: true,
    showLinks: true,
    typingIndicator: true,
    lastSeenStatus: true,
    fontSize: 'medium', // small, medium, large
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) {
      alert("Please select a file and make sure you're logged in.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    try {
      const storageRef = ref(storage, `profile_pictures/${user.uid}/${Date.now()}`);
      console.log("Uploading to:", storageRef.fullPath);
      
      await uploadBytes(storageRef, file);
      console.log("Upload successful, getting download URL...");
      
      const photoURL = await getDownloadURL(storageRef);
      console.log("Download URL:", photoURL);
      
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { photoURL });
      console.log("User document updated successfully");
      
      alert("Profile picture updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error uploading image:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      alert(`Failed to upload image: ${error.message}`);
    }
  };

  if (!user) return null;

  const handleSettingChange = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleClearCache = () => {
    if (window.confirm('Are you sure you want to clear all cache and data? This cannot be undone.')) {
      try {
        // Clear localStorage
        localStorage.clear();
        // Clear sessionStorage
        sessionStorage.clear();
        alert('Cache and data cleared successfully!');
        // Reload page
        window.location.reload();
      } catch (error) {
        alert('Error clearing cache: ' + error.message);
      }
    }
  };

  return (
    <>
      <div className={`profile-sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`profile-sidebar ${isOpen ? 'open' : ''}`}>
        
        {/* MAIN VIEW */}
        {currentView === 'main' && (
          <>
            <div className="profile-header">
              <input 
                type="file" 
                accept="image/*"
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleImageUpload} 
              />
              <img 
                src={user.photoURL || defaultAvatar} 
                alt="Profile" 
                className="profile-avatar"
                onClick={() => fileInputRef.current.click()}
                title="Click to change profile picture"
              />
              <h3>{user.name}</h3>
              <p>{user.email}</p>
            </div>
            <ul className="profile-options">
              <li onClick={onThemeToggle}>
                <span>🌙</span> Toggle Theme
              </li>
              <li onClick={() => setCurrentView('notifications')}>
                <span>🔔</span> Notifications
              </li>
              <li onClick={() => setCurrentView('privacy')}>
                <span>🔒</span> Privacy & Safety
              </li>
              <li onClick={() => setCurrentView('settings')}>
                <span>⚙️</span> Settings
              </li>
              <li onClick={() => setCurrentView('about')}>
                <span>ℹ️</span> About
              </li>
              <li onClick={() => {
                onClose();
                socket.emit("user_offline", { email: user.email });
                signOut(auth);
              }} className="logout-btn">
                <span>🚪</span> Logout
              </li>
            </ul>
          </>
        )}

        {/* NOTIFICATIONS VIEW */}
        {currentView === 'notifications' && (
          <>
            <div className="settings-header">
              <button onClick={() => setCurrentView('main')} className="back-btn">← Back</button>
              <h3>Notifications</h3>
            </div>
            <div className="settings-options">
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.notifications}
                    onChange={() => handleSettingChange('notifications')}
                  />
                  <span>Enable Notifications</span>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.readReceipts}
                    onChange={() => handleSettingChange('readReceipts')}
                  />
                  <span>Read Receipts</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* PRIVACY VIEW */}
        {currentView === 'privacy' && (
          <>
            <div className="settings-header">
              <button onClick={() => setCurrentView('main')} className="back-btn">← Back</button>
              <h3>Privacy & Safety</h3>
            </div>
            <div className="settings-options">
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.onlineStatus}
                    onChange={() => handleSettingChange('onlineStatus')}
                  />
                  <span>Show Online Status</span>
                </label>
              </div>
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.blockUnknownUsers}
                    onChange={() => handleSettingChange('blockUnknownUsers')}
                  />
                  <span>Block Messages from Strangers</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* SETTINGS VIEW */}
        {currentView === 'settings' && (
          <>
            <div className="settings-header">
              <button onClick={() => setCurrentView('main')} className="back-btn">← Back</button>
              <h3>Settings</h3>
            </div>
            <div className="settings-options">
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.messageAutoDelete}
                    onChange={() => handleSettingChange('messageAutoDelete')}
                  />
                  <span>Auto-delete Messages after 90 days</span>
                </label>
              </div>
              
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.messageSound}
                    onChange={() => {
                      handleSettingChange('messageSound');
                      onMessageSoundChange(!settings.messageSound);
                    }}
                  />
                  <span>Message Notification Sound</span>
                </label>
              </div>

              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.typingIndicator}
                    onChange={() => handleSettingChange('typingIndicator')}
                  />
                  <span>Show Typing Indicator</span>
                </label>
              </div>

              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.lastSeenStatus}
                    onChange={() => handleSettingChange('lastSeenStatus')}
                  />
                  <span>Show Last Seen Status</span>
                </label>
              </div>

              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.showImages}
                    onChange={() => handleSettingChange('showImages')}
                  />
                  <span>Auto-download Images</span>
                </label>
              </div>

              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox" 
                    checked={settings.showLinks}
                    onChange={() => handleSettingChange('showLinks')}
                  />
                  <span>Preview Links</span>
                </label>
              </div>

              <div className="setting-item">
                <label>
                  <span className="label-text">Font Size</span>
                  <select 
                    value={settings.fontSize}
                    onChange={(e) => {
                      setSettings(prev => ({ ...prev, fontSize: e.target.value }));
                      onFontSizeChange(e.target.value);
                    }}
                    className="font-size-select"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>
              </div>

              <div className="setting-item">
                <button className="clear-cache-btn" onClick={handleClearCache}>Clear Cache & Data</button>
              </div>
            </div>
          </>
        )}

        {/* ABOUT VIEW */}
        {currentView === 'about' && (
          <>
            <div className="settings-header">
              <button onClick={() => setCurrentView('main')} className="back-btn">← Back</button>
              <h3>About AChat</h3>
            </div>
            <div className="about-content">
              <div className="about-item">
                <h4>AChat v1.0.0</h4>
                <p>A modern, secure chat application built with React and Firebase.</p>
              </div>
              <div className="about-item">
                <h4>Features</h4>
                <ul>
                  <li>✅ Real-time messaging with Socket.IO</li>
                  <li>✅ User authentication with Firebase</li>
                  <li>✅ Profile pictures and status</li>
                  <li>✅ Search users and start conversations</li>
                  <li>✅ Online/Offline status tracking</li>
                  <li>✅ Dark/Light theme support</li>
                </ul>
              </div>
              <div className="about-item">
                <h4>Privacy</h4>
                <p>Your messages and data are encrypted and secure. We never share your information with third parties.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}