// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC_ex-CJMY0gvr5k7LxD8Y5F8D3-33ttpg",
  authDomain: "arnrueng.firebaseapp.com",
  databaseURL: "https://arnrueng-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "arnrueng",
  storageBucket: "arnrueng.firebasestorage.app",
  messagingSenderId: "167765033128",
  appId: "1:167765033128:web:cfd1740cfe3f12e738c29d",
  measurementId: "G-RSLNK1M68Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);