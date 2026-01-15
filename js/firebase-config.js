// Go Mission - Firebase Configuration
// Project: shaped-by-grace

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBarR1ENd5qBWHZBGhKdxa-Zrw3Y8XpoT4",
  authDomain: "shaped-by-grace.firebaseapp.com",
  projectId: "shaped-by-grace",
  storageBucket: "shaped-by-grace.firebasestorage.app",
  messagingSenderId: "421948043828",
  appId: "1:421948043828:web:4a8eb4ac2aa34df4c89061"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export for use in other modules
export { 
  app, 
  db, 
  auth,
  // Firestore functions
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  // Auth functions
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword
};
