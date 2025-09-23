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

    // --- SELETORES DE ELEMENTOS ---
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const addOrderBtn = document.getElementById('add-order-btn');
    const openOrdersList = document.getElementById('open-orders-list');
    const finishedOrdersList = document.getElementById('finished-orders-list');
    const printArea = document.getElementById('print-area');
    const searchInput = document.getElementById('search-input');
    
    // Modal de Nova Ordem / Edição
    const newOrderModal = document.getElementById('new-order-modal');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const newOrderForm = document.getElementById('new-order-form');
    const saveOrderBtn = document.getElementById('save-order-btn');
    const editingOrderIdInput = document.getElementById('editing-order-id');
    
    const customerSearchInput = document.getElementById('customer-search-input');
    const customerSearchResults = document.getElementById('customer-search-results');
    const selectedCustomerIdInput = document.getElementById('selected-customer-id');
    const clientPhoneInput = document.getElementById('client-phone');
    const identificationTagInput = document.getElementById('identification-tag');
    const serviceItemsContainer = document.getElementById('service-items-container');
    const addServiceBtn = document.getElementById('add-service-btn');
    const totalValueDisplay = document.getElementById('total-value-display');
    const observationsInput = document.getElementById('observations');
    const paymentStatusCheckbox = document.getElementById('payment-status-checkbox');
    
    // Modal de Confirmação
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalContent = document.getElementById('confirm-modal-content');
    const confirmModalText = document.getElementById('confirm-modal-text');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    
    // Modal de Finalização
    const finishOrderModal = document.getElementById('finish-order-modal');
    const finishOrderModalContent = document.getElementById('finish-order-modal-content');
    const finishOrderForm = document.getElementById('finish-order-form');
    const finishCancelBtn = document.getElementById('finish-cancel-btn');
    const technicianNameInput = document.getElementById('technician-name');

    const dashboardLink = document.getElementById('dashboard-link');

    let allOrdersCache = [];
    let allCustomersCache = [];
    let currentOrderItems = [];
    let selectedCustomerData = null;
    let unsubscribeFromOrders = null; 
    let unsubscribeFromCustomers = null;
    let confirmCallback = null;
    let orderIdToFinish = null;
    let currentUserRole = null; // Variável para guardar a permissão do usuário

    // --- LÓGICA DE AUTENTICAÇÃO E PERMISSÕES ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Usuário logado, agora vamos buscar sua permissão (role)
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                currentUserRole = userDocSnap.data().role; // 'admin' ou 'colaborador'
            } else {
                // Se não encontrar o documento do usuário, define como a permissão mais baixa
                currentUserRole = 'colaborador'; 
                console.log("Documento de usuário não encontrado, aplicando permissão de colaborador.");
            }

            // Esconde/mostra o link do dashboard baseado na permissão
            if (dashboardLink) {
                dashboardLink.style.display = currentUserRole === 'admin' ? 'flex' : 'none';
            }

            // Exibe o painel principal
            if (loginSection) loginSection.classList.add('hidden');
            if (dashboardSection) dashboardSection.classList.remove('hidden');
            
            // Habilita o botão de nova ordem (se já tiver carregado os clientes)
            if(addOrderBtn && allCustomersCache.length > 0) {
                addOrderBtn.disabled = false;
                addOrderBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                 addOrderBtn.disabled = true;
                 addOrderBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            
            // Inicia os listeners de dados
            listenToOrders();
            listenToCustomers();

        } else {
            // Usuário deslogado
            currentUserRole = null;
            if (dashboardSection) dashboardSection.classList.add('hidden');
            if (loginSection) loginSection.classList.remove('hidden');
            if (unsubscribeFromOrders) unsubscribeFromOrders();
            if (unsubscribeFromCustomers) unsubscribeFromCustomers();
        }
    });

    if (loginForm) loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, loginForm.email.value, loginForm.password.value);
        } catch (error) {
            alert('E-mail ou senha inválidos.');
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

    // --- LÓGICA GERAL E FUNÇÕES AUXILIARES ---
    function openModal(modal, content) {
        if (!modal || !content) return;
        modal.classList.remove('hidden');
        setTimeout(() => content.classList.add('scale-100', 'opacity-100'), 10);
    }

    function closeModal(modal, content) {
        if (!modal || !content) return;
        content.classList.remove('scale-100', 'opacity-100');
        setTimeout(() => modal.classList.add('hidden'), 200);
    }

    function showConfirm(message, callback) {
        if(confirmModalText) confirmModalText.textContent = message;
        confirmCallback = callback;
        openModal(confirmModal, confirmModalContent);
    }

    // --- EVENTOS DE MODAIS ---
    if(addOrderBtn) addOrderBtn.addEventListener('click', () => {
        resetNewOrderForm();
        modalTitle.textContent = "Nova Ordem de Serviço";
        saveOrderBtn.textContent = "Salvar Ordem";
        openModal(newOrderModal, modalContent);
    });

    if(closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal(newOrderModal, modalContent));
    if(cancelModalBtn) cancelModalBtn.addEventListener('click', () => closeModal(newOrderModal, modalContent));
    if(confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => closeModal(confirmModal, confirmModalContent));
    if(confirmOkBtn) confirmOkBtn.addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        closeModal(confirmModal, confirmModalContent);
    });
    if(finishCancelBtn) finishCancelBtn.addEventListener('click', () => closeModal(finishOrderModal, finishOrderModalContent));

    // --- LÓGICA DE DADOS (FIREBASE LISTENERS) ---
    function listenToCustomers() {
        if (unsubscribeFromCustomers) unsubscribeFromCustomers();
        const q = query(collection(db, "customers"), where("ownerId" ,"==", companyId), orderBy("name"));
        unsubscribeFromCustomers = onSnapshot(q, (snapshot) => {
            allCustomersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (addOrderBtn) {
                addOrderBtn.disabled = false;
                addOrderBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    function listenToOrders() {
        if (unsubscribeFromOrders) unsubscribeFromOrders();
        const q = query(collection(db, "orders"), where("ownerId", "==", companyId), orderBy("dataEntrada", "desc"));
        unsubscribeFromOrders = onSnapshot(q, (snapshot) => {
            allOrdersCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderFilteredOrders();
        });
    }

    // --- LÓGICA DE BUSCA DE CLIENTES (NO MODAL) ---
    if(customerSearchInput) customerSearchInput.addEventListener('input', () => {
        const searchTerm = customerSearchInput.value.toLowerCase();
        customerSearchResults.innerHTML = '';
        if (!searchTerm) {
            customerSearchResults.classList.add('hidden');
            return;
        }
        const filtered = allCustomersCache.filter(c => c.name.toLowerCase().includes(searchTerm));
        if (filtered.length > 0) {
            filtered.forEach(customer => {
                const item = document.createElement('div');
                item.className = 'p-2 hover:bg-gray-700 cursor-pointer';
                item.textContent = customer.name;
                item.dataset.id = customer.id;
                item.dataset.phone = customer.phone;
                item.dataset.cpf = customer.cpf || '';
                customerSearchResults.appendChild(item);
            });
            customerSearchResults.classList.remove('hidden');
        } else {
            customerSearchResults.classList.add('hidden');
        }
    });

    if(customerSearchResults) customerSearchResults.addEventListener('click', (e) => {
        if (e.target.tagName === 'DIV') {
            customerSearchInput.value = e.target.textContent;
            selectedCustomerIdInput.value = e.target.dataset.id;
            clientPhoneInput.value = e.target.dataset.phone;
            selectedCustomerData = allCustomersCache.find(c => c.id === e.target.dataset.id);
            customerSearchResults.classList.add('hidden');
        }
    });

    // --- LÓGICA DO FORMULÁRIO DE NOVA ORDEM / EDIÇÃO ---
    function resetNewOrderForm() {
        if(newOrderForm) newOrderForm.reset();
        editingOrderIdInput.value = '';
        selectedCustomerData = null;
        currentOrderItems = [];
        if(identificationTagInput) identificationTagInput.value = '';
        addServiceItem();
    }
    
    function addServiceItem(item = { service: '', item: '', price: 0 }) {
        currentOrderItems.push(item);
        renderServiceItems();
    }

    function removeServiceItem(index) {
        currentOrderItems.splice(index, 1);
        renderServiceItems();
    }

    function updateServiceItem(index, field, value) {
        currentOrderItems[index][field] = value;
        if (field === 'price') calculateTotal();
    }
    
    function calculateTotal() {
        const total = currentOrderItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
        if(totalValueDisplay) totalValueDisplay.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
    }

    function renderServiceItems() {
        if(!serviceItemsContainer) return;
        serviceItemsContainer.innerHTML = '';
        currentOrderItems.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/50 rounded-lg relative';
            itemEl.innerHTML = `
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-400">Tipo de Serviço</label>
                    <select data-index="${index}" class="service-type-select w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg">
                        <option value="" data-price="0">Selecione um serviço</option>
                        <option value="Higienização Completa" data-price="60">Higienização Completa</option>
                        <option value="Higienização Premium" data-price="80">Higienização Premium</option>
                        <option value="Higienização de Boné" data-price="40">Higienização de Boné</option>
                        <option value="Higienização de Bolsa" data-price="70">Higienização de Bolsa</option>
                        <option value="Reparo de Pintura ou Tecido" data-price="150">Reparo de Pintura ou Tecido</option>
                        <option value="Pintura de Midsole" data-price="100">Pintura de Midsole</option>
                        <option value="Impermeabilização" data-price="35">Impermeabilização</option>
                        <option value="Outro" data-price="0">Outro Valor</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Valor (R$)</label>
                    <input type="number" data-index="${index}" class="service-value-input w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg" value="${item.price}" required>
                </div>
                <div class="md:col-span-3">
                    <label class="block text-sm font-medium text-gray-400">Modelo do Tênis / Item</label>
                    <input type="text" data-index="${index}" class="service-item-input w-full px-4 py-2 mt-1 text-gray-200 bg-gray-700 border border-gray-600 rounded-lg" value="${item.item}" required>
                </div>
                ${currentOrderItems.length > 1 ? `<button type="button" data-index="${index}" class="remove-service-btn absolute top-2 right-2 text-red-400">&times;</button>` : ''}
            `;
            const valueInput = itemEl.querySelector('.service-value-input');
            const typeSelect = itemEl.querySelector('.service-type-select');
            typeSelect.value = item.service;
            valueInput.readOnly = item.service && item.service !== 'Outro';
            serviceItemsContainer.appendChild(itemEl);
        });
        calculateTotal();
    }

    if(addServiceBtn) addServiceBtn.addEventListener('click', () => addServiceItem());
    
    if(serviceItemsContainer) {
        serviceItemsContainer.addEventListener('change', (e) => {
            const index = e.target.dataset.index;
            if (e.target.classList.contains('service-type-select')) {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const price = selectedOption.dataset.price;
                const valueInput = e.target.closest('.grid').querySelector('.service-value-input');
                updateServiceItem(index, 'service', e.target.value);
                if (e.target.value === 'Outro') {
                    valueInput.value = '';
                    valueInput.readOnly = false;
                    valueInput.focus();
                    updateServiceItem(index, 'price', 0);
                } else {
                    valueInput.value = price;
                    valueInput.readOnly = true;
                    updateServiceItem(index, 'price', price);
                }
            }
        });
        serviceItemsContainer.addEventListener('input', (e) => {
            const index = e.target.dataset.index;
            if (e.target.classList.contains('service-value-input')) updateServiceItem(index, 'price', e.target.value);
            if (e.target.classList.contains('service-item-input')) updateServiceItem(index, 'item', e.target.value);
        });
        serviceItemsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-service-btn')) removeServiceItem(e.target.dataset.index);
        });
    }

    if(newOrderForm) newOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedCustomerData) return alert("Por favor, selecione um cliente da lista.");
        if (currentOrderItems.some(item => !item.service || !item.item)) return alert("Preencha todos os campos de serviço e item.");
        
        const totalValue = currentOrderItems.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
        
        const orderData = {
            customerId: selectedCustomerData.id,
            nomeCliente: selectedCustomerData.name,
            telefoneCliente: selectedCustomerData.phone,
            cpfCliente: selectedCustomerData.cpf || '',
            tagIdentificacao: identificationTagInput.value,
            items: currentOrderItems,
            valorTotal: totalValue,
            observacoes: observationsInput.value,
            paymentStatus: paymentStatusCheckbox.checked ? 'pago' : 'pendente',
            ownerId: companyId
        };

        const editingId = editingOrderIdInput.value;

        try {
            if (editingId) {
                // Modo Edição
                await updateDoc(doc(db, "orders", editingId), orderData);
            } else {
                // Modo Criação
                orderData.dataEntrada = Timestamp.fromDate(new Date());
                orderData.dataFinalizacao = null;
                orderData.status = 'em_aberto';
                orderData.finalizadoPor = null;
                await addDoc(collection(db, "orders"), orderData);
            }
            closeModal(newOrderModal, modalContent);
        } catch (error) {
            console.error("Erro ao salvar ordem: ", error);
            alert("Ocorreu um erro ao salvar a ordem.");
        }
    });

    // --- RENDERIZAÇÃO E BUSCA DAS ORDENS NO PAINEL PRINCIPAL ---
    if(searchInput) searchInput.addEventListener('input', renderFilteredOrders);

    function renderFilteredOrders() {
        if (!searchInput) return;
        const searchTerm = searchInput.value.toLowerCase();
        const filtered = allOrdersCache.filter(order => {
            const clientName = (order.nomeCliente || '').toLowerCase();
            const identificationTag = (order.tagIdentificacao || '').toLowerCase();
            let itemsMatch = false;
            if (order.items && Array.isArray(order.items)) {
                itemsMatch = order.items.some(item => item.item && item.item.toLowerCase().includes(searchTerm));
            }
            return clientName.includes(searchTerm) || itemsMatch || identificationTag.includes(searchTerm);
        });
        renderOrderLists(filtered);
    }

    function renderOrderLists(orders) {
        if(!openOrdersList || !finishedOrdersList) return;
        openOrdersList.innerHTML = '';
        finishedOrdersList.innerHTML = '';
        orders.forEach((order) => {
            const orderCard = createOrderCard(order);
            if (order.status === 'em_aberto') {
                openOrdersList.appendChild(orderCard);
            } else {
                finishedOrdersList.appendChild(orderCard);
            }
        });
        if (openOrdersList.innerHTML === '') openOrdersList.innerHTML = '<p class="text-gray-400 p-4">Nenhuma ordem de serviço em aberto.</p>';
        if (finishedOrdersList.innerHTML === '') finishedOrdersList.innerHTML = '<p class="text-gray-400 p-4">Nenhuma ordem de serviço finalizada.</p>';
    }

    function createOrderCard(order) {
        const card = document.createElement('div');
        const cardBorderColor = order.status === 'em_aberto' ? 'border-yellow-400' : 'border-emerald-500';
        card.className = `bg-gray-900/70 p-4 rounded-lg shadow-lg border-l-4 ${cardBorderColor}`;
        
        const entryDate = (order.dataEntrada && order.dataEntrada.toDate) 
            ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(order.dataEntrada.toDate())
            : 'N/A';

        const formattedValue = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(order.valorTotal || 0);
        const itemsHtml = (order.items || []).map(item => `<div class="flex justify-between text-sm"><p>${item.service} (${item.item})</p><p>${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.price || 0)}</p></div>`).join('');
        
        const paymentStatusText = (order.paymentStatus === 'pago') ? 'Pago' : 'Pendente';
        const paymentStatusClass = (order.paymentStatus === 'pago') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400';
        const paymentStatusHtml = `<span class="px-2 py-1 text-xs font-semibold rounded-full ${paymentStatusClass}">${paymentStatusText}</span>`;

        const technicianInfo = order.status === 'finalizado' && order.finalizadoPor
            ? ` &bull; <span class="font-semibold">Finalizado por: ${order.finalizadoPor}</span>`
            : '';
            
        const tagHtml = order.tagIdentificacao ? ` &bull; <span>Tag: ${order.tagIdentificacao}</span>` : '';

        const clientPhone = order.telefoneCliente || '';
        const clientName = order.nomeCliente || '';
        const formattedPhone = clientPhone.replace(/\D/g, '');
        const message = `Olá, ${clientName}, aqui é da Clean UP Shoes.\nEstamos passando para avisar que o seu serviço já está pronto!`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        const whatsappButtonHtml = `<a href="${whatsappUrl}" target="_blank" title="Enviar WhatsApp" class="flex items-center justify-center w-8 h-8 bg-green-600/80 text-white rounded-full hover:bg-green-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor" class="w-4 h-4"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 221.9-99.6 221.9-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-67.6-9.5-97.2-27.2l-6.9-4.1-72.3 19L56 353.7l-4.4-7.3c-18.5-30.3-28.2-65.3-28.2-101.5 0-110.3 89.7-199.9 199.9-199.9 54.4 0 105.8 21.2 144.9 59.5 39.1 39.1 59.5 90.5 59.5 144.9 0 110.4-89.7 200-200 200zm101.6-121.2c-13.9-6.9-82.8-41-95.7-45.8-12.9-4.8-22.3-7.7-31.7 7.7-9.4 15.4-36.2 45.8-44.4 55.2-8.2 9.4-16.4 10.4-30.3 3.4-13.9-6.9-58.6-21.6-111.6-69.2-41.4-37.4-69.2-83.3-77.4-98.2-8.2-14.9-.1-23.1 6.9-30.3 6.1-6.1 13.9-16.4 20.8-24.6 6.9-8.2 9.4-13.9 6.9-23.1-2.5-9.4-22.3-53.7-30.3-73.2-8.2-19.5-16.4-16.4-23.1-16.4-6.9 0-13.9 0-20.8 0-6.9 0-18.5 2.5-28.2 13.9-9.4 11.4-36.2 35.2-36.2 86.6 0 51.4 37.2 100.2 42.1 107.1 4.8 6.9 73.2 111.6 177.3 156.4 25.3 11.4 45.8 18.5 61.3 23.1 16.4 4.8 30.3 4.1 41.1 1.6 12.9-3.4 41.1-16.4 47.1-32.3 6-15.9 6-29.4 4.1-32.3-2.5-3.8-11.4-6.9-25.3-13.8z"/></svg></a>`;
        const sendTermButtonHtml = `<button data-id="${order.id}" class="send-term-btn flex items-center gap-1 bg-blue-600/80 text-white px-3 py-1 rounded-full text-sm font-semibold">Enviar Termo</button>`;
        
        // --- BOTÕES DE AÇÃO ---
        const editButtonHtml = order.status === 'em_aberto' ? `<button data-id="${order.id}" class="edit-btn text-blue-400 p-1 rounded-full hover:bg-gray-700" title="Editar Ordem"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path></svg></button>` : '';
        const togglePaymentButtonHtml = (order.paymentStatus !== 'pago' && order.status === 'em_aberto') ? `<button data-id="${order.id}" class="toggle-payment-btn flex items-center gap-1 bg-cyan-800/50 text-cyan-300 px-3 py-1 rounded-full text-sm font-semibold">Marcar Pago</button>` : '';
        const finishButtonHtml = order.status === 'em_aberto' ? `<button data-id="${order.id}" class="finish-btn flex items-center gap-1 bg-green-800/50 text-green-300 px-3 py-1 rounded-full text-sm font-semibold">Finalizar</button>` : '';
        const deleteButtonHtml = currentUserRole === 'admin' ? `<button data-id="${order.id}" class="delete-btn text-red-400 p-1 rounded-full hover:bg-gray-700" title="Excluir Ordem"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"></path></svg></button>` : '';

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold text-lg">${order.nomeCliente}</p>
                    <div class="mt-1">${paymentStatusHtml}</div>
                </div>
                <p class="font-bold text-lg text-emerald-400">${formattedValue}</p>
            </div>
            <div class="mt-2 space-y-1 border-t border-b border-gray-700 py-2">${itemsHtml}</div>
            <div class="text-sm text-gray-500 mt-2">
                <span>OS: ${order.id.substring(0, 6).toUpperCase()}</span>${tagHtml} &bull; <span>Entrada: ${entryDate}</span>${technicianInfo}
            </div>
            ${order.observacoes ? `<p class="text-sm mt-3 pt-3 border-t border-gray-700">${order.observacoes}</p>` : ''}
            <div class="flex justify-end items-center mt-4 space-x-2">
                ${editButtonHtml}
                ${togglePaymentButtonHtml}
                ${finishButtonHtml}
                <button data-id="${order.id}" class="print-btn flex items-center gap-1 bg-gray-700 px-3 py-1 rounded-full text-sm font-semibold">Imprimir</button>
                ${sendTermButtonHtml}
                ${whatsappButtonHtml}
                ${deleteButtonHtml}
            </div>`;
        return card;
    }

    function populateEditForm(order) {
        resetNewOrderForm(); 
        
        editingOrderIdInput.value = order.id;
        modalTitle.textContent = "Editar Ordem de Serviço";
        saveOrderBtn.textContent = "Salvar Alterações";

        customerSearchInput.value = order.nomeCliente;
        clientPhoneInput.value = order.telefoneCliente;
        identificationTagInput.value = order.tagIdentificacao || '';
        selectedCustomerData = {
            id: order.customerId,
            name: order.nomeCliente,
            phone: order.telefoneCliente,
            cpf: order.cpfCliente
        };
        
        currentOrderItems = [];
        serviceItemsContainer.innerHTML = '';
        if(order.items && order.items.length > 0){
             order.items.forEach(item => addServiceItem(item));
        } else {
            addServiceItem();
        }
       
        observationsInput.value = order.observacoes || '';
        paymentStatusCheckbox.checked = order.paymentStatus === 'pago';
    }

    document.body.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const finishBtn = e.target.closest('.finish-btn');
        const printBtn = e.target.closest('.print-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const togglePaymentBtn = e.target.closest('.toggle-payment-btn');
        const sendTermBtn = e.target.closest('.send-term-btn');

        if (editBtn) {
            const orderId = editBtn.dataset.id;
            const orderData = allOrdersCache.find(o => o.id === orderId);
            if (orderData) {
                populateEditForm(orderData);
                openModal(newOrderModal, modalContent);
            }
        }

        if (togglePaymentBtn) {
            try { await updateDoc(doc(db, 'orders', togglePaymentBtn.dataset.id), { paymentStatus: 'pago' }); } 
            catch (error) { alert("Erro ao atualizar o status do pagamento."); }
        }

        if (finishBtn) {
            orderIdToFinish = finishBtn.dataset.id;
            technicianNameInput.value = '';
            openModal(finishOrderModal, finishOrderModalContent);
            technicianNameInput.focus();
        }

        if (printBtn) {
            const orderId = printBtn.dataset.id;
            const orderData = allOrdersCache.find(o => o.id === orderId);
            if (orderData) {
                prepareAndPrintReceipt(orderData);
            } else {
                alert("Erro ao buscar dados para impressão.");
            }
        }

        if (sendTermBtn) {
            const orderId = sendTermBtn.dataset.id;
            const orderData = allOrdersCache.find(o => o.id === orderId);
            if (orderData) {
                sendWhatsAppTerm(orderData);
            } else {
                alert("Erro ao buscar dados para enviar o termo.");
            }
        }

        if (deleteBtn) {
            // Dupla verificação de segurança
            if (currentUserRole !== 'admin') return alert("Você não tem permissão para excluir ordens.");
            
            showConfirm("Tem certeza que deseja excluir esta ordem?", async () => {
                try { await deleteDoc(doc(db, 'orders', deleteBtn.dataset.id)); }
                catch (error) { alert("Erro ao excluir a ordem."); }
            });
        }
    });

    // Evento de submit do formulário de finalização
    if (finishOrderForm) {
        finishOrderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const technicianName = technicianNameInput.value;
            if (!technicianName.trim()) return alert("O nome do responsável é obrigatório.");
            
            if (orderIdToFinish) {
                try {
                    await updateDoc(doc(db, 'orders', orderIdToFinish), {
                        status: 'finalizado',
                        dataFinalizacao: Timestamp.fromDate(new Date()),
                        finalizadoPor: technicianName
                    });
                    closeModal(finishOrderModal, finishOrderModalContent);
                    orderIdToFinish = null;
                } catch (error) {
                    alert("Erro ao finalizar a ordem.");
                }
            }
        });
    }
    
    function getReceiptHtml(order) {
        const fullDate = new Date().toLocaleString('pt-BR', { dateStyle: 'long' });
        const entryDate = (order.dataEntrada && order.dataEntrada.toDate) 
            ? new Intl.DateTimeFormat('pt-BR').format(order.dataEntrada.toDate())
            : 'N/A';

        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.service}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ccc;">${item.item}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ccc; text-align: right;">${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.price || 0)}</td>
            </tr>
        `).join('');

        return `
            <div style="font-family: Arial, sans-serif; width: 21cm; padding: 1.5cm; font-size: 10pt; color: #000; line-height: 1.4; background: white;">
                <div style="text-align: center; margin-bottom: 1.5em;">
                    <img src="logo.png" alt="Clean UP Shoes Logo" style="width: 150px; margin: 0 auto;">
                </div> <br>
                <h2 style="text-align: center; font-weight: bold; font-size: 14pt;">TERMO DE RESPONSABILIDADE – CLEAN UP SHOES</h2> <br>
                <p style="text-align: center; font-size: 9pt; margin-bottom: 1.5em;">CNPJ: 51.192.646/0001-59<br>Endereço: Av. Gramal, 1521, sala 6 - Bairro Campeche, Florianópolis/SC – CEP: 88063-080</p> <br>
                <p>O cliente declara estar ciente e de acordo com os termos abaixo ao contratar os serviços da Clean Up Shoes:</p> <br>
                <ol style="list-style-position: inside; padding-left: 0;">
                    <li style="margin-bottom: 0.5em;"><strong>Avaliação Prévia:</strong> Todos os calçados recebidos passam por uma avaliação técnica, na qual são verificados o estado geral, materiais, costuras, colas, solado e eventuais avarias pré-existentes.</li> <br>
                    <li style="margin-bottom: 0.5em;"><strong>Riscos do Processo:</strong> Devido à variedade de materiais e técnicas, podem ocorrer alterações de cor, textura, desbotamento, descolamento ou desgaste natural, especialmente em peças frágeis ou antigas.</li> <br>
                    <li style="margin-bottom: 0.5em;"><strong>Garantia de Serviço:</strong> A Clean Up Shoes compromete-se a prestar o melhor serviço com produtos e técnicas profissionais, mas não se responsabiliza por danos ligados à fragilidade pré-existente do calçado.</li> <br>
                    <li style="margin-bottom: 0.5em;"><strong>Prazos e Retirada:</strong> O prazo médio para entrega será informado no recebimento. O cliente deve retirar o calçado em até 30 dias corridos após notificação de conclusão. Após isso, isentamo-nos de responsabilidade.</li> <br>
                    <li style="margin-bottom: 0.5em;"><strong>Objetos Pessoais:</strong> Não nos responsabilizamos por objetos deixados dentro dos calçados, como palmilhas, cadarços personalizados, etiquetas, etc.</li> <br>
                    <li style="margin-bottom: 0.5em;"><strong>Autorização:</strong> Ao assinar este termo, o cliente autoriza a execução do serviço e declara estar ciente de todas as condições aqui descritas.</li> <br>
                </ol>
                <p style="text-align: right; margin-top: 2em;">Florianópolis, ${fullDate}</p>
                <div style="margin-top: 3em;">
                    <p style="text-align: center;">_________________________________________</p>
                    <p style="text-align: center;">Assinatura do Cliente</p>
                    <p style="margin-top: 1.5em;"><strong>Nome Completo:</strong> ${order.nomeCliente}</p>
                    <p><strong>CPF/RG:</strong> ${order.cpfCliente || 'Não informado'}</p>
                </div>
            </div>
            <div style="font-family: Arial, sans-serif; width: 21cm; padding: 1.5cm; font-size: 10pt; color: #000; line-height: 1.4; page-break-before: always; background: white;">
                <div style="text-align: center; margin-bottom: 1.5em;">
                    <img src="logo.png" alt="Clean UP Shoes Logo" style="width: 150px; margin: 0 auto;">
                </div>
                <h2 style="text-align: center; font-weight: bold; font-size: 14pt;">DETALHES DA ORDEM DE SERVIÇO</h2>
                <div style="margin-top: 2em; margin-bottom: 2em; border-bottom: 1px solid #ccc; padding-bottom: 1em;">
                    <p><strong>Cliente:</strong> ${order.nomeCliente}</p>
                    <p><strong>OS:</strong> ${order.id.substring(0, 6).toUpperCase()}</p>
                    <p><strong>Data de Entrada:</strong> ${entryDate}</p>
                    ${order.tagIdentificacao ? `<p><strong>Tag de Identificação:</strong> ${order.tagIdentificacao}</p>` : ''}
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="padding: 8px; border-bottom: 2px solid #000; text-align: left;">Serviço</th>
                            <th style="padding: 8px; border-bottom: 2px solid #000; text-align: left;">Item</th>
                            <th style="padding: 8px; border-bottom: 2px solid #000; text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div style="margin-top: 2em; text-align: right;">
                    <p style="font-size: 14pt; font-weight: bold;">VALOR TOTAL: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(order.valorTotal || 0)}</p>
                </div>
                ${order.observacoes ? `
                    <div style="margin-top: 2em;">
                        <h3 style="font-weight: bold;">Observações:</h3>
                        <p>${order.observacoes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    function prepareAndPrintReceipt(order) {
        printArea.innerHTML = getReceiptHtml(order);
        window.print();
    }
    
    function sendWhatsAppTerm(order) {
        const entryDate = (order.dataEntrada && order.dataEntrada.toDate) 
            ? new Intl.DateTimeFormat('pt-BR').format(order.dataEntrada.toDate())
            : 'N/A';

        const itemsText = (order.items || []).map(item => 
            `- ${item.service} (${item.item}): ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.price || 0)}`
        ).join('\n');

        const termText = `
*TERMO DE RESPONSABILIDADE – CLEAN UP SHOES*

*Detalhes da Ordem de Serviço:*
- *Cliente:* ${order.nomeCliente}
- *OS:* ${order.id.substring(0, 6).toUpperCase()}
- *Data de Entrada:* ${entryDate}
${order.tagIdentificacao ? `- *Tag:* ${order.tagIdentificacao}` : ''}

*Serviços Contratados:*
${itemsText}

*VALOR TOTAL:* ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(order.valorTotal || 0)}

------------------------------------

*Resumo dos Termos e Condições:*
O cliente declara estar ciente e de acordo com os seguintes termos:
1. *Avaliação Prévia:* Todos os calçados passam por uma avaliação técnica inicial.
2. *Riscos do Processo:* Podem ocorrer alterações de cor, textura ou desgaste, especialmente em peças frágeis.
3. *Garantia de Serviço:* Comprometemo-nos a usar as melhores técnicas, mas não nos responsabilizamos por danos ligados à fragilidade pré-existente do calçado.
4. *Prazos e Retirada:* O cliente deve retirar o calçado em até 30 dias corridos após notificação de conclusão.
5. *Objetos Pessoais:* Não nos responsabilizamos por objetos deixados dentro dos calçados.
6. *Autorização:* Ao contratar o serviço, o cliente autoriza sua execução e declara estar ciente destas condições.
        `;

        const clientPhone = order.telefoneCliente || '';
        const formattedPhone = clientPhone.replace(/\D/g, '');
        const encodedMessage = encodeURIComponent(termText);
        const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
    }
});
