import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnH58lyhKRtkRhkueURuklrN2iooFJdaI",
  authDomain: "daily-routine-e7bc0.firebaseapp.com",
  projectId: "daily-routine-e7bc0",
  storageBucket: "daily-routine-e7bc0.firebasestorage.app",
  messagingSenderId: "345514243457",
  appId: "1:345514243457:web:a63d0d43f60b5091006480"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use robust cache settings with multiple tab support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager() 
  }),
  // This helps prevent internal SDK metadata mismatches
  ignoreUndefinedProperties: true
});

export default app;
