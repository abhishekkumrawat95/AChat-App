import React, { useRef } from 'react';
import './ProfileSidebar.css';
import { signOut } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';

// Your new default avatar URL
const defaultAvatar = "https://static.vecteezy.com/system/resources/previews/020/765/399/non_2x/default-profile-account-unknown-icon-black-silhouette-free-vector.jpg";

export default function ProfileSidebar({ user, isOpen, onClose, onThemeToggle }) {
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    // ... upload logic remains the same
    const file = e.target.files[0];
    if (!file || !user) return;
    const storageRef = ref(storage, `profile_pictures/${user.uid}`);
    try {
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { photoURL });
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
          {/* The src now uses your chosen default image */}
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
              onClose();
              signOut(auth);
            }}>Logout</li>
        </ul>
      </div>
    </>
  );
}