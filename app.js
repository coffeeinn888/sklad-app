let db = JSON.parse(localStorage.getItem('inventory')) || [];
const LOCATIONS = ["Комплект", ...Array.from({length: 15}, (_, i) => "Лиса-" + (i + 1))];
let html5QrCode = null;

// Инициализация при загрузке страницы
window.addEventListener('load', () => {
    renderInventory();
    document.getElementById('btnNew').onclick = () => scan(true);
    document.getElementById('btnTransfer').onclick = () => scan(false);
    console.log("Система полностью готова");
});

function saveDB() {
    localStorage.setItem('inventory', JSON.stringify(db));
    renderInventory();
}

// ОСНОВНАЯ ФУНКЦИЯ СКАНИРОВАНИЯ
async function scan(isNew) {
    const readerDiv = document.getElementById("reader");
    
    if (typeof Html5Qrcode === 'undefined') {
        alert("Критическая ошибка: Библиотека сканера не загружена.");
        return;
    }

    readerDiv.style.display = "block";

    // 1. Останавливаем старый сканер, если он был активен
    if (html5QrCode && html5QrCode.isScanning) {
        try { await html5QrCode.stop(); } catch(e) { console.log("Стоп не нужен"); }
    }

    html5QrCode = new Html5Qrcode("reader");

    // 2. Получаем список всех доступных камер
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
            // Берем последнюю камеру (на iPhone и Android это обычно основная задняя)
            const cameraId = cameras[cameras.length - 1].id;
            
            html5QrCode.start(
                cameraId, 
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (text) => {
                    // Успешный скан
                    html5QrCode.stop().then(() => {
                        readerDiv.style.display = "none";
                        if (isNew) processNewEntry(text);
                        else processTransfer(text);
                    });
                },
                (errorMessage) => {
                    // Ошибки поиска кода в кадре (игнорируем, чтобы не спамить)
                }
            ).catch(err => {
                alert("Ошибка старта камеры: " + err);
                readerDiv.style.display = "none";
            });
        } else {
            alert("Камеры не найдены. Проверьте разрешения в настройках Safari/Chrome.");
            readerDiv.style.display = "none";
        }
    }).catch(err => {
        alert("Ошибка доступа к списку камер: " + err);
        readerDiv.style.display = "none";
    });
}

// ЛОГИКА: ВНЕСЕНИЕ НОВОГО (Название|Заводской|Инвентарный)
function processNewEntry(data) {
    const p = data.split('|');
    if (p.length < 3) {
        alert("Ошибка QR! Формат должен быть: Название|Заводской|Инвентарный");
        return;
    }
    const inv = p[2].trim();
    if (db.find(i => i.inv === inv)) {
        alert("Инв. № " + inv + " уже зарегистрирован в системе!");
        return;
    }
    db.push({ 
        name: p[0].trim(), 
        serial: p[1].trim(), 
        inv: inv, 
        loc: "Комплект" 
    });
    saveDB();
    alert("УСПЕХ!\nДобавлено: " + p[0] + "\nМесто: Комплект");
}

// ЛОГИКА: ПЕРЕМЕЩЕНИЕ
function processTransfer(qrData) {
    // Если считан полный QR, берем только инвентарник (3-й элемент), если нет — берем всё значение
    const idToFind = qrData.includes('|') ? qrData.split('|')[2].trim() : qrData.trim();
    const item = db.find(i => i.inv === idToFind);
    
    if (!item) {
        alert("Аппарат с номером " + idToFind + " не найден в базе!");
        return;
    }
    showTransferUI(item);
}

function showTransferUI(item) {
    const container = document.getElementById("transfer-zone");
    let options = LOCATIONS.map(l => `<option value="${l}" ${item.loc === l ? 'selected' : ''}>${l}</option>`).join('');
    
    container.innerHTML = `
        <div class="card" style="border: 2px solid #28a745; background: #f9fff9;">
            <h3 style="margin-top:0">🔄 Передача: ${item.name}</h3>
            <p>Зав. №: ${item.serial} | Инв: <b>${item.inv}</b></p>
            <label>Выберите новое место:</label>
            <select id="new-loc">${options}</select>
            <button class="btn btn-green" onclick="confirmMove('${item.inv}')">✅ СОХРАНИТЬ МЕСТО</button>
        </div>`;
    container.scrollIntoView({ behavior: 'smooth' });
}

function confirmMove(inv) {
    const item = db.find(i => i.inv === inv);
    if (item) {
        item.loc = document.getElementById("new-loc").value;
        saveDB();
        document.getElementById("transfer-zone").innerHTML = "";
        alert("Местоположение обновлено: " + item.loc);
    }
}

// ФУНКЦИИ ФАЙЛОВОГО ОБМЕНА
function exportToFile() {
    if (db.length === 0) { alert("База пуста, нечего сохранять."); return; }
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sklad_base_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                db = imported;
                saveDB();
                alert("База успешно загружена из файла!");
            }
        } catch (err) { alert("Ошибка: Неверный формат файла базы."); }
    };
    reader.readAsText(file);
}

// ОТРИСОВКА СПИСКА
function renderInventory() {
    const list = document.getElementById("inventory-list");
    if (!list) return;
    if (db.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:#999'>База оборудования пуста</p>";
        return;
    }
    list.innerHTML = "<h3>Инвентарный список:</h3>" + db.map(i => `
        <div class="item">
            <span class="loc-tag">${i.loc}</span>
            <b>${i.name}</b><br>
            <small>Инв: ${i.inv} | Зав: ${i.serial}</small>
        </div>`).reverse().join(''); // Новые сверху
}
