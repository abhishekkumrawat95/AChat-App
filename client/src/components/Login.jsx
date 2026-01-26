import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import './Login.css';

export default function Login({ onSwitch, registrationSuccess, clearSuccessMessage }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        
        // Validate inputs
        if (!email.trim() || !password.trim()) {
            setError("Please enter both email and password.");
            return;
        }

        try {
            console.log("Attempting to login with email:", email);
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log("Login successful:", result);
        } catch (err) {
            console.error("Login error:", err.code, err.message);
            
            // Provide more specific error messages
            switch(err.code) {
                case 'auth/user-not-found':
                    setError("No account found with this email.");
                    break;
                case 'auth/wrong-password':
                    setError("Incorrect password.");
                    break;
                case 'auth/invalid-email':
                    setError("Invalid email format.");
                    break;
                case 'auth/user-disabled':
                    setError("This account has been disabled.");
                    break;
                default:
                    setError("Login failed: " + err.message);
            }
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-logo">AChat</h1>
                
                {registrationSuccess && (
                    <div className="success-banner" onClick={clearSuccessMessage}>
                        Registration successful! Please login.
                    </div>
                )}

                {error && <div className="error-banner">{error}</div>}

                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="input-group">
                        <input 
                            type="email" 
                            placeholder="Email" 
                            required 
                            value={email}
                            onChange={e => setEmail(e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <input 
                            type="password" 
                            placeholder="Password" 
                            required 
                            value={password}
                            onChange={e => setPassword(e.target.value)} 
                        />
                    </div>
                    <button type="submit" className="auth-btn">Log In</button>
                </form>

                <div className="auth-divider">
                    <span>OR</span>
                </div>

                <div className="auth-footer">
                    <p>Don't have an account? <button type="button" onClick={onSwitch} className="switch-btn">Sign up</button></p>
                </div>
            </div>
            
            <div className="auth-bottom-info">
                <p>from</p>
                <p className="company-name">AChat Team</p>
            </div>
        </div>
    );
}