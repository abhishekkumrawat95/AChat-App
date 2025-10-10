import React, { useRef } from 'react';
import './ProfileSidebar.css';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

const defaultAvatar = "https://i.imgur.com/am6E4xZ.png"; // Default avatar

export default function ProfileSidebar({ user, isOpen, onClose, onThemeToggle }) {
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const storageRef = ref(storage, `profile_pictures/${user.uid}`);
    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { photoURL });
      
      // User state will update in real-time because of the onSnapshot listener in App.js
      onClose();
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    }
  };

  if (!user) return null;

  return (
    <>
      <div className={`profile-sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <div className={`profile-sidebar ${isOpen ? 'open' : ''}`}>
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
          <li onClick={onThemeToggle}>Toggle Theme</li>
          <li>Settings (coming soon)</li>
          <li onClick={() => {
              onClose(); // Close sidebar before logging out
              signOut(auth);
            }}>Logout</li>
        </ul>
      </div>
    </>
  );
}