import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot,
    orderBy,
    doc,
    getDoc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
    const newServiceForm = document.getElementById('new-service-form');
    const servicesTableBody = document.getElementById('services-table-body');
    const editingServiceIdInput = document.getElementById('editing-service-id');
    const formTitle = document.getElementById('form-title');
    const saveServiceBtn = document.getElementById('save-service-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    let unsubscribeFromServices = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
                listenToServices();
            } else {
                alert("Acesso negado. Esta área é restrita aos administradores.");
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });

    function listenToServices() {
        if (unsubscribeFromServices) unsubscribeFromServices();
        const q = query(collection(db, "services"), where("ownerId", "==", companyId), orderBy("name"));
        unsubscribeFromServices = onSnapshot(q, (snapshot) => {
            const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderServicesTable(services);
        });
    }

    newServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceData = {
            name: document.getElementById('new-service-name').value,
            price: parseFloat(document.getElementById('new-service-price').value),
            ownerId: companyId
        };

        const editingId = editingServiceIdInput.value;
        try {
            if (editingId) {
                await updateDoc(doc(db, "services", editingId), serviceData);
            } else {
                await addDoc(collection(db, "services"), serviceData);
            }
            resetForm();
        } catch (error) {
            console.error("Erro ao salvar serviço:", error);
            alert("Erro ao salvar serviço.");
        }
    });

    cancelEditBtn.addEventListener('click', resetForm);

    function renderServicesTable(services) {
        if (!servicesTableBody) return;
        servicesTableBody.innerHTML = '';
        if (services.length === 0) {
            servicesTableBody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">Nenhum serviço cadastrado.</td></tr>';
            return;
        }

        services.forEach(service => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-700 hover:bg-gray-700/50';
            row.innerHTML = `
                <td class="p-4 text-gray-200">${service.name}</td>
                <td class="p-4 text-gray-400">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</td>
                <td class="p-4 text-gray-400">
                    <button data-id="${service.id}" class="edit-btn text-blue-400 p-1">Editar</button>
                    <button data-id="${service.id}" class="delete-btn text-red-400 p-1">Excluir</button>
                </td>
            `;
            servicesTableBody.appendChild(row);
        });
    }

    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const serviceId = e.target.dataset.id;
            const serviceDoc = await getDoc(doc(db, "services", serviceId));
            if (serviceDoc.exists()) {
                const service = serviceDoc.data();
                document.getElementById('new-service-name').value = service.name;
                document.getElementById('new-service-price').value = service.price;
                editingServiceIdInput.value = serviceId;
                formTitle.textContent = "Editar Serviço";
                saveServiceBtn.textContent = "Salvar Alterações";
                cancelEditBtn.classList.remove('hidden');
            }
        }

        if (e.target.classList.contains('delete-btn')) {
            if (confirm("Tem certeza que deseja excluir este serviço?")) {
                try {
                    await deleteDoc(doc(db, "services", e.target.dataset.id));
                } catch (error) {
                    console.error("Erro ao excluir serviço:", error);
                    alert("Erro ao excluir serviço.");
                }
            }
        }
    });
    
    function resetForm() {
        newServiceForm.reset();
        editingServiceIdInput.value = '';
        formTitle.textContent = "Cadastrar Novo Serviço";
        saveServiceBtn.textContent = "Salvar Serviço";
        cancelEditBtn.classList.add('hidden');
    }
});
