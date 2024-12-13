// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAvSUVYg74EUq51RSxkmNuRKNhuZUaFJx0",
  authDomain: "wordbank2-4ba34.firebaseapp.com",
  databaseURL: "https://wordbank2-4ba34-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wordbank2-4ba34",
  storageBucket: "wordbank2-4ba34.firebasestorage.app",
  messagingSenderId: "255042775400",
  appId: "1:255042775400:web:f37ed918d226653f97cedd",
  measurementId: "G-SPBQSDC1DL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);