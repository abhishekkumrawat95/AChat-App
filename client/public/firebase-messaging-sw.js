// client/public/firebase-messaging-sw.js

// Firebase SDKs ko import karein
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// === YAHAN APNI ASLI KEYS DAALEIN ===
// Yeh values aap apni .env.local file se copy kar sakte hain
const firebaseConfig = {
  apiKey: "AIzaSyAM6oTK6tmdKEINW_mTj8V-zH-q8HG6q6A",
  authDomain: "achat-app-6e714.firebaseapp.com",
  projectId: "achat-app-6e714",
  storageBucket: "achat-app-6e714.firebasestorage.app",
  messagingSenderId: "1078644008003",
  appId: "1:1078644008003:web:6c2b9b960960715054a0f6",
  measurementId: "G-R479F3BJ0P"
};

// Firebase ko initialize karein
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Aapka app ka icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});