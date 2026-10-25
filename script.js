const STORAGE_KEY = "rc-sop-data-v1";

const searchInput = document.getElementById("searchInput");
const addSopBtn = document.getElementById("addSopBtn");
const emptyAddBtn = document.getElementById("emptyAddBtn");
const sopList = document.getElementById("sopList");
const sopCount = document.getElementById("sopCount");
const emptyState = document.getElementById("emptyState");

const editor = document.getElementById("editor");
const editorHeading = document.getElementById("editorHeading");
const sopForm = document.getElementById("sopForm");
const sopTitle = document.getElementById("sopTitle");
const sopCategory = document.getElementById("sopCategory");
const sopContent = document.getElementById("sopContent");
const saveStatus = document.getElementById("saveStatus");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let sops = loadSops();
let editingId = null;
let saveTimer = null;

function loadSops() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const data = saved ? JSON.parse(saved) : [];

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Gagal membaca data SOP:", error);
        return [];
    }
}

function saveSops() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sops));
        saveStatus.textContent = "✓ Semua perubahan tersimpan";
        return true;
    } catch (error) {
        console.error("Gagal menyimpan SOP:", error);
        saveStatus.textContent = "Gagal menyimpan. Periksa penyimpanan browser.";
        return false;
    }
}

function createId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function renderSops() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = sops.filter((sop) => {
        const searchable = [
            sop.title,
            sop.category,
            sop.content
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    });

    sopList.replaceChildren();
    sopCount.textContent = `${filtered.length} SOP`;

    emptyState.hidden = filtered.length !== 0;
    sopList.hidden = filtered.length === 0;

    if (filtered.length === 0) {
        const heading = emptyState.querySelector("h3");
        const paragraph = emptyState.querySelector("p");

        if (sops.length === 0) {
            heading.textContent = "Belum ada SOP";
            paragraph.textContent =
                "Tambahkan SOP pertama untuk mulai membangun library kamu.";
        } else {
            heading.textContent = "SOP tidak ditemukan";
            paragraph.textContent =
                "Coba gunakan kata kunci pencarian yang berbeda.";
        }

        return;
    }

    filtered.forEach((sop) => {
        const card = createElement("article", "sop-card");
        const category = createElement(
            "span",
            "category-tag",
            sop.category
        );

        const title = createElement("h3", "", sop.title);

        const previewText = sop.content.replace(/\s+/g, " ").trim();
        const preview = createElement(
            "p",
            "",
            previewText.length > 150
                ? previewText.slice(0, 150) + "…"
                : previewText
        );

        const actions = createElement("div", "card-actions");

        const readBtn = createElement("button", "", "Baca SOP");
        readBtn.type = "button";
        readBtn.addEventListener("click", () => readSop(sop.id));

        const editBtn = createElement("button", "", "Edit");
        editBtn.type = "button";
        editBtn.addEventListener("click", () => editSop(sop.id));

        const deleteBtn = createElement("button", "", "Hapus");
        deleteBtn.type = "button";
        deleteBtn.addEventListener("click", () => deleteSop(sop.id));

        actions.append(readBtn, editBtn, deleteBtn);
        card.append(category, title, preview, actions);
        sopList.appendChild(card);
    });
}

function openEditor() {
    editor.hidden = false;
    editor.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function addSop() {
    clearTimeout(saveTimer);
    editingId = null;
    sopForm.reset();

    editorHeading.textContent = "Tambah SOP";
    saveStatus.textContent = "Isi detail SOP, lalu tekan Simpan SOP.";

    openEditor();
    sopTitle.focus();
}

function editSop(id) {
    const sop = sops.find((item) => item.id === id);
    if (!sop) return;

    clearTimeout(saveTimer);
    editingId = id;

    sopTitle.value = sop.title;
    sopCategory.value = sop.category;
    sopContent.value = sop.content;

    editorHeading.textContent = "Edit SOP";
    saveStatus.textContent = "Perubahan akan disimpan otomatis.";

    openEditor();
    sopTitle.focus();
}

function readSop(id) {
    const sop = sops.find((item) => item.id === id);
    if (!sop) return;

    clearTimeout(saveTimer);
    editingId = id;

    sopTitle.value = sop.title;
    sopCategory.value = sop.category;
    sopContent.value = sop.content;

    editorHeading.textContent = "Baca SOP";
    saveStatus.textContent =
        "Kamu bisa membaca isi lengkap atau mengubahnya di sini.";

    openEditor();
    sopContent.focus();
}

function handleSubmit(event) {
    event.preventDefault();
    clearTimeout(saveTimer);

    const title = sopTitle.value.trim();
    const category = sopCategory.value;
    const content = sopContent.value.trim();

    if (!title || !category || !content) {
        saveStatus.textContent =
            "Lengkapi judul, kategori, dan isi SOP terlebih dahulu.";
        return;
    }

    if (editingId !== null) {
        const index = sops.findIndex((item) => item.id === editingId);

        if (index !== -1) {
            sops[index] = {
                ...sops[index],
                title,
                category,
                content,
                updatedAt: new Date().toISOString()
            };
        } else {
            sops.unshift({
                id: createId(),
                title,
                category,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
    } else {
        sops.unshift({
            id: createId(),
            title,
            category,
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    if (!saveSops()) return;

    renderSops();
    closeEditor();
}

function scheduleAutosave() {
    if (editingId === null) return;

    saveStatus.textContent = "Menyimpan perubahan…";
    clearTimeout(saveTimer);

    saveTimer = setTimeout(() => {
        const index = sops.findIndex((item) => item.id === editingId);
        if (index === -1) return;

        sops[index] = {
            ...sops[index],
            title: sopTitle.value.trim(),
            category: sopCategory.value,
            content: sopContent.value,
            updatedAt: new Date().toISOString()
        };

        if (saveSops()) renderSops();
    }, 700);
}

function closeEditor() {
    clearTimeout(saveTimer);
    editor.hidden = true;
    sopForm.reset();
    editingId = null;
    saveStatus.textContent = "Semua perubahan tersimpan";
}

function deleteSop(id) {
    const sop = sops.find((item) => item.id === id);
    if (!sop) return;

    const confirmed = window.confirm(
        `Yakin ingin menghapus SOP "${sop.title}"?`
    );

    if (!confirmed) return;

    clearTimeout(saveTimer);
    sops = sops.filter((item) => item.id !== id);

    if (!saveSops()) return;

    if (editingId === id) closeEditor();

    renderSops();
}

addSopBtn.addEventListener("click", addSop);
emptyAddBtn.addEventListener("click", addSop);
cancelEditBtn.addEventListener("click", closeEditor);
sopForm.addEventListener("submit", handleSubmit);
searchInput.addEventListener("input", renderSops);

[sopTitle, sopCategory, sopContent].forEach((input) => {
    input.addEventListener("input", scheduleAutosave);
    input.addEventListener("change", scheduleAutosave);
});

renderSops();
closeEditor();


// Daftarkan service worker untuk mendukung penggunaan offline.
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js")
            .then(() => {
                console.log("RC SOP: Service worker aktif.");
            })
            .catch((error) => {
                console.error("Service worker gagal:", error);
            });
    });
}