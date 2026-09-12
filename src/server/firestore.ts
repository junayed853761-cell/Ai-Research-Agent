import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-518fe",
  appId: "1:677355423201:web:d5325d83ac986b6fa03ea0",
  apiKey: "AIzaSyAJYhQRZD_FccSM2UiqyNpvFqT8iMDZUk4",
  authDomain: "ai-studio-applet-webapp-518fe.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-researchpilotai-fb5889c7-efed-44bc-8a80-230768c1d565",
  storageBucket: "ai-studio-applet-webapp-518fe.firebasestorage.app",
  messagingSenderId: "677355423201",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, setDoc, deleteDoc };
