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
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError("Invalid email or password. Please try again.");
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