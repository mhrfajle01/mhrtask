import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { auth, db } from "../firebase/config";
import { doc, getDoc, setDoc, onSnapshot, updateDoc, increment, writeBatch, collection, getDocs, addDoc, query, orderBy, limit, serverTimestamp, where } from "firebase/firestore";
import confetti from "canvas-confetti";
import LoadingSpinner from "../components/LoadingSpinner";
import playSound from "../utils/sfx";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToast, setActiveToast] = useState(null);
  const [protectionNotified, setProtectionNotified] = useState(false);

  // Auth functions
  const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  const pushNotification = async (notif) => {
    if (!currentUser) return;
    try {
      // FIX: Simplified query to avoid composite index error
      if (notif.type === 'xp_gain') {
        const recentNotifsQuery = query(
          collection(db, "users", currentUser.uid, "notifications"),
          orderBy("timestamp", "desc"),
          limit(3) // Check last few to see if we can stack
        );
        const snapshot = await getDocs(recentNotifsQuery);
        const match = snapshot.docs.find(d => {
          const data = d.data();
          return data.type === 'xp_gain' && data.statType === notif.statType && !data.read;
        });

        if (match) {
          const lastData = match.data();
          const lastTime = lastData.timestamp?.toDate() || new Date();
          const tenMinsAgo = new Date(Date.now() - 10 * 60000);
          
          if (lastTime > tenMinsAgo) {
            const newCount = (lastData.stackCount || 1) + 1;
            const newXP = (lastData.totalXP || lastData.amount || 0) + (notif.amount || 0);
            await updateDoc(match.ref, {
              totalXP: newXP,
              stackCount: newCount,
              title: `+${newXP} ${notif.statType.toUpperCase()} XP`,
              message: `Accumulated from ${newCount} activities.`,
              timestamp: serverTimestamp()
            });
            return;
          }
        }
      }

      const finalNotif = {
        ...notif,
        timestamp: serverTimestamp(),
        read: false,
        rarity: notif.rarity || 'common',
        category: notif.category || 'system'
      };

      await addDoc(collection(db, "users", currentUser.uid, "notifications"), finalNotif);
      setActiveToast(finalNotif);
      playSound(notif.rarity === 'epic' || notif.rarity === 'legendary' ? 'fanfare' : 'complete');
      setTimeout(() => setActiveToast(null), 4000);
    } catch (e) { console.error("Notif error", e); }
  };

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
    let unsubNotifs = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (unsubUser) unsubUser();
      if (unsubNotifs) unsubNotifs();
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
            actionsToday: 0, morningTime: 0, afternoonTime: 0, nightTime: 0,
            dayLocked: false, isProtected: false
          };
          await setDoc(userRef, initialStats);
        } else {
          const data = userSnap.data();
          if (data.lastActiveDate !== today) {
            const update = { actionsToday: 0, morningTime: 0, afternoonTime: 0, nightTime: 0, dayLocked: false, isProtected: false, lastActiveDate: today };
            const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
            if (data.lastActiveDate !== yesterdayStr || (!data.dayLocked && !data.isProtected)) {
              if (data.lastActiveDate !== yesterdayStr) update.streak = 0;
            }
            await updateDoc(userRef, update);
            setProtectionNotified(false); // Reset session guard
            if (data.lastResetDate !== today) {
              const batch = writeBatch(db);
              const routinesRef = collection(db, "users", user.uid, "routines");
              const routinesSnap = await getDocs(routinesRef);
              routinesSnap.forEach((doc) => { if (doc.data().completed) batch.update(doc.ref, { completed: false }); });
              batch.update(userRef, { lastResetDate: today });
              await batch.commit();
            }
          } else if (data.isProtected) {
            setProtectionNotified(true);
          }
        }

        unsubUser = onSnapshot(userRef, (doc) => { if (doc.exists()) setUserData(doc.data()); setLoading(false); });
        const notifQuery = query(collection(db, "users", user.uid, "notifications"), orderBy("timestamp", "desc"), limit(50));
        unsubNotifs = onSnapshot(notifQuery, (snapshot) => {
          const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setNotifications(notifs);
          setUnreadCount(notifs.filter(n => !n.read).length);
        });
      } else {
        setUserData(null);
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
    });

    return () => { unsubscribe(); if (unsubUser) unsubUser(); if (unsubNotifs) unsubNotifs(); };
  }, []);

  useEffect(() => {
    if (!currentUser || !userData) return;
    let localSeconds = 0;
    const timer = setInterval(async () => {
      localSeconds += 1;
      if (localSeconds % 20 === 0) {
        const hour = new Date().getHours();
        let segment = "";
        if (hour >= 3 && hour < 12) segment = "morningTime";
        else if (hour >= 12 && hour < 18) segment = "afternoonTime";
        else if (hour >= 18 || hour < 3) segment = "nightTime";

        if (segment && (userData[segment] || 0) < 120) {
          const userRef = doc(db, "users", currentUser.uid);
          const update = { [segment]: increment(20) };
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
            pushNotification({ type: 'quest_complete', title: 'Daily Quest Complete!', message: `Streak increased to ${newStreak} days!`, icon: 'bi-trophy-fill', color: 'warning', rarity: 'epic', category: 'quest' });
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
    let efficiency = actionsToday > 8 ? 0.2 : actionsToday > 3 ? 0.5 : 1.0;
    const adjustedAmount = amount > 0 ? Math.round(amount * (1.0 + ((userData?.streak || 0) * 0.1)) * efficiency) : amount;
    const updateData = { xp: increment(adjustedAmount) };

    if (amount > 0) {
      updateData.actionsToday = increment(1);
      // FIX: Protection guard to avoid notification spam
      if (((userData?.actionsToday || 0) + 1) >= 2 && !userData?.isProtected && !protectionNotified) {
        updateData.isProtected = true;
        setProtectionNotified(true);
        pushNotification({ type: 'streak_saved', title: 'Streak Protected!', message: 'Your streak is safe for today.', icon: 'bi-shield-fill-check', color: 'success', rarity: 'rare', category: 'system' });
      }
      if (statType) {
        pushNotification({ type: 'xp_gain', amount: adjustedAmount, statType, title: `+${adjustedAmount} ${statType.toUpperCase()} XP`, message: `Progress in ${statType.toUpperCase()}.`, icon: 'bi-lightning-fill', color: 'primary', rarity: 'common', category: 'progression' });
      }
    }
    if (statType && ['str', 'int', 'spr', 'cha'].includes(statType)) updateData[statType] = increment(amount > 0 ? 1 : -1);
    
    const isMorningDone = (userData?.morningTime || 0) >= 120;
    const isAfternoonDone = (userData?.afternoonTime || 0) >= 120;
    const isNightDone = (userData?.nightTime || 0) >= 120;
    if (isMorningDone && isAfternoonDone && isNightDone && ((userData?.actionsToday || 0) + (amount > 0 ? 1 : 0)) >= 2 && !userData?.dayLocked) {
      updateData.dayLocked = true;
      const newStreak = (userData?.streak || 0) + 1;
      updateData.streak = newStreak;
      updateData.totalDaysConnected = increment(1);
      updateData.totalMinutes = increment(6);
      if (newStreak > (userData?.highestStreak || 0)) updateData.highestStreak = newStreak;
      confetti({ particleCount: 150, spread: 60 });
      pushNotification({ type: 'quest_complete', title: 'Daily Quest Complete!', message: `Streak increased to ${newStreak} days!`, icon: 'bi-trophy-fill', color: 'warning', rarity: 'epic', category: 'quest' });
    }

    const newLevel = Math.floor(Math.sqrt(((userData?.xp || 0) + adjustedAmount) / 100)) + 1;
    if (newLevel > (userData?.level || 1) && amount > 0) {
      confetti({ particleCount: 200, colors: ['#ff00ff', '#00d4ff'] });
      updateData.level = newLevel;
      pushNotification({ type: 'level_up', title: `Level Up: LVL ${newLevel}!`, message: 'You have reached a new mastery level.', icon: 'bi-stars', color: 'info', rarity: 'legendary', category: 'progression', action: '/profile' });
    }
    await updateDoc(userRef, updateData);
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, "users", currentUser.uid, "notifications", n.id), { read: true }));
    await batch.commit();
  };

  const value = { currentUser, userData, signup, login, logout, addXP, loading, notifications, unreadCount, markAllAsRead, activeToast };
  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};
