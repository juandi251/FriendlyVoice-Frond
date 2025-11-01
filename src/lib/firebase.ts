// src/lib/firebase.ts
// Este archivo inicializa tu conexión con Firebase y exporta los servicios que usarás.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Importa el servicio de Autenticación
import { getFirestore } from 'firebase/firestore'; // Importa el servicio de Firestore (Base de Datos)
import { getStorage } from 'firebase/storage'; // Importa el servicio de Storage (Almacenamiento de Archivos)

// ¡¡¡TU CONFIGURACIÓN REAL DE FIREBASE VA AQUÍ!!!
// Asegúrate de que estos valores son EXACTOS los de tu consola de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyCTzDY5HN6DRWQk6INfjQL7VuO6modk9XI", // <--- ¡Tu API Key real!
  authDomain: "friendlyvoice-app.firebaseapp.com",
  projectId: "friendlyvoice-app",
  storageBucket: "friendlyvoice-app.appspot.com", // Bucket correcto para Firebase Storage
  messagingSenderId: "148877018957",
  appId: "1:148877018957:web:88d20d9381ac74a1245904",
  measurementId: "G-5ZPLNR1ZWK" // Opcional, si usas Google Analytics
};

// Inicializar Firebase de forma segura para Next.js (evita inicializar múltiples veces en hot-reload)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa y exporta los servicios de Firebase
const auth = getAuth(app);    // Servicio de Autenticación
const db = getFirestore(app); // Servicio de Base de Datos (Firestore)
const storage = getStorage(app); // Servicio de Almacenamiento (Storage)

export { app, auth, db, storage }; // ¡¡¡Exporta los servicios para poder usarlos en otros archivos!!!
