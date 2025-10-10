import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
// Import all necessary Firestore functions
import { doc, getDoc, writeBatch } from "firebase/firestore";

export default function Register({ onRegister }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Check if the username is already taken.
      // We check a special 'usernames' collection where the document ID is the username itself.
      const usernameDocRef = doc(db, "usernames", username.toLowerCase());
      const usernameDoc = await getDoc(usernameDocRef);

      if (usernameDoc.exists()) {
        // If the document exists, the username is taken.
        throw new Error("This username is already taken. Please choose another.");
      }

      // Step 2: If the username is unique, create the user in Firebase Auth.
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Step 3: Use a "batch write" to perform two actions at once.
      // This ensures that both actions succeed or both fail together.
      const batch = writeBatch(db);

      // Action 1: Create the user's profile document in the 'users' collection.
      const userDocRef = doc(db, "users", user.uid);
      batch.set(userDocRef, {
        uid: user.uid,
        name: name,
        username: username,
        email: email,
      });

      // Action 2: Create the document in the 'usernames' collection to claim the username.
      batch.set(usernameDocRef, { uid: user.uid });

      // Commit the batch write.
      await batch.commit();
      
      // onRegister is handled by the App.js listener, so we don't need to call it here.

    } catch (err) {
      // Display a user-friendly error message.
      if (err.message.includes("already taken")) {
        setError(err.message);
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already registered.");
      } else {
        setError("Failed to register. Please try again.");
        console.error(err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Register</h2>
      <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} /><br /><br />
      <input placeholder="Username (must be unique)" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} /><br /><br />
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} /><br /><br />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} /><br /><br />
      {/* Disable button while loading to prevent multiple clicks */}
      <button onClick={handleRegister} disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}