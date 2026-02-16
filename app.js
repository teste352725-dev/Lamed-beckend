// --- CONFIGURAÇÃO DO FIREBASE (SEJA PROFETA) ---
const firebaseConfig = {
    apiKey: "AIzaSyCn1WxBe77o__An60x3MLpDqYWWm6aEPYs",
    authDomain: "seja-profeta.firebaseapp.com",
    projectId: "seja-profeta",
    storageBucket: "seja-profeta.firebasestorage.app",
    messagingSenderId: "723319911712",
    appId: "1:723319911712:web:9a674107795088f7281345",
    measurementId: "G-SK49J6BZ34"
};

// Inicialização segura
let app;
try {
    app = firebase.app();
} catch (e) {
    app = firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// =======================================================
// 🔥 STORAGE (PROJETO site-lamed)
// =======================================================
let storageApp;
try {
    storageApp = firebase.app('siteLamedStorageAppV2');
} catch (_) {
    storageApp = firebase.initializeApp({
        apiKey: "AIzaSyCzB4_YotWCPVh1yaqWkhbB4LypPQYvV4U",
        authDomain: "site-lamed.firebaseapp.com",
        projectId: "site-lamed",
        storageBucket: "site-lamed.firebasestorage.app",
        messagingSenderId: "862756160215",
        appId: "1:862756160215:web:d0fded233682bf93eaa692"
    }, 'siteLamedStorageAppV2');
}

const storage = firebase.storage(storageApp);
const storageRoot = storage.refFromURL('gs://site-lamed.firebasestorage.app');
const storageAuth = firebase.auth(storageApp);
storageAuth.onAuthStateChanged(async (user) => {
    if (!user) {
        try { await storageAuth.signInAnonymously(); }
        catch (err) { console.error('[StorageAuth] Falha no login anônimo:', err); }
    }
});
console.info('[Storage] bucket em uso:', storage.app.options.storageBucket);

async function ensureStorageAuth() {
    if (storageAuth.currentUser) return;
    await storageAuth.signInAnonymously();
}

// --- ESTADO GLOBAL ---
let products = [];
let collections = [];
const storedCart = localStorage.getItem('lamedCart') || localStorage.getItem('ferrugemCart');
let cart = storedCart ? JSON.parse(storedCart) : [];

// Filtros
let currentCategory = '__ALL__'; // '__ALL__' | 'Unicos' | 'Classicas' | 'Kits' ...
let currentSearch = '';
let searchTimer = null;

// --- HELPERS (PREÇO) ---
// Aceita:
// - number (ex: 39.9)
// - string "R$ 39,90"
// - string "39,90" / "39.90"
// - string com milhar "1.299,90"
function parsePrecoToNumber(v) {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v !== 'string') return 0;

    const cleaned = v
        .trim()
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(/\./g, '')      // remove separador de milhar
        .replace(',', '.');      // converte decimal pt-BR

    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

function formatarReal(v) {
    const n = parsePrecoToNumber(v);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function normalizeText(s) {
    return (s || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

function getCatNormalized(cat) {
    const c = normalizeText(cat);
    // aceitamos variações comuns
    if (c.includes('unico')) return 'unicos';
    if (c.includes('class')) return 'classicas';
    if (c.includes('kit')) return 'kits';
    return c;
}


function getProductCategory(p) {
    return p?.categoria || p?.cat || '';
}

function getProductDescription(p) {
    return p?.descricao || p?.desc || '';
}

function getProductImages(p) {
    if (Array.isArray(p?.imagens) && p.imagens.length) return p.imagens;
    if (Array.isArray(p?.img) && p.img.length) return p.img;
    if (p?.img) return [p.img];
    return [];
}

function normalizeProduct(raw) {
    const categoria = getProductCategory(raw);
    const imagens = getProductImages(raw);
    const descricao = getProductDescription(raw);
    return {
        ...raw,
        cat: categoria,
        categoria,
        img: imagens[0] || '',
        imagens,
        desc: descricao,
        descricao,
        preco: parsePrecoToNumber(raw?.preco),
        status: raw?.status || 'active'
    };
}

// --- CARREGAMENTO DE DADOS ---
async function loadStoreData() {
    try {
        const [prodSnap, colSnap] = await Promise.all([
            db.collection('pecas').get(),
            db.collection('colecoes').where('ativa', '==', true).orderBy('ordem', 'asc').get()
        ]);

        products = prodSnap.docs
            .map(doc => normalizeProduct({ id: doc.id, ...doc.data() }))
            .filter(p => (p.status || 'active') === 'active');

        collections = colSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCollectionsSection(collections);
        renderCategoryButtons(collections);

        applyFiltersAndRender();
        updateCartUI();

        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';

    } catch (error) {
        console.error("Erro ao carregar loja:", error);
    }
}

function renderCollectionsSection(lista) {
    const grid = document.getElementById('collections-grid');
    if (!grid) return;

    if (!Array.isArray(lista) || lista.length === 0) {
        grid.innerHTML = '<p class="text-center text-gray-400 col-span-full">Nenhuma coleção ativa no momento.</p>';
        return;
    }

    grid.innerHTML = lista.map((c) => {
        const slug = getCatNormalized(c.slug || c.nome || '');
        const nome = c.nome || 'Coleção';
        const img = c.imagemDestaque || 'https://placehold.co/800x1000?text=Colecao';
        return `
            <div class="relative group cursor-pointer overflow-hidden aspect-[4/5]" onclick="filterCat('${slug.replace(/'/g, "\'")}')">
                <img src="${img}" class="w-full h-full object-cover transition duration-700 group-hover:scale-110" alt="${nome}">
                <div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500"><span class="text-white font-serif text-3xl italic">${nome}</span></div>
            </div>
        `;
    }).join('');
}

function renderCategoryButtons(lista) {
    const wrap = document.getElementById('category-buttons');
    if (!wrap) return;

    const firstBtn = `<button onclick="filterCat('__ALL__')" class="cat-btn text-xs uppercase tracking-widest text-[--cor-cta] hover:text-[--cor-ouro]" data-cat="__ALL__" type="button"><div>Todos</div></button>`;
    if (!Array.isArray(lista) || lista.length === 0) {
        wrap.innerHTML = firstBtn;
        return;
    }

    const others = lista.map((c) => {
        const slug = getCatNormalized(c.slug || c.nome || '');
        const nome = c.nome || slug;
        return `<button onclick="filterCat('${slug.replace(/'/g, "\'")}')" class="cat-btn text-xs uppercase tracking-widest text-gray-400 hover:text-[--cor-ouro]" data-cat="${slug}"><div>${nome}</div></button>`;
    }).join('');

    wrap.innerHTML = firstBtn + others;
}

// --- FILTRO + SEARCH ---
function setFilterPill(text) {
    const el = document.getElementById('filter-pill-text');
    if (el) el.innerText = text || 'Todas';
}

function setActiveCategoryBtn(cat) {
    const btns = document.querySelectorAll('.cat-btn');
    btns.forEach(b => {
        const c = b.getAttribute('data-cat');
        const active = (c === cat);
        const circle = b.querySelector('div');
        if (circle) {
            circle.classList.toggle('ring-2', active);
            circle.classList.toggle('ring-[#d4af37]', active);
            circle.classList.toggle('ring-offset-2', active);
            circle.classList.toggle('ring-offset-[#fdfcf9]', active);
        }
    });
}

window.filterCat = (cat) => {
    currentCategory = cat || '__ALL__';
    setActiveCategoryBtn(currentCategory);

    // Atualiza pill
    if (currentCategory === '__ALL__') setFilterPill('Todas');
    else if (getCatNormalized(currentCategory) === 'unicos') setFilterPill('Únicas');
    else if (getCatNormalized(currentCategory) === 'classicas') setFilterPill('Clássicas');
    else if (getCatNormalized(currentCategory) === 'kits') setFilterPill('Kits');
    else setFilterPill(currentCategory);

    applyFiltersAndRender();

    // Scroll suave para o acervo
    const acervo = document.getElementById('acervo');
    if (acervo) acervo.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.searchProducts = (term) => {
    currentSearch = (term || '').toString();
    applyFiltersAndRender();
};

function applyFiltersAndRender() {
    const term = normalizeText(currentSearch);
    const cat = currentCategory;

    const filtered = products.filter(p => {
        // Categoria
        if (cat && cat !== '__ALL__') {
            const pCat = getCatNormalized(getProductCategory(p));
            const want = getCatNormalized(cat);
            if (pCat !== want) return false;
        }

        // Busca (nome/desc/cat)
        if (term.length > 0) {
            const hay = normalizeText(`${p.nome || ''} ${getProductDescription(p) || ''} ${getProductCategory(p) || ''}`);
            if (!hay.includes(term)) return false;
        }

        return true;
    });

    renderProducts(filtered);
}

// --- RENDERIZAÇÃO ---
function renderProducts(lista) {
    const container = document.getElementById('products-grid');
    if (!container) return;

    if (!Array.isArray(lista) || lista.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20 text-gray-400">
                Nenhuma peça encontrada.
                <div class="mt-3 text-[10px] uppercase tracking-widest text-gray-300">
                    Tente trocar a categoria ou limpar a busca.
                </div>
                <button onclick="filterCat('__ALL__'); searchProducts(''); if(window.clearSearch) window.clearSearch();" class="mt-6 bg-white border border-gray-100 shadow-sm px-5 py-3 text-[10px] uppercase tracking-widest hover:border-[#d4af37] transition" type="button">
                    Limpar filtros
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = lista.map(p => {
        // imagens
        const imgs = getProductImages(p);
        const imgUrl = imgs[0] || 'https://placehold.co/400x500?text=Atelier';

        // preço
        const precoDisplay = formatarReal(p.preco);

        // tag única
        const isUnico = getCatNormalized(getProductCategory(p)) === 'unicos';
        const tagUnico = isUnico
            ? '<span class="absolute top-2 left-2 bg-[#1a110a] text-[#d4af37] text-[9px] px-2 py-1 uppercase tracking-widest z-10">Peça Única</span>'
            : '';

        return `
            <div class="product-card group bg-white border border-[#E5E0D8] relative cursor-pointer hover:shadow-lg transition-all duration-300" onclick="openDetails('${p.id}')">
                ${tagUnico}
                <div class="relative overflow-hidden aspect-[4/5]">
                    <img src="${imgUrl}" alt="${p.nome || 'Produto'}" class="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105">
                </div>
                <div class="p-4 text-center">
                    <h3 class="text-[11px] font-bold uppercase tracking-[2px] mb-1 text-[#1a110a] truncate">${p.nome || 'Sem nome'}</h3>
                    <p class="text-[13px] text-[#d4af37] font-serif italic">${precoDisplay}</p>
                </div>
                <button onclick="event.stopPropagation(); addToCart('${p.id}')" class="w-full bg-[#643f21] text-white text-[10px] uppercase tracking-widest py-3 hover:bg-[#4a2e18] transition-colors" type="button">
                    Adicionar à Bolsa
                </button>
            </div>
        `;
    }).join('');
}

// --- GALERIA NO MODAL ---
function setModalImage(url) {
    const main = document.getElementById('modal-img');
    if (main) main.src = url || 'https://placehold.co/800x1000?text=Atelier';
}

function renderThumbs(imgs, selectedUrl) {
    const thumbs = document.getElementById('modal-thumbs');
    if (!thumbs) return;

    if (!Array.isArray(imgs) || imgs.length <= 1) {
        thumbs.innerHTML = '';
        return;
    }

    thumbs.innerHTML = imgs.map((u) => {
        const active = u === selectedUrl;
        return `
            <button type="button" class="shrink-0 w-16 h-16 rounded-xl overflow-hidden border ${active ? 'border-[#d4af37]' : 'border-white/70'} bg-white/80 shadow-sm hover:border-[#d4af37] transition" onclick="event.stopPropagation(); window._setModalImg('${u.replace(/'/g, "\\'")}')">
                <img src="${u}" class="w-full h-full object-cover" alt="">
            </button>
        `;
    }).join('');
}

// Exposto para o onclick inline
window._setModalImg = (url) => {
    setModalImage(url);
    // atualiza thumbs (borda ativa)
    const p = JSON.parse(localStorage.getItem('currentProduct') || 'null');
    if (!p) return;
    const imgs = getProductImages(p);
    renderThumbs(imgs, url);
};

// --- DETALHES DO PRODUTO (Modal) ---
window.openDetails = (id) => {
    const p = products.find(x => x.id === id);
    if (!p) return;

    localStorage.setItem('currentProduct', JSON.stringify(p));

    const modal = document.getElementById('product-modal');
    if (!modal) return;

    const imgs = getProductImages(p);
    const first = imgs[0] || 'https://placehold.co/800x1000?text=Atelier';

    setModalImage(first);
    renderThumbs(imgs, first);

    document.getElementById('modal-title').innerText = p.nome || "Produto";
    document.getElementById('modal-price').innerText = formatarReal(p.preco);
    document.getElementById('modal-desc').innerText = getProductDescription(p) || "Produto artesanal selecionado para você.";
    document.getElementById('modal-add-btn').onclick = () => addToCart(p.id);

    modal.classList.remove('hidden');
};

// --- CARRINHO ---
window.addToCart = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const existing = cart.find(item => item.id === id);

    const isUnico = getCatNormalized(getProductCategory(product)) === 'unicos';

    if (existing) {
        // Se for peça única, não permite adicionar mais de 1
        if (isUnico) {
            alert("Esta é uma peça única. Apenas 1 unidade disponível.");
            return;
        }
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            nome: product.nome || "Produto",
            // Guardar preço como número (robusto)
            precoNum: parsePrecoToNumber(product.preco),
            img: getProductImages(product)[0] || '',
            cat: getProductCategory(product) || '',
            categoriaNorm: getCatNormalized(getProductCategory(product)),
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    toggleCart(true); // Abre o carrinho
};

window.removeFromCart = (index) => {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
};

window.changeQty = (index, delta) => {
    const item = cart[index];
    if (!item) return;

    if ((item.categoriaNorm || getCatNormalized(item.cat)) === 'unicos' && delta > 0) return; // Trava quantidade de unicos

    item.quantity += delta;
    if (item.quantity <= 0) cart.splice(index, 1);
    saveCart();
    updateCartUI();
};

function saveCart() {
    localStorage.setItem('lamedCart', JSON.stringify(cart));
    localStorage.setItem('ferrugemCart', JSON.stringify(cart)); // compat legado
}

function updateCartUI() {
    const badges = document.querySelectorAll('.cart-count');
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    const totalQty = cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
    badges.forEach(b => {
        b.innerText = totalQty;
        b.classList.toggle('hidden', totalQty === 0);
    });

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center py-10 text-gray-400 text-xs uppercase tracking-widest">Sua bolsa está vazia</div>';
        if (totalEl) totalEl.innerText = "R$ 0,00";
        return;
    }

    let totalVal = 0;

    container.innerHTML = cart.map((item, index) => {
        const precoNum = typeof item.precoNum === 'number' ? item.precoNum : parsePrecoToNumber(item.precoNum);
        const qty = item.quantity || 0;

        totalVal += precoNum * qty;

        return `
            <div class="flex gap-4 border-b border-gray-100 pb-4">
                <img src="${item.img || 'https://placehold.co/200x250?text=Atelier'}" class="w-16 h-20 object-cover border border-gray-100" alt="">
                <div class="flex-1">
                    <h4 class="text-[10px] font-bold uppercase tracking-widest text-[#1a110a]">${item.nome || 'Produto'}</h4>
                    <p class="text-xs text-gray-500 mb-2">${formatarReal(precoNum)}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center border border-gray-200">
                            <button onclick="changeQty(${index}, -1)" class="px-2 text-gray-500 hover:bg-gray-100" type="button">-</button>
                            <span class="px-2 text-xs">${qty}</span>
                            <button onclick="changeQty(${index}, 1)" class="px-2 text-gray-500 hover:bg-gray-100" type="button">+</button>
                        </div>
                        <button onclick="removeFromCart(${index})" class="text-[9px] uppercase text-red-400 hover:text-red-600" type="button">Remover</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (totalEl) totalEl.innerText = formatarReal(totalVal);
}

// --- CHECKOUT WHATSAPP ---
window.checkoutWhatsApp = () => {
    if (cart.length === 0) return;

    let msg = `*NOVO PEDIDO - SEJA PROFETA*\n\n`;

    cart.forEach(item => {
        const preco = formatarReal(item.precoNum);
        msg += `🕯️ *${item.nome}*\n`;
        msg += `   Qtd: ${item.quantity} | Valor: ${preco}\n`;
    });

    const total = document.getElementById('cart-total')?.innerText || formatarReal(
        cart.reduce((acc, i) => acc + (i.precoNum || 0) * (i.quantity || 0), 0)
    );

    msg += `\n💰 *Total Estimado: ${total}*\n`;
    msg += `\n_Gostaria de confirmar a disponibilidade e o frete._`;

    const url = `https://wa.me/5527997310994?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
};

// --- UI HELPERS (CORRIGIDO: usa .active como no CSS) ---
window.toggleCart = (show) => {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (!drawer || !overlay) return;

    if (show) {
        drawer.classList.add('active');
        overlay.classList.remove('hidden');
    } else {
        drawer.classList.remove('active');
        overlay.classList.add('hidden');
    }
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    // Estado inicial UI
    setActiveCategoryBtn(currentCategory);
    setFilterPill('Todas');

    // Listener de busca (com debounce)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value || '';
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                window.searchProducts(val);
            }, 120);
        });
    }

    // Autenticação anônima para leitura do banco (evita falhas por regra)
    auth.signInAnonymously()
        .then(() => loadStoreData())
        .catch((e) => {
            console.error("Erro auth anonimo", e);
            // Tenta carregar mesmo assim (útil se suas rules permitirem leitura pública)
            loadStoreData();
        });

    updateCartUI();
});


// =======================================================
// 📤 UPLOAD DE IMAGEM PARA FIREBASE STORAGE
// =======================================================
window.uploadImagemProduto = async function(file, produtoId) {
    try {
        await ensureStorageAuth();
        const ref = storageRoot.child(`produtos/${produtoId}/${Date.now()}_${file.name}`);
        const snap = await ref.put(file);
        const url = await snap.ref.getDownloadURL();
        return url;
    } catch (err) {
        console.error("Erro no upload:", err);
        throw err;
    }
};
