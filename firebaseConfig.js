import { initializeApp, getApps } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBnNDW20WqSlYlUg_P5sl_cCQMFoQgUILk",
  authDomain: "team09-shopping-740a4.firebaseapp.com",
  projectId: "team09-shopping-740a4",
  storageBucket: "team09-shopping-740a4.appspot.com",
  messagingSenderId: "1060525013453",
  appId: "1:1060525013453:web:5e72acd7453787629dec84"
};

// Initialize Firebase only if it hasn't been initialized yet
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export { auth };