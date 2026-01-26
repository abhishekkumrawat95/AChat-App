# AChat - Real-Time Chat Application

AChat is a full-stack, real-time messaging application inspired by modern chat apps like WhatsApp and Instagram. It features a React.js frontend, a Node.js/Socket.IO backend, and Firebase for data storage and authentication.

## 🚀 Live Demo

You can try the live application here: **[https://akchatcc.vercel.app](https://akchatcc.vercel.app)**

## ✨ Features

* **Full User Authentication:** Secure login and registration.
* **Real-Time Messaging:** Instant message delivery powered by Socket.IO.
* **Push Notifications:** Get notified of new messages even when the app is closed (using Firebase Cloud Messaging).
* **Rich Chat Experience:**
    * Swipe-to-Reply functionality.
    * Long-press to delete messages (for everyone).
    * Read receipts (double-tick "seen" status).
* **Profile Customization:** Upload and change profile pictures, which are stored in Firebase Storage.
* **User Presence:** See a list of all chat partners with their real-time online/offline status.
* **User Search:** Find and start new conversations with any registered user.
* **Chat Management:** Long-press on a chat in the sidebar to:
    * Clear the chat history.
    * Delete the entire chat permanently.
* **Modern UI/UX:**
    * Dark Mode and Light Mode theme toggle.
    * Fully responsive design for mobile, tablet, and desktop.
    * Smooth, app-like "zoom and fade" page transitions on mobile.

## 🛠️ Tech Stack

* **Frontend (Client):** React.js, React Hooks
* **Backend (Server):** Node.js, Express.js
* **Real-Time Communication:** Socket.IO
* **Database & Services:**
    * **Firebase Authentication:** For user login/registration.
    * **Firestore:** For storing user data, chat lists, and messages.
    * **Firebase Storage:** For storing user profile pictures.
    * **Firebase Cloud Messaging (FCM):** For push notifications.
* **Deployment:**
    * Client deployed on **Vercel**.
    * Server deployed on **Render**.

