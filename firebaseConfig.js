import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqZfBoHz9xHQauW8AujAtYWCb-wbVRoak",
  authDomain: "team09shopping.firebaseapp.com",
  projectId: "team09shopping",
  storageBucket: "team09shopping.appspot.com",
  messagingSenderId: "109915220092",
  appId: "1:109915220092:web:f00008ccde2f52b8f781f9"
};

let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

const auth = getAuth(app);

export { auth }
