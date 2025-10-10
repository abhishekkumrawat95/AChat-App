import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAM6oTK6tmdKEINW_mTj8V-zH-q8HG6q6A",
  authDomain: "achat-app-6e714.firebaseapp.com",
  projectId: "achat-app-6e714",
  storageBucket: "achat-app-6e714.appspot.com",
  messagingSenderId: "1078644008003",
  appId: "1:1078644008003:web:6c2b9b960960715054a0f6",
  measurementId: "G-R479F3BJ0P"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);