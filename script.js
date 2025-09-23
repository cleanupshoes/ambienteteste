/*
  Arquivo de Scripts para o sistema Clean UP Shoes
  Responsável pela interatividade da página de Ordens de Serviço (index.html).
*/

// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    doc, 
    updateDoc, 
    getDoc, 
    deleteDoc, 
    Timestamp,
    onSnapshot,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// --- INICIALIZAÇÃO E CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyD0rAIgby5QLjhri3OD_KuEBVLCRrtkobE",
  authDomain: "cleanupshoes.firebaseapp.com",
  projectId: "cleanupshoes",
  storageBucket: "cleanupshoes.appspot.com",
  messagingSenderId: "520346701564",
  appId: "1:520346701564:web:fd13aedc5430b2e2a4d179"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const companyId = "oNor7X6GwkcgWtsvyL0Dg4tamwI3";

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA DO MENU HAMBÚRGUER ---
    const menuToggle = document.getElementById('menu-toggle');
    const menuLinks = document.getElementById('menu-links');

    if (menuToggle && menuLinks) {
        menuToggle.addEventListener('click', () => {
            menuLinks.classList.toggle('hidden');
        });
    }

    // --- SELETORES DE ELEMENTOS ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    // ... resto do seu código JavaScript ...
});
