// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, setAnalyticsCollectionEnabled, isSupported, Analytics } from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
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

let analyticsInstance: Analytics | null = null;
let dbInstance: Database | null = null;

export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (analyticsInstance) return analyticsInstance;
  
  try {
    if (await isSupported()) {
      analyticsInstance = getAnalytics(app);
      // Enable debug mode in development
      if (process.env.NODE_ENV === 'development') {
        setAnalyticsCollectionEnabled(analyticsInstance, true);
        console.log('🔍 Firebase Analytics debug mode enabled');
      }
      return analyticsInstance;
    }
  } catch (error) {
    console.log('⚠️ Firebase Analytics not supported in this environment');
  }
  return null;
};

export const getDbInstance = (): Database => {
  if (!dbInstance) {
    dbInstance = getDatabase(app);
  }
  return dbInstance;
};

export { app };