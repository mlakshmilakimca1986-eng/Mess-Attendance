// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDNVz4RP1qx1EeYdVpyqRaFkOq7DL1aXMs",
    authDomain: "mess-attendance-sri-chaitanya.firebaseapp.com",
    projectId: "mess-attendance-sri-chaitanya",
    storageBucket: "mess-attendance-sri-chaitanya.firebasestorage.app",
    messagingSenderId: "318493806053",
    appId: "1:318493806053:web:5c82c39057e58cefec730c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export { app, analytics };
export default app;
