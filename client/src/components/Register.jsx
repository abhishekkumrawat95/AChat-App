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

  // handleRegister function ko component ke andar rakha gaya hai
  const handleRegister = async () => {
    if (!name || !username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setIsLoading(true);
    setError("");
    console.log("Attempting to register user:", email);

    try {
      console.log("Checking username uniqueness for:", username.toLowerCase());
      const usernameDocRef = doc(db, "usernames", username.toLowerCase());
      const usernameDoc = await getDoc(usernameDocRef);
      if (usernameDoc.exists()) {
        console.log("Username already exists.");
        throw new Error("This username is already taken. Please choose another.");
      }
      console.log("Username is available.");

      console.log("Creating user with email/password...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Auth user created successfully. UID:", user.uid);

      console.log("Preparing batch write for Firestore...");
      const batch = writeBatch(db);
      const userDocRef = doc(db, "users", user.uid);

      batch.set(userDocRef, {
        uid: user.uid,
        name: name, // Ab yeh component ke state waala 'name' hai
        username: username,
        email: email,
        photoURL: ""
      });
      console.log("Added user document write to batch.");

      batch.set(usernameDocRef, { uid: user.uid });
      console.log("Added username document write to batch.");

      console.log("Attempting to commit batch write...");
      await batch.commit();
      console.log("Batch write committed successfully.");

      console.log("Registration process completed successfully.");
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error("!!! Registration Error Caught !!!");
      console.error("Error Object:", err);
      console.error("Error Code:", err.code);
      console.error("Error Name:", err.name);
      console.error("Error Message:", err.message);

      if (err.message.includes("already taken")) {
        setError(err.message);
      } else if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already registered.");
      } else if (err.code === 'permission-denied' || err.message.includes('permission')) {
         setError("Firestore permission denied. Please check rules again.");
      } else {
        setError("Failed to register. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }; // handleRegister function yahaan khatam hota hai

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
      {/* Login button ko toggle karne ka logic App.js se aana chahiye */}
      {/* <p style={{ marginTop: 10 }}>Already have an account? <button onClick={...}>Login</button></p> */}
    </div>
  );
}