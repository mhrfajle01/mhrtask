import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, increment, writeBatch, collection, getDocs } from "firebase/firestore";
import confetti from "canvas-confetti";
import LoadingSpinner from "../components/LoadingSpinner";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Auth functions
  const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  // Helper to get the "App Day" (Resets at 3 AM local BD time)
  const getAppDay = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 3) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toDateString();
    }
    return now.toDateString();
  };

  useEffect(() => {
    let unsubUser = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (unsubUser) unsubUser();
      setCurrentUser(user);
      
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const today = getAppDay();

        if (!userSnap.exists()) {
          const initialStats = { 
            xp: 0, level: 1, str: 0, int: 0, spr: 0, cha: 0,
            streak: 0, highestStreak: 0, totalDaysConnected: 0, totalMinutes: 0,
            lastActiveDate: today, lastResetDate: today,
            actionsToday: 0,
            morningTime: 0, afternoonTime: 0, nightTime: 0,
            dayLocked: false, isProtected: false
          };
          await setDoc(userRef, initialStats);
        } else {
          const data = userSnap.data();
          if (data.lastActiveDate !== today) {
            const update = { 
              actionsToday: 0, 
              morningTime: 0, afternoonTime: 0, nightTime: 0,
              dayLocked: false,
              isProtected: false,
              lastActiveDate: today 
            };
            
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = yesterdayDate.toDateString();
            
            if (data.lastActiveDate !== yesterdayStr || (!data.dayLocked && !data.isProtected)) {
              if (data.lastActiveDate !== yesterdayStr) {
                update.streak = 0;
              }
            }
            
            await updateDoc(userRef, update);

            if (data.lastResetDate !== today) {
              const batch = writeBatch(db);
              const routinesRef = collection(db, "users", user.uid, "routines");
              const routinesSnap = await getDocs(routinesRef);
              routinesSnap.forEach((doc) => {
                if (doc.data().completed) batch.update(doc.ref, { completed: false });
              });
              batch.update(userRef, { lastResetDate: today });
              await batch.commit();
            }
          }
        }

        unsubUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) setUserData(doc.data());
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  // Circadian Timer Logic
  useEffect(() => {
    if (!currentUser || !userData) return;
    
    let localSeconds = 0;
    const timer = setInterval(async () => {
      localSeconds += 1;
      setSessionSeconds(localSeconds);
      
      if (localSeconds % 20 === 0) {
        const hour = new Date().getHours();
        let segment = "";
        
        if (hour >= 3 && hour < 12) segment = "morningTime";
        else if (hour >= 12 && hour < 18) segment = "afternoonTime";
        else if (hour >= 18 || hour < 3) segment = "nightTime";

        if (segment && (userData[segment] || 0) < 120) {
          const userRef = doc(db, "users", currentUser.uid);
          const update = {
            [segment]: increment(20)
          };
          
          const isMorningDone = segment === "morningTime" ? ((userData.morningTime || 0) + 20 >= 120) : (userData.morningTime >= 120);
          const isAfternoonDone = segment === "afternoonTime" ? ((userData.afternoonTime || 0) + 20 >= 120) : (userData.afternoonTime >= 120);
          const isNightDone = segment === "nightTime" ? ((userData.nightTime || 0) + 20 >= 120) : (userData.nightTime >= 120);
          
          if (isMorningDone && isAfternoonDone && isNightDone && (userData.actionsToday >= 2) && !userData.dayLocked) {
            update.dayLocked = true;
            const newStreak = (userData.streak || 0) + 1;
            update.streak = newStreak;
            update.totalDaysConnected = increment(1);
            update.totalMinutes = increment(6);
            if (newStreak > (userData.highestStreak || 0)) update.highestStreak = newStreak;
            confetti({ particleCount: 150, spread: 70 });
          }
          
          await updateDoc(userRef, update);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentUser, !!userData]);

  const addXP = async (amount, statType = null) => {
    if (!currentUser) return;
    if (navigator.vibrate) navigator.vibrate(25);

    const userRef = doc(db, "users", currentUser.uid);
    const actionsToday = (userData?.actionsToday || 0);
    let efficiency = 1.0;
    if (actionsToday > 3) efficiency = 0.5;
    if (actionsToday > 8) efficiency = 0.2;

    const multiplier = 1.0 + ((userData?.streak || 0) * 0.1);
    const adjustedAmount = amount > 0 ? Math.round(amount * multiplier * efficiency) : amount;
    
    const updateData = { 
      xp: increment(adjustedAmount)
    };

    if (amount > 0) {
      updateData.actionsToday = increment(1);
      const currentActions = (userData?.actionsToday || 0) + 1;
      if (currentActions >= 2 && !userData?.isProtected) {
        updateData.isProtected = true;
      }
    }

    if (statType && ['str', 'int', 'spr', 'cha'].includes(statType)) {
      updateData[statType] = increment(amount > 0 ? 1 : -1);
    }
    
    const isMorningDone = (userData?.morningTime || 0) >= 120;
    const isAfternoonDone = (userData?.afternoonTime || 0) >= 120;
    const isNightDone = (userData?.nightTime || 0) >= 120;
    const currentActions = (userData?.actionsToday || 0) + (amount > 0 ? 1 : 0);

    if (isMorningDone && isAfternoonDone && isNightDone && currentActions >= 2 && !userData?.dayLocked) {
      updateData.dayLocked = true;
      const newStreak = (userData?.streak || 0) + 1;
      updateData.streak = newStreak;
      updateData.totalDaysConnected = increment(1);
      updateData.totalMinutes = increment(6);
      if (newStreak > (userData?.highestStreak || 0)) updateData.highestStreak = newStreak;
      confetti({ particleCount: 150, spread: 60 });
    }

    const newXP = (userData?.xp || 0) + adjustedAmount;
    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
    if (newLevel > (userData?.level || 1) && amount > 0) {
      confetti({ particleCount: 200, colors: ['#ff00ff', '#00d4ff'] });
      updateData.level = newLevel;
    }

    await updateDoc(userRef, updateData);
  };

  const value = { currentUser, userData, signup, login, logout, addXP, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};
