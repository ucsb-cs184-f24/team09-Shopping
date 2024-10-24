// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAIisoo0pjv136kyuMzmdEiTF9LbsjIk0I",
  authDomain: "sampleproj-cf88c.firebaseapp.com",
  projectId: "sampleproj-cf88c",
  storageBucket: "sampleproj-cf88c.appspot.com",
  messagingSenderId: "870440475194",
  appId: "1:870440475194:web:42ba73c55d7c7ea0107303",
  measurementId: "G-2N8T01RN8S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);