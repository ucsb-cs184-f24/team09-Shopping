import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// Initialize Firebase Authentication
const auth = getAuth(app);

export { auth };