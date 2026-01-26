import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import './Register.css';

export default function Register({ onSuccess, onSwitch }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // 1. Create user in Firebase Auth
            const res = await createUserWithEmailAndPassword(auth, email, password);
            
            // 2. Update Auth Profile
            await updateProfile(res.user, {
                displayName: fullName
            });

            // 3. Save additional data to Firestore
            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                email: email,
                username: username.toLowerCase().replace(/\s/g, ''),
                name: fullName,
                photoURL: "",
                createdAt: new Date().toISOString()
            });

            // 4. Save username to a separate collection for uniqueness checks later if needed
            await setDoc(doc(db, "usernames", username.toLowerCase()), {
                uid: res.user.uid
            });

            onSuccess();
        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setError("Email is already registered.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError("Registration failed. Please try again.");
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-logo">AChat</h1>                
                {error && <div className="error-banner">{error}</div>}

                <form className="auth-form" onSubmit={handleRegister}>
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
                            type="text" 
                            placeholder="Full Name" 
                            required 
                            value={fullName}
                            onChange={e => setFullName(e.target.value)} 
                        />
                    </div>
                    <div className="input-group">
                        <input 
                            type="text" 
                            placeholder="Username" 
                            required 
                            value={username}
                            onChange={e => setUsername(e.target.value)} 
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
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? "Signing up..." : "Sign Up"}
                    </button>
                </form>

                <p className="auth-terms">
                    By signing up, you agree to our Terms, Data Policy and Cookies Policy.
                </p>
            </div>

            <div className="auth-card switch-card">
                <p>Have an account? <button type="button" onClick={onSwitch} className="switch-btn">Log in</button></p>
            </div>

            <div className="auth-bottom-info">
                <p>from</p>
                <p className="company-name">AChat Team</p>
            </div>
        </div>
    );
}