import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken } from "firebase/messaging";

// Aapka Firebase config object
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

// Is function ko update karein
export const requestForToken = async () => {
  try {
    // === AAPKI VAPID KEY YAHAN PASTE KAR DI GAYI HAI ===
    const vapidKey = 'BJ0eukhNfP3_i3kjcn1imNTkbI9gTnedNZF_Ur5q2eAJeTRe1w_Oy-dY6i9mWOlRukgiTAe0OcgAoohwppajnZs';
    const currentToken = await getToken(messaging, { vapidKey: vapidKey });
    
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token.', err);
    return null;
  }
};