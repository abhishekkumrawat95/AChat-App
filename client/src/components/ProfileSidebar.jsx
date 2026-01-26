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