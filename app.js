let db = JSON.parse(localStorage.getItem('inventory')) || [];
const LOCATIONS = ["Комплект", ...Array.from({length: 15}, (_, i) => "Лиса-" + (i + 1))];

// Сохранение и обновление списка
function saveDB() {
    localStorage.setItem('inventory', JSON.stringify(db));
    renderInventory();
}

// ГЛАВНАЯ ФУНКЦИЯ: Обработка фото с предварительным сжатием
function handlePhoto(input, isNew) {
    if (!input.files || !input.files[0]) return;
    
    const loading = document.getElementById('loading');
    loading.style.display = 'block';
    
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // Создаем виртуальный холст для сжатия
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800; // Оптимальный размер для распознавания QR
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Превращаем в легкий файл и сканируем
            canvas.toBlob((blob) => {
                const html5QrCode = new Html5Qrcode("qr-reader");
                const processedFile = new File([blob], "scan.jpg", { type: "image/jpeg" });

                html5QrCode.scanFile(processedFile, true)
                    .then(decodedText => {
                        loading.style.display = 'none';
                        if (isNew) processNewEntry(decodedText);
                        else processTransfer(decodedText);
                        input.value = ""; // Сброс выбора
                    })
                    .catch(err => {
                        loading.style.display = 'none';
                        alert("QR-код не найден. Сделайте фото ближе, чтобы код был в центре и в фокусе.");
                        input.value = "";
                    });
            }, 'image/jpeg', 0.8);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Логика внесения нового оборудования
function processNewEntry(data) {
    const p = data.split('|');
    if (p.length < 3) {
        alert("Ошибка! QR должен быть в формате: Название|Заводской|Инвентарный");
        return;
    }
    const inv = p[2].trim();
    if (db.find(i => i.inv === inv)) {
        alert("Объект с ИНВ № " + inv + " уже есть в базе!");
        return;
    }
    db.push({ 
        name: p[0].trim(), 
        serial: p[1].trim(), 
        inv: inv, 
        loc: "Комплект" 
    });
    saveDB();
    alert("Успешно добавлено: " + p[0]);
}

// Логика перемещения
function processTransfer(qrData) {
    const idToFind = qrData.includes('|') ? qrData.split('|')[2].trim() : qrData.trim();
    const item = db.find(i => i.inv === idToFind);
    if (!item) {
        alert("Аппарат " + idToFind + " не найден в базе! Сначала внесите его.");
        return;
    }
    showTransferUI(item);
}

// Интерфейс смены местоположения
function showTransferUI(item) {
    const container = document.getElementById("transfer-zone");
    let options = LOCATIONS.map(l => `<option value="${l}" ${item.loc === l ? 'selected' : ''}>${l}</option>`).join('');
    container.innerHTML = `
        <div class="card" style="border: 2px solid #28a745;">
            <h3 style="margin-top:0">🔄 Перемещение</h3>
            <p><b>${item.name}</b> (Инв: ${item.inv})</p>
            <p>Сейчас в: <span style="color:red">${item.loc}</span></p>
            <label>Куда переместить:</label>
            <select id="new-loc">${options}</select>
            <button class="btn btn-green" onclick="confirmMove('${item.inv}')">💾 СОХРАНИТЬ</button>
        </div>`;
    container.scrollIntoView({behavior: "smooth"});
}

function confirmMove(inv) {
    const item = db.find(i => i.inv === inv);
    if (item) {
        item.loc = document.getElementById("new-loc").value;
        saveDB();
        document.getElementById("transfer-zone").innerHTML = "";
        alert("Данные обновлены. Текущее место: " + item.loc);
    }
}

// Функции обмена файлами
function exportToFile() {
    if (db.length === 0) return alert("База пуста");
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sklad_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                db = data;
                saveDB();
                alert("База успешно загружена!");
            }
        } catch (err) { alert("Ошибка: Неверный формат файла"); }
    };
    reader.readAsText(file);
}

// Отрисовка списка
function renderInventory() {
    const list = document.getElementById("inventory-list");
    if (!list) return;
    if (db.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:20px; color:#999'>База пуста. Отсканируйте новый QR для внесения.</p>";
        return;
    }
    list.innerHTML = "<h3>Инвентарный список:</h3>" + db.map(i => `
        <div class="item">
            <span class="loc-tag">${i.loc}</span>
            <b>${i.name}</b><br>
            <small>Зав: ${i.serial} | Инв: ${i.inv}</small>
        </div>`).reverse().join('');
}

// Запуск при старте
window.onload = renderInventory;
