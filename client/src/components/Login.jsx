import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ registrationSuccess, clearSuccessMessage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (registrationSuccess) {
      const timer = setTimeout(() => {
        clearSuccessMessage();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess, clearSuccessMessage]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else {
        setError("Failed to log in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Login</h2>
      {registrationSuccess && (
        <p style={{ color: "limegreen", padding: '10px', border: '1px solid limegreen', borderRadius: '5px' }}>
          You have successfully registered! Please log in.
        </p>
      )}
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br /><br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br /><br />
      <button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? "Logging in..." : "Login"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}