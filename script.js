// --- CONFIGURACIÓN BASE DE DATOS ---
const DB_NAME = "LiquidTabDB";
const DB_VERSION = 2;
const STORE_NAME = "backgrounds";

// --- VALIDACIÓN ---
if (typeof Cropper === 'undefined') console.error("❌ Cropper.js no cargado.");

// --- FUNCIONES DB ---
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
            db.createObjectStore(STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(req.error);
    });
}

async function saveImage(blob) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(blob, "current_bg");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadImage() {
    const db = await openDB();
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get("current_bg");
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
    });
}

async function clearImage() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
    });
}

// --- TEMA Y COLOR ---
function updateTheme(hexColor) {
    const root = document.documentElement;
    root.style.setProperty('--text-color', hexColor);

    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness > 128) { 
        root.style.setProperty('--search-bg', 'rgba(0, 0, 0, 0.5)');
        root.style.setProperty('--search-border', 'rgba(255, 255, 255, 0.2)');
        root.style.setProperty('--placeholder', 'rgba(255, 255, 255, 0.6)');
        root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.08)');
    } else { 
        root.style.setProperty('--search-bg', 'rgba(255, 255, 255, 0.65)');
        root.style.setProperty('--search-border', 'rgba(0, 0, 0, 0.1)');
        root.style.setProperty('--placeholder', 'rgba(0, 0, 0, 0.6)');
        root.style.setProperty('--glass-bg', 'rgba(0, 0, 0, 0.05)');
    }
    localStorage.setItem('themeColor', hexColor);
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {

    // 1. AUTO-FOCUS
    const searchInput = document.getElementById('main-search-input');
    if (searchInput) {
        searchInput.focus();
        const focusInterval = setInterval(() => {
            searchInput.focus();
            if (document.activeElement === searchInput) clearInterval(focusInterval);
        }, 10);
        setTimeout(() => clearInterval(focusInterval), 500);
    }

    // 2. Usuario
    const nameInput = document.getElementById('user-name');
    if (nameInput) {
        nameInput.innerText = localStorage.getItem('userName') || "Usuario";
        nameInput.addEventListener('input', () => localStorage.setItem('userName', nameInput.innerText));
        nameInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') { e.preventDefault(); nameInput.blur(); } });
    }

    // 3. Tema
    const savedColor = localStorage.getItem('themeColor') || '#ffffff';
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.value = savedColor;
        updateTheme(savedColor);
        colorPicker.addEventListener('input', (e) => updateTheme(e.target.value));
    }

    // 4. Fondo
    async function applyBackground() {
        try {
            const blob = await loadImage();
            if (blob) {
                document.getElementById('bg-layer').style.backgroundImage = `url(${URL.createObjectURL(blob)})`;
            } else {
                document.getElementById('bg-layer').style.backgroundImage = "none";
                document.getElementById('bg-layer').style.background = "linear-gradient(135deg, #0f2027, #203a43, #2c5364)";
            }
        } catch (e) { console.log("Init clean"); }
    }
    applyBackground();

    // 5. Menús
    const settingsBtn = document.getElementById('settings-toggle');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const resetBtn = document.getElementById('reset-default');

    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

    resetBtn.addEventListener('click', async () => {
        if(confirm("¿Restaurar fondo original?")) {
            await clearImage();
            applyBackground();
            settingsModal.classList.add('hidden');
        }
    });

    // 6. Cropper Inteligente (SOLUCIÓN AQUÍ)
    const fileInput = document.getElementById('file-input');
    const cropModal = document.getElementById('crop-modal');
    const imgElement = document.getElementById('image-to-crop');
    const btnSave = document.getElementById('btn-save');
    const btnCancel = document.getElementById('btn-cancel');
    let cropper = null;

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            settingsModal.classList.add('hidden');

            if (file.type === 'image/gif') {
                if(confirm("¿Guardar GIF?")) {
                    await saveImage(file);
                    applyBackground();
                }
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                imgElement.src = evt.target.result;
                cropModal.classList.remove('hidden');
                if (cropper) cropper.destroy();
                
                // CALCULAR EL ASPECT RATIO DE TU VENTANA ACTUAL
                const currentRatio = window.innerWidth / window.innerHeight;
                
                cropper = new Cropper(imgElement, {
                    aspectRatio: currentRatio, // <--- ESTO ES LA MAGIA
                    viewMode: 1,
                    autoCropArea: 1,
                    dragMode: 'move',
                    background: false
                });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            cropModal.classList.add('hidden');
            settingsModal.classList.remove('hidden');
            if (cropper) cropper.destroy();
            cropper = null;
        });
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            if (!cropper) return;
            // Usamos el tamaño del viewport del usuario para mayor precisión
            cropper.getCroppedCanvas({ 
                width: window.innerWidth, // Ancho de tu pantalla
                imageSmoothingEnabled: true, 
                imageSmoothingQuality: 'high' 
            })
                .toBlob(async (blob) => {
                    await saveImage(blob);
                    applyBackground();
                    cropModal.classList.add('hidden');
                    cropper.destroy();
                    cropper = null;
                }, 'image/png');
        });
    }
});