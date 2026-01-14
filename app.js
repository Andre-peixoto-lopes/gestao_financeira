// ===== GESTÃO FINANCEIRA PESSOAL - APP.JS =====
// Sistema com Backend Node.js + PostgreSQL (Vercel)

// ===== CONFIGURAÇÃO DA API =====
const API_URL = window.location.origin + '/api';
let authToken = localStorage.getItem('authToken');

// Estado global da aplicação
let appData = {
    users: [],
    currentUser: null
};

// Estado do usuário atual
let state = {
    currentMonth: new Date(),
    transactions: [],
    fixedExpenses: [],
    installments: [],
    savingsBoxes: [],
    savingsPercentage: 20
};

// Ícones das categorias
const categoryIcons = {
    salario: '💼',
    freelance: '💻',
    investimentos: '📈',
    alimentacao: '🍔',
    transporte: '🚗',
    lazer: '🎮',
    saude: '💊',
    educacao: '🎓',
    moradia: '🏠',
    servicos: '⚡',
    eletronicos: '📱',
    eletrodomesticos: '🔌',
    moveis: '🛋️',
    vestuario: '👕',
    viagem: '✈️',
    outros: '📦'
};

// ===== FUNÇÕES DE API =====
async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        method,
        headers
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro na requisição');
        }

        return result;
    } catch (error) {
        console.error(`Erro na API ${endpoint}:`, error);
        throw error;
    }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    initEventListeners();
    await loadUsersList();
    await checkLogin();
});

// ===== CARREGAR DADOS DO USUÁRIO =====
async function loadUserData() {
    try {
        // Carregar todos os dados em paralelo
        const [transactions, fixedExpenses, installments, savings, settings] = await Promise.all([
            apiRequest('/transactions'),
            apiRequest('/fixed'),
            apiRequest('/installments'),
            apiRequest('/savings'),
            apiRequest('/settings')
        ]);

        state.transactions = transactions.map(t => ({
            id: t.id,
            type: t.type,
            value: parseFloat(t.value),
            description: t.description,
            category: t.category || 'outros',
            date: t.date
        }));

        state.fixedExpenses = fixedExpenses.map(f => ({
            id: f.id,
            name: f.description,
            value: parseFloat(f.value),
            dueDay: f.day,
            paid: f.paid,
            paidMonths: f.paid_months || []
        }));

        state.installments = installments.map(i => ({
            id: i.id,
            description: i.description,
            category: i.category || 'outros',
            totalValue: parseFloat(i.total_value),
            installmentValue: parseFloat(i.installment_value),
            totalInstallments: i.total_installments,
            paidInstallments: i.paid_installments,
            startDate: i.start_date
        }));

        state.savingsBoxes = savings.map(s => ({
            id: s.id,
            name: s.name,
            goal: parseFloat(s.goal || 0),
            currentAmount: parseFloat(s.current_value || 0),
            icon: s.icon || '🐷',
            color: s.color || '#6366f1'
        }));

        state.savingsPercentage = settings.savingsPercentage || 20;

        console.log('📊 Dados carregados do servidor');
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        if (error.message.includes('Token')) {
            handleLogout();
        }
    }
}

// ===== EVENT LISTENERS =====
function initEventListeners() {
    // Tabs de autenticação
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    // Formulários de autenticação
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);

    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => navigateTo(e.target.dataset.page));
    });

    // Menu mobile
    document.getElementById('menu-toggle').addEventListener('click', toggleMobileMenu);

    // Mês
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    // Botões de adicionar
    document.getElementById('add-transaction-btn').addEventListener('click', () => openModal('transaction-modal'));
    document.getElementById('add-fixed-btn').addEventListener('click', () => openModal('fixed-modal'));
    document.getElementById('add-installment-btn').addEventListener('click', () => openModal('installment-modal'));
    document.getElementById('add-savings-btn').addEventListener('click', () => openModal('savings-modal'));

    // Formulários
    document.getElementById('transaction-form').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('fixed-form').addEventListener('submit', handleFixedSubmit);
    document.getElementById('installment-form').addEventListener('submit', handleInstallmentSubmit);
    document.getElementById('savings-form').addEventListener('submit', handleSavingsSubmit);
    document.getElementById('savings-action-form').addEventListener('submit', handleSavingsAction);

    // Divisão de despesas
    document.getElementById('trans-split').addEventListener('change', toggleSplitSection);
    document.getElementById('trans-value').addEventListener('input', updateSplitValue);
    document.getElementById('trans-split-count').addEventListener('input', updateSplitValue);
    document.getElementById('trans-type').addEventListener('change', toggleSplitVisibility);

    // Período do relatório
    document.getElementById('report-period').addEventListener('change', renderReports);

    // Fechar modais
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });

    // Seletores de ícone e cor
    document.querySelectorAll('.icon-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    document.querySelectorAll('.color-option').forEach(opt => {
        opt.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
        });
    });

    // Filtros
    document.getElementById('filter-type').addEventListener('change', renderTransactionsList);
    document.getElementById('filter-category').addEventListener('change', renderTransactionsList);
}

// ===== AUTENTICAÇÃO =====
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
    
    document.getElementById('login-message').textContent = '';
    document.getElementById('register-message').textContent = '';
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const username = document.getElementById('register-username').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value;
    const messageEl = document.getElementById('register-message');

    try {
        await apiRequest('/auth', 'POST', { action: 'register', name, username, password });
        
        messageEl.textContent = '✓ Conta criada com sucesso! Faça login.';
        messageEl.className = 'auth-message success';
        
        document.getElementById('register-form').reset();
        await loadUsersList();
        
        setTimeout(() => switchAuthTab('login'), 1500);
    } catch (error) {
        messageEl.textContent = `❌ ${error.message}`;
        messageEl.className = 'auth-message error';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('login-message');

    try {
        const result = await apiRequest('/auth', 'POST', { action: 'login', username, password });
        
        authToken = result.token;
        localStorage.setItem('authToken', authToken);
        appData.currentUser = result.user;

        await loadUserData();
        showMainScreen(result.user);
    } catch (error) {
        messageEl.textContent = `❌ ${error.message}`;
        messageEl.className = 'auth-message error';
    }
}

function quickLogin(userId) {
    const user = appData.users.find(u => u.id === userId);
    if (user) {
        document.getElementById('login-username').value = user.username;
        document.getElementById('login-password').focus();
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('authToken');
    appData.currentUser = null;
    state = {
        currentMonth: new Date(),
        transactions: [],
        fixedExpenses: [],
        installments: [],
        savingsBoxes: [],
        savingsPercentage: 20
    };
    showLoginScreen();
}

async function checkLogin() {
    if (authToken) {
        try {
            const users = await apiRequest('/auth');
            const user = users.find(u => u.id === JSON.parse(atob(authToken.split('.')[1])).userId);
            appData.currentUser = user;
            await loadUserData();
            showMainScreen(user);
        } catch (error) {
            handleLogout();
        }
    } else {
        showLoginScreen();
    }
}

async function loadUsersList() {
    try {
        appData.users = await apiRequest('/auth');
        renderUsersList();
    } catch (error) {
        console.error('Erro ao carregar lista de usuários:', error);
    }
}

function renderUsersList() {
    const container = document.getElementById('users-list');
    
    if (appData.users.length === 0) {
        document.getElementById('registered-users').style.display = 'none';
        return;
    }

    document.getElementById('registered-users').style.display = 'block';
    
    container.innerHTML = appData.users.map(user => `
        <div class="user-chip" onclick="quickLogin(${user.id})">
            <span class="user-avatar">${user.name.charAt(0).toUpperCase()}</span>
            <span>${user.name}</span>
        </div>
    `).join('');
}

function showLoginScreen() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('main-screen').classList.remove('active');
    document.getElementById('login-form').reset();
    document.getElementById('login-message').textContent = '';
}

function showMainScreen(user) {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    document.getElementById('user-display').textContent = user.name;
    document.getElementById('savings-percentage').value = state.savingsPercentage;
    
    updateMonthDisplay();
    renderDashboard();
    navigateTo('dashboard');
}

// ===== DIVISÃO DE DESPESAS =====
function toggleSplitVisibility() {
    const type = document.getElementById('trans-type').value;
    const section = document.getElementById('split-expense-section');
    section.style.display = type === 'expense' ? 'block' : 'none';
    
    if (type === 'income') {
        document.getElementById('trans-split').checked = false;
        document.getElementById('split-details').style.display = 'none';
    }
}

function toggleSplitSection() {
    const isChecked = document.getElementById('trans-split').checked;
    document.getElementById('split-details').style.display = isChecked ? 'block' : 'none';
    updateSplitValue();
}

function updateSplitValue() {
    const totalValue = parseFloat(document.getElementById('trans-value').value) || 0;
    const splitCount = parseInt(document.getElementById('trans-split-count').value) || 2;
    const splitValue = totalValue / splitCount;
    
    document.getElementById('split-value').textContent = formatCurrency(splitValue);
}

// ===== NAVEGAÇÃO =====
function navigateTo(page) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');

    document.getElementById('mobile-menu').classList.remove('active');

    switch(page) {
        case 'dashboard': renderDashboard(); break;
        case 'transactions': renderTransactionsList(); break;
        case 'fixed-expenses': renderFixedExpenses(); break;
        case 'installments': renderInstallments(); break;
        case 'savings': renderSavingsBoxes(); break;
        case 'reports': renderReports(); break;
    }
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('active');
}

// ===== MÊS =====
function changeMonth(delta) {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + delta);
    updateMonthDisplay();
    renderDashboard();
}

function updateMonthDisplay() {
    const options = { month: 'long', year: 'numeric' };
    document.getElementById('current-month').textContent = 
        state.currentMonth.toLocaleDateString('pt-BR', options);
}

// ===== MODAIS =====
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    if (modalId === 'transaction-modal') {
        document.getElementById('trans-date').value = new Date().toISOString().split('T')[0];
        toggleSplitVisibility();
    }
    if (modalId === 'installment-modal') {
        document.getElementById('inst-start-date').value = new Date().toISOString().split('T')[0];
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('form').forEach(f => f.reset());
    document.getElementById('split-details').style.display = 'none';
}

// ===== TRANSAÇÕES =====
async function handleTransactionSubmit(e) {
    e.preventDefault();
    
    let value = parseFloat(document.getElementById('trans-value').value);
    const type = document.getElementById('trans-type').value;
    const isSplit = document.getElementById('trans-split').checked;
    const splitCount = parseInt(document.getElementById('trans-split-count').value) || 1;

    if (type === 'expense' && isSplit && splitCount > 1) {
        value = value / splitCount;
    }

    const transaction = {
        type, value,
        originalValue: parseFloat(document.getElementById('trans-value').value),
        description: document.getElementById('trans-description').value,
        category: document.getElementById('trans-category').value,
        date: document.getElementById('trans-date').value,
        isSplit: isSplit && type === 'expense',
        splitCount: isSplit ? splitCount : 1
    };

    try {
        const result = await apiRequest('/transactions', 'POST', transaction);
        transaction.id = result.id;
        state.transactions.push(transaction);
        closeAllModals();
        renderDashboard();
        if (document.getElementById('transactions').classList.contains('active')) {
            renderTransactionsList();
        }
    } catch (error) {
        alert('Erro ao salvar transação: ' + error.message);
    }
}

async function deleteTransaction(id) {
    if (confirm('Deseja realmente excluir esta transação?')) {
        try {
            await apiRequest(`/transactions?id=${id}`, 'DELETE');
            state.transactions = state.transactions.filter(t => t.id !== id);
            renderDashboard();
            renderTransactionsList();
        } catch (error) {
            alert('Erro ao excluir transação: ' + error.message);
        }
    }
}

function renderTransactionsList() {
    const container = document.getElementById('transactions-list');
    const filterType = document.getElementById('filter-type').value;
    const filterCategory = document.getElementById('filter-category').value;

    let filtered = state.transactions.filter(t => {
        const matchType = filterType === 'all' || t.type === filterType;
        const matchCategory = filterCategory === 'all' || t.category === filterCategory;
        return matchType && matchCategory;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💳</div>
                <h4>Nenhuma transação encontrada</h4>
                <p>Adicione sua primeira transação clicando no botão acima.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${t.type}">${categoryIcons[t.category] || '📦'}</div>
                <div class="transaction-details">
                    <h4>${t.description}</h4>
                    <span>${formatCategory(t.category)} • ${formatDate(t.date)}
                        ${t.isSplit ? `<br>📍 Dividido por ${t.splitCount} pessoas (total: ${formatCurrency(t.originalValue)})` : ''}
                    </span>
                </div>
            </div>
            <div class="transaction-value ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.value)}</div>
            <div class="transaction-actions">
                <button class="btn btn-outline btn-sm" onclick="deleteTransaction(${t.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// ===== DESPESAS FIXAS =====
async function handleFixedSubmit(e) {
    e.preventDefault();
    
    const fixed = {
        description: document.getElementById('fixed-name').value,
        value: parseFloat(document.getElementById('fixed-value').value),
        day: parseInt(document.getElementById('fixed-day').value)
    };

    try {
        const result = await apiRequest('/fixed', 'POST', fixed);
        state.fixedExpenses.push({
            id: result.id,
            name: fixed.description,
            value: fixed.value,
            dueDay: fixed.day,
            paid: false
        });
        closeAllModals();
        renderFixedExpenses();
    } catch (error) {
        alert('Erro ao salvar despesa fixa: ' + error.message);
    }
}

async function toggleFixedPaid(id) {
    const monthKey = `${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const fixed = state.fixedExpenses.find(f => f.id === id);
    const isPaid = fixed && fixed.paidMonths && fixed.paidMonths.includes(monthKey);
    
    try {
        const action = isPaid ? 'unpay' : 'pay';
        await apiRequest('/fixed', 'POST', { action, id });
        await loadUserData();
        renderFixedExpenses();
        renderDashboard();
    } catch (error) {
        alert('Erro ao atualizar despesa fixa: ' + error.message);
    }
}

async function deleteFixed(id) {
    if (confirm('Deseja realmente excluir esta despesa fixa?')) {
        try {
            await apiRequest(`/fixed?id=${id}`, 'DELETE');
            state.fixedExpenses = state.fixedExpenses.filter(f => f.id !== id);
            renderFixedExpenses();
        } catch (error) {
            alert('Erro ao excluir despesa fixa: ' + error.message);
        }
    }
}

function renderFixedExpenses() {
    const container = document.getElementById('fixed-expenses-list');
    const monthKey = `${state.currentMonth.getFullYear()}-${String(state.currentMonth.getMonth() + 1).padStart(2, '0')}`;

    if (state.fixedExpenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📌</div>
                <h4>Nenhuma despesa fixa cadastrada</h4>
                <p>Adicione despesas que se repetem todo mês.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.fixedExpenses.map(f => {
        const isPaid = f.paidMonths && f.paidMonths.includes(monthKey);
        return `
            <div class="fixed-item">
                <div class="fixed-info">
                    <div class="fixed-icon">${categoryIcons[f.category] || '📦'}</div>
                    <div class="fixed-details">
                        <h4>${f.name}</h4>
                        <span>Vencimento: dia ${f.dueDay} • ${formatCategory(f.category)}</span>
                    </div>
                </div>
                <div class="fixed-value">${formatCurrency(f.value)}</div>
                <span class="fixed-status ${isPaid ? 'paid' : 'pending'}">${isPaid ? '✓ Pago' : 'Pendente'}</span>
                <div class="fixed-actions">
                    <button class="btn ${isPaid ? 'btn-outline' : 'btn-success'} btn-sm" onclick="toggleFixedPaid(${f.id})">${isPaid ? 'Desfazer' : 'Pagar'}</button>
                    <button class="btn btn-outline btn-sm" onclick="deleteFixed(${f.id})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== PARCELAS =====
async function handleInstallmentSubmit(e) {
    e.preventDefault();
    
    const totalValue = parseFloat(document.getElementById('inst-total').value);
    const totalInstallments = parseInt(document.getElementById('inst-installments').value);
    const paidInstallments = parseInt(document.getElementById('inst-paid').value) || 0;
    
    const installment = {
        description: document.getElementById('inst-description').value,
        category: document.getElementById('inst-category').value || 'outros',
        totalValue: totalValue,
        installmentValue: totalValue / totalInstallments,
        totalInstallments: totalInstallments,
        paidInstallments: paidInstallments,
        startDate: document.getElementById('inst-start-date').value
    };

    try {
        const result = await apiRequest('/installments', 'POST', installment);
        state.installments.push({
            id: result.id,
            ...installment
        });
        closeAllModals();
        renderInstallments();
    } catch (error) {
        alert('Erro ao salvar parcela: ' + error.message);
    }
}

async function payInstallment(id) {
    try {
        const result = await apiRequest('/installments', 'POST', { action: 'pay', id });
        const inst = state.installments.find(i => i.id === id);
        if (inst) inst.paidInstallments = result.paidInstallments;
        await loadUserData();
        renderInstallments();
        renderDashboard();
    } catch (error) {
        alert('Erro ao pagar parcela: ' + error.message);
    }
}

async function deleteInstallment(id) {
    if (confirm('Deseja realmente excluir esta compra parcelada?')) {
        try {
            await apiRequest(`/installments?id=${id}`, 'DELETE');
            state.installments = state.installments.filter(i => i.id !== id);
            renderInstallments();
        } catch (error) {
            alert('Erro ao excluir parcela: ' + error.message);
        }
    }
}

function renderInstallments() {
    const container = document.getElementById('installments-list');

    if (state.installments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <h4>Nenhuma compra parcelada</h4>
                <p>Adicione compras parceladas para acompanhar.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.installments.map(inst => {
        const monthlyValue = inst.totalValue / inst.totalInstallments;
        const progress = (inst.paidInstallments / inst.totalInstallments) * 100;
        const remaining = inst.totalInstallments - inst.paidInstallments;
        const isCompleted = remaining === 0;

        return `
            <div class="installment-item">
                <div class="installment-header">
                    <div class="installment-info">
                        <h4>${inst.description}</h4>
                        <span>${categoryIcons[inst.category] || '📦'} ${formatCategory(inst.category)} • Início: ${formatDate(inst.startDate)}</span>
                    </div>
                    <div class="installment-values">
                        <div class="installment-total">Total: ${formatCurrency(inst.totalValue)}</div>
                        <div class="installment-monthly">${formatCurrency(monthlyValue)}/mês</div>
                    </div>
                </div>
                <div class="installment-progress">
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                    <div class="progress-text">
                        <span>${inst.paidInstallments} de ${inst.totalInstallments} parcelas pagas</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                </div>
                <div class="installment-footer">
                    <div class="time-remaining ${isCompleted ? 'completed' : remaining <= 3 ? 'ending-soon' : ''}">
                        ${isCompleted ? '✓ Quitado!' : `⏱️ Faltam ${remaining} ${remaining === 1 ? 'parcela' : 'parcelas'}`}
                    </div>
                    <div class="installment-actions">
                        ${!isCompleted ? `<button class="btn btn-success btn-sm" onclick="payInstallment(${inst.id})">Pagar Parcela</button>` : ''}
                        <button class="btn btn-outline btn-sm" onclick="deleteInstallment(${inst.id})">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== CAIXINHAS =====
async function handleSavingsSubmit(e) {
    e.preventDefault();

    const selectedIcon = document.querySelector('#icon-selector .icon-option.selected');
    const selectedColor = document.querySelector('#color-selector .color-option.selected');

    const savings = {
        name: document.getElementById('savings-name').value,
        goal: parseFloat(document.getElementById('savings-goal').value) || 0,
        currentValue: parseFloat(document.getElementById('savings-initial').value) || 0,
        icon: selectedIcon ? selectedIcon.dataset.icon : '🐷',
        color: selectedColor ? selectedColor.dataset.color : '#6366f1'
    };

    try {
        const result = await apiRequest('/savings', 'POST', savings);
        state.savingsBoxes.push({
            id: result.id,
            name: savings.name,
            goal: savings.goal,
            currentAmount: savings.currentValue,
            icon: savings.icon,
            color: savings.color
        });
        closeAllModals();
        renderSavingsBoxes();
        renderDashboard();
    } catch (error) {
        alert('Erro ao criar caixinha: ' + error.message);
    }
}

function openSavingsAction(id, type) {
    document.getElementById('savings-action-id').value = id;
    document.getElementById('savings-action-type').value = type;
    document.getElementById('savings-action-title').textContent = 
        type === 'deposit' ? 'Depositar na Caixinha' : 'Retirar da Caixinha';
    openModal('savings-action-modal');
}

async function handleSavingsAction(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('savings-action-id').value);
    const type = document.getElementById('savings-action-type').value;
    const value = parseFloat(document.getElementById('savings-action-value').value);
    
    try {
        const result = await apiRequest('/savings', 'POST', { action: 'transaction', id, type, value });
        const savings = state.savingsBoxes.find(s => s.id === id);
        if (savings) {
            savings.currentAmount = result.currentValue;
        }
        closeAllModals();
        renderSavingsBoxes();
        renderDashboard();
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function deleteSavings(id) {
    if (confirm('Deseja realmente excluir esta caixinha?')) {
        try {
            await apiRequest(`/savings?id=${id}`, 'DELETE');
            state.savingsBoxes = state.savingsBoxes.filter(s => s.id !== id);
            renderSavingsBoxes();
            renderDashboard();
        } catch (error) {
            alert('Erro ao excluir caixinha: ' + error.message);
        }
    }
}

function renderSavingsBoxes() {
    const container = document.getElementById('savings-boxes');

    if (state.savingsBoxes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1;">
                <div class="empty-state-icon">🐷</div>
                <h4>Nenhuma caixinha criada</h4>
                <p>Crie caixinhas para separar seu dinheiro.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.savingsBoxes.map(s => {
        const progress = s.goal > 0 ? Math.min((s.currentAmount / s.goal) * 100, 100) : 0;
        const icon = s.icon || '🐷';
        const color = s.color || '#6366f1';
        return `
            <div class="savings-box">
                <div class="savings-box-header" style="background: ${color}">
                    <div class="savings-box-title">
                        <span class="savings-box-icon">${icon}</span>
                        <span class="savings-box-name">${s.name || 'Caixinha'}</span>
                    </div>
                    <button class="savings-box-delete" onclick="deleteSavings(${s.id})">×</button>
                </div>
                <div class="savings-box-body">
                    <div class="savings-amount">${formatCurrency(s.currentAmount)}</div>
                    ${s.goal > 0 ? `
                        <div class="savings-goal">
                            <div class="savings-goal-text">
                                <span>Meta: ${formatCurrency(s.goal)}</span>
                                <span>${progress.toFixed(0)}%</span>
                            </div>
                            <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%; background: ${color}"></div></div>
                        </div>
                    ` : ''}
                    <div class="savings-box-actions">
                        <button class="btn btn-success btn-sm" onclick="openSavingsAction(${s.id}, 'deposit')">+ Depositar</button>
                        <button class="btn btn-outline btn-sm" onclick="openSavingsAction(${s.id}, 'withdraw')">- Retirar</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== DASHBOARD =====
function renderDashboard() {
    const month = state.currentMonth.getMonth();
    const year = state.currentMonth.getFullYear();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    const monthTransactions = state.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0);
    const expenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0);

    // Despesas fixas pendentes (não pagas este mês)
    const pendingFixed = state.fixedExpenses
        .filter(f => !f.paidMonths || !f.paidMonths.includes(monthKey))
        .reduce((sum, f) => sum + f.value, 0);

    // Parcelas pendentes
    const pendingInstallments = state.installments
        .filter(i => i.paidInstallments < i.totalInstallments)
        .reduce((sum, i) => sum + (i.totalValue / i.totalInstallments), 0);

    const pendingTotal = pendingFixed + pendingInstallments;
    const totalSavings = state.savingsBoxes.reduce((sum, s) => sum + s.currentAmount, 0);
    
    // Saldo = Receita - Despesas (já pagas/transações)
    // Não subtrai pendentes nem caixinhas do saldo real
    const balance = income - expenses;

    document.getElementById('total-income').textContent = formatCurrency(income);
    document.getElementById('total-expense').textContent = formatCurrency(expenses);
    document.getElementById('total-balance').textContent = formatCurrency(balance);
    document.getElementById('total-savings').textContent = formatCurrency(totalSavings);
    
    // Mostrar pendentes separadamente se quiser
    const pendingEl = document.getElementById('total-pending');
    if (pendingEl) {
        pendingEl.textContent = formatCurrency(pendingTotal);
    }

    const balanceEl = document.getElementById('total-balance');
    balanceEl.style.color = balance >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

    renderRecentTransactions(monthTransactions);
    renderExpenseChart(monthTransactions);
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    const recent = transactions.slice(-5).reverse();

    if (recent.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Nenhuma transação neste mês</p></div>`;
        return;
    }

    container.innerHTML = recent.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <div class="transaction-icon ${t.type}">${categoryIcons[t.category] || '📦'}</div>
                <div class="transaction-details">
                    <h4>${t.description}</h4>
                    <span>${formatDate(t.date)}</span>
                </div>
            </div>
            <div class="transaction-value ${t.type}">${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.value)}</div>
        </div>
    `).join('');
}

function renderExpenseChart(transactions) {
    const ctx = document.getElementById('expense-chart');
    if (window.expenseChart) window.expenseChart.destroy();

    const expenses = transactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    expenses.forEach(t => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.value; });

    const labels = Object.keys(categoryTotals).map(formatCategory);
    const data = Object.values(categoryTotals);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

    if (data.length === 0) return;

    window.expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
}

// ===== RELATÓRIOS =====
function renderReports() {
    const period = parseInt(document.getElementById('report-period').value) || 12;
    renderMonthlyChart(period);
    renderMonthlyTable(period);
    renderComparisonSummary(period);
    renderExpenseDistributionChart();
    renderSavingsEvolutionChart();
}

function getMonthlyData(monthsBack) {
    const data = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.getMonth();
        const year = d.getFullYear();
        
        const monthTransactions = state.transactions.filter(t => {
            const td = new Date(t.date);
            return td.getMonth() === month && td.getFullYear() === year;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0);

        const savings = state.savingsBoxes.reduce((sum, s) => {
            const depositsUntil = (s.history || [])
                .filter(h => new Date(h.date) <= d)
                .reduce((acc, h) => acc + (h.type === 'deposit' ? h.value : -h.value), 0);
            return sum + Math.max(0, depositsUntil);
        }, 0);

        data.push({
            label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            fullLabel: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
            income, expense, balance: income - expense, savings
        });
    }
    return data;
}

function renderComparisonSummary(period) {
    const data = getMonthlyData(period);
    const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
    const totalExpense = data.reduce((sum, d) => sum + d.expense, 0);
    const totalBalance = totalIncome - totalExpense;
    const avgIncome = totalIncome / period;

    document.getElementById('report-total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('report-total-expense').textContent = formatCurrency(totalExpense);
    document.getElementById('report-total-balance').textContent = formatCurrency(totalBalance);
    document.getElementById('report-avg-income').textContent = formatCurrency(avgIncome);

    const balanceEl = document.getElementById('report-total-balance');
    balanceEl.className = `comparison-value ${totalBalance >= 0 ? 'income' : 'expense'}`;
}

function renderMonthlyChart(period) {
    const ctx = document.getElementById('monthly-chart');
    if (window.monthlyChart) window.monthlyChart.destroy();
    const data = getMonthlyData(period);

    window.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [
                { label: 'Receitas', data: data.map(d => d.income), backgroundColor: '#22c55e', borderRadius: 4 },
                { label: 'Despesas', data: data.map(d => d.expense), backgroundColor: '#ef4444', borderRadius: 4 },
                { label: 'Saldo', data: data.map(d => d.balance), type: 'line', borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#6366f1' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            interaction: { intersect: false, mode: 'index' },
            scales: { y: { beginAtZero: true, ticks: { callback: value => 'R$ ' + value.toLocaleString('pt-BR') } } },
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw) } } }
        }
    });
}

function renderMonthlyTable(period) {
    const tbody = document.getElementById('monthly-table-body');
    const data = getMonthlyData(period);
    tbody.innerHTML = data.map(d => `
        <tr>
            <td><strong>${d.fullLabel}</strong></td>
            <td class="income-cell">${formatCurrency(d.income)}</td>
            <td class="expense-cell">${formatCurrency(d.expense)}</td>
            <td class="balance-cell ${d.balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(d.balance)}</td>
            <td class="savings-cell">${formatCurrency(d.savings)}</td>
        </tr>
    `).join('');
}

function renderExpenseDistributionChart() {
    const ctx = document.getElementById('expense-distribution-chart');
    if (window.expenseDistChart) window.expenseDistChart.destroy();

    const categoryTotals = {};
    state.transactions.filter(t => t.type === 'expense').forEach(t => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.value; });

    const labels = Object.keys(categoryTotals).map(formatCategory);
    const data = Object.values(categoryTotals);
    const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

    if (data.length === 0) return;

    window.expenseDistChart = new Chart(ctx, {
        type: 'pie',
        data: { labels, datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderWidth: 0 }] },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a, b) => a + b, 0); const pct = ((ctx.raw / total) * 100).toFixed(1); return `${ctx.label}: ${formatCurrency(ctx.raw)} (${pct}%)`; } } } }
        }
    });
}

function renderSavingsEvolutionChart() {
    const ctx = document.getElementById('savings-evolution-chart');
    if (window.savingsEvolutionChart) window.savingsEvolutionChart.destroy();
    if (state.savingsBoxes.length === 0) return;

    const labels = state.savingsBoxes.map(s => s.name);
    const data = state.savingsBoxes.map(s => s.currentAmount);
    const goals = state.savingsBoxes.map(s => s.goal || 0);
    const colors = state.savingsBoxes.map(s => s.color);

    window.savingsEvolutionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Guardado', data, backgroundColor: colors, borderRadius: 4 },
                { label: 'Meta', data: goals, backgroundColor: 'rgba(0,0,0,0.1)', borderColor: 'rgba(0,0,0,0.3)', borderWidth: 2, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, ticks: { callback: value => 'R$ ' + value.toLocaleString('pt-BR') } } },
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + formatCurrency(ctx.raw) } } }
        }
    });
}

// ===== UTILITÁRIOS =====
function formatCurrency(value) {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        // Lidar com formato ISO ou YYYY-MM-DD
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Tentar formato YYYY-MM-DD
            const parts = dateString.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateString;
        }
        return date.toLocaleDateString('pt-BR');
    } catch {
        return dateString || '';
    }
}

function formatCategory(category) {
    const names = {
        salario: 'Salário', freelance: 'Freelance', investimentos: 'Investimentos',
        alimentacao: 'Alimentação', transporte: 'Transporte', lazer: 'Lazer',
        saude: 'Saúde', educacao: 'Educação', moradia: 'Moradia', servicos: 'Serviços',
        eletronicos: 'Eletrônicos', eletrodomesticos: 'Eletrodomésticos', moveis: 'Móveis',
        vestuario: 'Vestuário', viagem: 'Viagem', outros: 'Outros'
    };
    return names[category] || category;
}

// Expor funções globalmente
window.deleteTransaction = deleteTransaction;
window.toggleFixedPaid = toggleFixedPaid;
window.deleteFixed = deleteFixed;
window.payInstallment = payInstallment;
window.deleteInstallment = deleteInstallment;
window.openSavingsAction = openSavingsAction;
window.deleteSavings = deleteSavings;
window.quickLogin = quickLogin;
