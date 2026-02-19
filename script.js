const DB_NAME = "LiquidTabDB";
const DB_VERSION = 2;
const STORE_NAME = "backgrounds";

const translations = {
    en: {
        greeting: "Welcome,",
        searchPlaceholder: "Search Google...",
        settingsTitle: "Command Center",
        labelLanguage: "Language",
        groupVisual: "Text & Color",
        labelTextEffect: "RGB Effect",
        labelColorBase: "Base Color",
        groupGlass: "Glass Panel",
        labelGlassColor: "Glass Color",
        labelOpacity: "Opacity",
        groupElements: "Elements",
        labelGithub: "GitHub Button",
        labelBookmarks: "Bookmarks Widget",
        labelGlow: "Panel Glow",
        groupBackground: "Background",
        labelDimmer: "Dimmer",
        labelWallpaper: "Wallpaper",
        btnUpload: "Upload",
        groupSystem: "System",
        labelEditMode: "Edit Mode",
        btnEnter: "Enter",
        btnReset: "Reset All",
        editModeTitle: "EDIT MODE",
        editModeSubtitle: "Drag to move • Wheel to scale",
        btnSave: "Save",
        modalBookmarkTitle: "New Bookmark",
        btnCancel: "Cancel",
        btnSaveBookmark: "Save"
    },
    es: {
        greeting: "Bienvenido,",
        searchPlaceholder: "Buscar en Google...",
        settingsTitle: "Centro de Mando",
        labelLanguage: "Idioma",
        groupVisual: "Texto y Color",
        labelTextEffect: "Efecto RGB",
        labelColorBase: "Color Base",
        groupGlass: "Panel de Vidrio",
        labelGlassColor: "Color Vidrio",
        labelOpacity: "Opacidad",
        groupElements: "Elementos",
        labelGithub: "Botón GitHub",
        labelBookmarks: "Widget Marcadores",
        labelGlow: "Resplandor",
        groupBackground: "Fondo",
        labelDimmer: "Oscuridad",
        labelWallpaper: "Fondo de Pantalla",
        btnUpload: "Subir",
        groupSystem: "Sistema",
        labelEditMode: "Modo Edición",
        btnEnter: "Entrar",
        btnReset: "Resetear Todo",
        editModeTitle: "MODO EDICIÓN",
        editModeSubtitle: "Arrastra para mover • Rueda para escalar",
        btnSave: "Guardar",
        modalBookmarkTitle: "Nuevo Marcador",
        btnCancel: "Cancelar",
        btnSaveBookmark: "Guardar"
    }
};

const openDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
        if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
            e.target.result.createObjectStore(STORE_NAME);
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

async function saveImage(blob) {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(blob, "current_bg");
        tx.oncomplete = () => resolve();
    });
}

async function loadImage() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get("current_bg");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch (e) {
        return null;
    }
}

async function clearDB() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).clear();
            tx.oncomplete = () => resolve();
        });
    } catch (e) {
        return null;
    }
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const ui = {
        name: document.getElementById('user-name'),
        card: document.getElementById('main-ui'),
        bookmarks: document.getElementById('bookmarks-widget'),
        githubBtn: document.getElementById('github-btn'),
        overlay: document.querySelector('.overlay'),
        settingsModal: document.getElementById('settings-modal'),
        settingsBtn: document.getElementById('settings-toggle'),
        closeSettings: document.getElementById('close-settings'),
        settingsPanel: document.querySelector('.settings-panel'),
        
        langToggle: document.getElementById('lang-toggle'),
        textEffect: document.getElementById('text-effect-select'),
        colorPicker: document.getElementById('color-picker'),
        cardColorPicker: document.getElementById('card-color-picker'),
        cardOpacity: document.getElementById('card-opacity'),
        toggleBreathe: document.getElementById('toggle-breathe'),
        toggleBookmarks: document.getElementById('toggle-bookmarks'),
        toggleGithub: document.getElementById('toggle-github'),
        bgDimmer: document.getElementById('bg-dimmer'),
        
        btnEdit: document.getElementById('btn-edit-mode'),
        resetConfig: document.getElementById('reset-config'),
        editOverlay: document.getElementById('edit-overlay'),
        saveLayout: document.getElementById('save-layout'),
        
        bookmarksGrid: document.getElementById('bookmarks-grid'),
        bookmarkModal: document.getElementById('bookmark-modal'),
        bmTitle: document.getElementById('bm-title'),
        bmUrl: document.getElementById('bm-url'),
        bmSave: document.getElementById('bm-save'),
        bmCancel: document.getElementById('bm-cancel'),

        fileInput: document.getElementById('file-input'),
        cropModal: document.getElementById('crop-modal'),
        imgEl: document.getElementById('image-to-crop'),
        btnCropSave: document.getElementById('btn-save'),
        btnCropCancel: document.getElementById('btn-cancel')
    };

    let config = JSON.parse(localStorage.getItem('liquidConfig')) || {
        language: 'en',
        userName: 'User',
        themeColor: '#ffffff',
        cardColor: '#ffffff',
        textEffect: 'solid',
        cardOpacity: 20,
        breatheEnabled: true,
        bookmarksVisible: true,
        githubVisible: true,
        dimmerOpacity: 60,
        scales: { card: 1, bookmarks: 1 },
        positions: { card: null, bookmarks: null }
    };

    let bookmarks = JSON.parse(localStorage.getItem('liquid_bookmarks')) || Array(9).fill(null);

    function updateLanguage(lang) {
        const t = translations[lang];
        if (!t) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.innerText = t[key];
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) el.placeholder = t[key];
        });
        if(ui.langToggle) ui.langToggle.checked = (lang === 'es');
    }

    function applyConfig() {
        updateLanguage(config.language);

        if(config.userName === 'User' || config.userName === 'Usuario') {
            ui.name.innerText = config.language === 'en' ? 'User' : 'Usuario';
        } else {
            ui.name.innerText = config.userName;
        }

        ui.name.className = '';
        ui.name.setAttribute('data-text', config.userName);
        
        if (config.textEffect !== 'solid') {
            ui.name.classList.add(`fx-${config.textEffect}`);
            const pickerContainer = document.getElementById('color-picker-container');
            if(config.textEffect === 'rainbow') {
                pickerContainer.classList.add('hidden');
            } else {
                pickerContainer.classList.remove('hidden');
            }
        } else {
            document.getElementById('color-picker-container').classList.remove('hidden');
        }
        
        document.documentElement.style.setProperty('--text-color', config.themeColor);
        ui.name.style.color = (config.textEffect === 'solid') ? config.themeColor : 'white';

        const rgb = hexToRgb(config.cardColor || '#ffffff');
        const alpha = config.cardOpacity / 100;
        
        document.documentElement.style.setProperty('--card-bg', `rgba(${rgb}, ${alpha})`);

        if (config.breatheEnabled) ui.card.classList.add('anim-breathe');
        else ui.card.classList.remove('anim-breathe');
        
        ui.bookmarks.style.display = config.bookmarksVisible ? 'grid' : 'none';
        if (!config.bookmarksVisible) ui.bookmarks.classList.add('hidden');
        else ui.bookmarks.classList.remove('hidden');
        
        ui.githubBtn.style.display = config.githubVisible ? 'flex' : 'none';

        ui.overlay.style.background = `radial-gradient(circle, rgba(0,0,0,${config.dimmerOpacity/100 * 0.4}) 20%, rgba(0,0,0,${config.dimmerOpacity/100}) 100%)`;

        applyTransform(ui.card, config.positions.card, 'card');
        applyTransform(ui.bookmarks, config.positions.bookmarks, 'bookmarks');

        if(ui.langToggle) ui.langToggle.checked = (config.language === 'es');
        ui.textEffect.value = config.textEffect;
        ui.colorPicker.value = config.themeColor;
        ui.cardColorPicker.value = config.cardColor || '#ffffff';
        ui.cardOpacity.value = config.cardOpacity;
        ui.toggleBreathe.checked = config.breatheEnabled;
        ui.toggleBookmarks.checked = config.bookmarksVisible;
        ui.toggleGithub.checked = config.githubVisible;
        ui.bgDimmer.value = config.dimmerOpacity;
    }

    function applyTransform(element, pos, id) {
        if (pos && pos.x !== undefined && pos.y !== undefined) {
            let xStr = pos.x;
            let yStr = pos.y;
            
            if (typeof pos.x === 'number') {
                xStr = ((pos.x / window.innerWidth) * 100).toFixed(2) + '%';
                yStr = ((pos.y / window.innerHeight) * 100).toFixed(2) + '%';
            }

            element.style.position = 'fixed';
            element.style.left = xStr;
            element.style.top = yStr;
            element.style.margin = 0;
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        }
        
        let scale = 1;
        if(config.scales && config.scales[id]) {
            scale = config.scales[id];
        }
        element.style.transform = `scale(${scale})`;
    }

    function saveConfig() {
        localStorage.setItem('liquidConfig', JSON.stringify(config));
    }

    ui.langToggle.addEventListener('change', (e) => {
        config.language = e.target.checked ? 'es' : 'en';
        updateLanguage(config.language);
        if(config.userName === 'User' || config.userName === 'Usuario') {
             config.userName = config.language === 'en' ? 'User' : 'Usuario';
             ui.name.innerText = config.userName;
        }
        saveConfig();
    });

    ui.name.addEventListener('input', () => { 
        config.userName = ui.name.innerText; 
        ui.name.setAttribute('data-text', config.userName);
        saveConfig(); 
    });
    
    ui.textEffect.addEventListener('change', (e) => { config.textEffect = e.target.value; applyConfig(); saveConfig(); });
    
    // --- LÓGICA DE GHOST UI PARA COLORES Y RANGOS ---
    const interactiveInputs = [ui.colorPicker, ui.cardColorPicker, ui.cardOpacity, ui.bgDimmer];

    interactiveInputs.forEach(input => {
        // Al interactuar (click, toque o empezar a mover)
        input.addEventListener('mousedown', () => ui.settingsModal.classList.add('ghost-ui'));
        input.addEventListener('touchstart', () => ui.settingsModal.classList.add('ghost-ui'));
        
        // Al soltar
        input.addEventListener('mouseup', () => ui.settingsModal.classList.remove('ghost-ui'));
        input.addEventListener('touchend', () => ui.settingsModal.classList.remove('ghost-ui'));
        input.addEventListener('change', () => ui.settingsModal.classList.remove('ghost-ui')); // Para color pickers al cerrar la paleta
        
        // Durante el cambio
        input.addEventListener('input', (e) => {
            if(e.target === ui.cardOpacity) config.cardOpacity = e.target.value;
            if(e.target === ui.bgDimmer) config.dimmerOpacity = e.target.value;
            if(e.target === ui.colorPicker) config.themeColor = e.target.value;
            if(e.target === ui.cardColorPicker) config.cardColor = e.target.value;
            applyConfig(); 
            saveConfig();
        });
    });

    ui.toggleBreathe.addEventListener('change', (e) => { config.breatheEnabled = e.target.checked; applyConfig(); saveConfig(); });
    ui.toggleBookmarks.addEventListener('change', (e) => { config.bookmarksVisible = e.target.checked; applyConfig(); saveConfig(); });
    ui.toggleGithub.addEventListener('change', (e) => { config.githubVisible = e.target.checked; applyConfig(); saveConfig(); });

    ui.settingsBtn.onclick = () => ui.settingsModal.classList.remove('hidden');
    ui.closeSettings.onclick = () => ui.settingsModal.classList.add('hidden');
    ui.settingsModal.addEventListener('click', (e) => { 
        if (e.target === ui.settingsModal) ui.settingsModal.classList.add('hidden'); 
    });

    ui.resetConfig.addEventListener('click', async () => {
        const msg = config.language === 'es' ? 
            "¿Estás seguro de resetear todo (Fondo, Marcadores, Config)?" : 
            "Are you sure you want to reset everything (Wallpaper, Bookmarks, Config)?";
        
        if(confirm(msg)) {
            localStorage.clear();
            await clearDB();
            location.reload();
        }
    });

    let isEditMode = false;

    function enableDragAndZoom(element, id) {
        let isDragging = false;
        let offsetX, offsetY;

        element.addEventListener('mousedown', (e) => {
            if (!isEditMode) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
            isDragging = true;
            element.style.cursor = 'grabbing';
            element.style.transition = 'none';
            
            const rect = element.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            element.style.position = 'fixed';
            element.style.margin = 0;
            element.style.bottom = 'auto';
            element.style.right = 'auto';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const xPx = e.clientX - offsetX;
            const yPx = e.clientY - offsetY;
            
            const xPercent = (xPx / window.innerWidth) * 100;
            const yPercent = (yPx / window.innerHeight) * 100;
            
            element.style.left = `${xPercent.toFixed(2)}%`;
            element.style.top = `${yPercent.toFixed(2)}%`;
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            element.style.cursor = 'grab';
            element.style.transition = 'transform 0.1s linear, background 0.3s ease';
            
            if (!config.positions) config.positions = {};
            config.positions[id] = { 
                x: element.style.left, 
                y: element.style.top 
            };
            saveConfig();
        });

        element.addEventListener('wheel', (e) => {
            if (!isEditMode) return;
            e.preventDefault();
            e.stopPropagation();
            const direction = e.deltaY > 0 ? -0.05 : 0.05;
            let currentScale = 1;
            if (config.scales && config.scales[id]) currentScale = parseFloat(config.scales[id]);
            let newScale = currentScale + direction;
            if (newScale < 0.3) newScale = 0.3;
            if (newScale > 3) newScale = 3;
            if (!config.scales) config.scales = { card: 1, bookmarks: 1 };
            config.scales[id] = newScale.toFixed(2);
            element.style.transform = `scale(${config.scales[id]})`;
            saveConfig();
        }, { passive: false });
    }

    ui.btnEdit.addEventListener('click', () => {
        isEditMode = true;
        ui.settingsModal.classList.add('hidden');
        ui.editOverlay.classList.remove('hidden');
        ui.card.classList.add('draggable');
        ui.bookmarks.classList.add('draggable');
        enableDragAndZoom(ui.card, 'card');
        enableDragAndZoom(ui.bookmarks, 'bookmarks');
    });

    ui.saveLayout.addEventListener('click', () => {
        isEditMode = false;
        ui.editOverlay.classList.add('hidden');
        ui.card.classList.remove('draggable');
        ui.bookmarks.classList.remove('draggable');
        ui.card.style.cursor = 'default';
        ui.bookmarks.style.cursor = 'default';
        applyConfig();
    });

    let activeSlot = null;
    
    function renderBookmarks() {
        ui.bookmarksGrid.innerHTML = '';
        bookmarks.forEach((bm, i) => {
            const slot = document.createElement('div');
            slot.className = 'bookmark-slot';
            if (bm) {
                slot.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=64&domain=${bm.url}" title="${bm.title}">`;
                slot.onclick = () => { if(!isEditMode) window.location.href = bm.url; };
                slot.oncontextmenu = (e) => {
                    e.preventDefault();
                    const msg = config.language === 'es' ? `¿Eliminar ${bm.title}?` : `Delete ${bm.title}?`;
                    if(confirm(msg)) { bookmarks[i] = null; saveBookmarks(); }
                };
            } else {
                slot.innerHTML = '<span>+</span>';
                slot.onclick = () => {
                    if(!isEditMode) {
                        activeSlot = i;
                        ui.bookmarkModal.classList.remove('hidden');
                        ui.bmTitle.focus();
                    }
                };
            }
            ui.bookmarksGrid.appendChild(slot);
        });
    }

    function saveBookmarks() {
        localStorage.setItem('liquid_bookmarks', JSON.stringify(bookmarks));
        renderBookmarks();
    }
    
    ui.bmSave.addEventListener('click', () => {
        const title = ui.bmTitle.value;
        const url = ui.bmUrl.value;
        if (title && url) {
            const finalUrl = url.includes('http') ? url : 'https://' + url;
            bookmarks[activeSlot] = { title, url: finalUrl };
            saveBookmarks();
            ui.bookmarkModal.classList.add('hidden');
            ui.bmTitle.value = ''; ui.bmUrl.value = '';
        }
    });

    ui.bmCancel.addEventListener('click', () => ui.bookmarkModal.classList.add('hidden'));

    let cropper = null;

    ui.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        ui.settingsModal.classList.add('hidden');
        if (file.type === 'image/gif') {
            saveImage(file).then(() => { applyBG(); ui.fileInput.value = ''; });
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            ui.imgEl.src = ev.target.result;
            ui.cropModal.classList.remove('hidden');
            if (cropper) cropper.destroy();
            cropper = new Cropper(ui.imgEl, { aspectRatio: window.innerWidth / window.innerHeight, viewMode: 1 });
        };
        reader.readAsDataURL(file);
    });

    ui.btnCropSave.addEventListener('click', () => {
        if (!cropper) return;
        cropper.getCroppedCanvas({ width: window.innerWidth }).toBlob(async blob => {
            await saveImage(blob);
            applyBG();
            ui.cropModal.classList.add('hidden');
            cropper.destroy();
        });
    });

    ui.btnCropCancel.addEventListener('click', () => {
        ui.cropModal.classList.add('hidden');
        ui.settingsModal.classList.remove('hidden');
        if (cropper) cropper.destroy();
    });

    async function applyBG() {
        const blob = await loadImage();
        const bgLayer = document.getElementById('bg-layer');
        if (blob) {
            bgLayer.style.backgroundImage = `url(${URL.createObjectURL(blob)})`;
        } else {
            bgLayer.style.backgroundImage = "none";
        }
    }

    applyConfig();
    applyBG();
    renderBookmarks();
    document.getElementById('main-search-input').focus();
});