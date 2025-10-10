import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";

export default function Register({ onSuccess }) {
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
      const usernameDocRef = doc(db, "usernames", username.toLowerCase());
      const usernameDoc = await getDoc(usernameDocRef);

      if (usernameDoc.exists()) {
        throw new Error("This username is already taken. Please choose another.");
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const batch = writeBatch(db);
      const userDocRef = doc(db, "users", user.uid);
      batch.set(userDocRef, {
        uid: user.uid,
        name: name,
        username: username,
        email: email,
        photoURL: "" // Initially empty photoURL
      });
      batch.set(usernameDocRef, { uid: user.uid });
      await batch.commit();
      
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
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
      <button onClick={handleRegister} disabled={isLoading}>
        {isLoading ? "Registering..." : "Register"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}