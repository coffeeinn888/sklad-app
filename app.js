// 1. Инициализация базы
let db = JSON.parse(localStorage.getItem('inventory')) || [];
const LOCATIONS = ["Комплект", ...Array.from({length: 15}, (_, i) => `Лиса-${i + 1}`)];

function saveDB() {
    localStorage.setItem('inventory', JSON.stringify(db));
    renderInventory();
}

// 2. Глобальная переменная для сканера
let html5QrCode = null;

// ФУНКЦИЯ ЗАПУСКА КАМЕРЫ
async function startCamera(onSuccess) {
    // Проверка: загрузилась ли библиотека?
    if (typeof Html5Qrcode === 'undefined') {
        alert("Ошибка: Библиотека сканера еще не загружена. Проверьте интернет или обновите страницу.");
        return;
    }

    const readerDiv = document.getElementById("reader");
    readerDiv.style.display = "block"; // Показываем окно камеры

    if (html5QrCode) {
        await html5QrCode.stop().catch(() => {}); // Остановить старый сеанс если был
    }

    html5QrCode = new Html5Qrcode("reader");

    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }
    };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (text) => {
            html5QrCode.stop().then(() => {
                readerDiv.style.display = "none";
                onSuccess(text);
            });
        }
    ).catch(err => {
        alert("Камера не запустилась. Проверьте: \n1. HTTPS в адресе \n2. Разрешение в настройках Safari");
        console.error(err);
    });
}

// ЛОГИКА ВНЕСЕНИЯ (ПЕРВИЧНОГО)
function scanNewEntry() {
    startCamera((data) => {
        const p = data.split('|');
        if (p.length < 3) {
            alert("Ошибка QR! Нужен формат: Название|Заводской|Инвентарный");
            return;
        }
        const newObj = {
            id: p[2].trim(), 
            name: p[0].trim(),
            serial: p[1].trim(),
            inv: p[2].trim(),
            loc: "Комплект"
        };
        if (db.find(i => i.id === newObj.id)) {
            alert("Объект с ИНВ № " + newObj.id + " уже есть!");
        } else {
            db.push(newObj);
            saveDB();
            alert("УСПЕХ: " + newObj.name + " на складе.");
        }
    });
}

// ЛОГИКА ПЕРЕМЕЩЕНИЯ
function scanForTransfer() {
    startCamera((qrId) => {
        const idToFind = qrId.includes('|') ? qrId.split('|')[2].trim() : qrId.trim();
        const item = db.find(i => i.id === idToFind);
        if (!item) {
            alert("Оборудование " + idToFind + " не найдено в базе!");
            return;
        }
        showTransferUI(item);
    });
}

function showTransferUI(item) {
    const container = document.getElementById("transfer-zone");
    let options = LOCATIONS.map(l => `<option value="${l}" ${item.loc === l ? 'selected' : ''}>${l}</option>`).join('');
    container.innerHTML = `
        <div class="card" style="border: 2px solid #28a745; padding: 15px;">
            <h3>📍 Смена места</h3>
            <p><b>${item.name}</b></p>
            <select id="new-loc">${options}</select>
            <button class="btn btn-green" onclick="confirmMove('${item.id}')">💾 СОХРАНИТЬ</button>
        </div>`;
}

function confirmMove(id) {
    const item = db.find(i => i.id === id);
    const newLoc = document.getElementById("new-loc").value;
    item.loc = newLoc;
    saveDB();
    document.getElementById("transfer-zone").innerHTML = "";
    alert("Перемещено в " + newLoc);
}

// ИМПОРТ / ЭКСПОРТ
function exportToFile() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `base.json`; a.click();
}

function importFromFile(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            db = JSON.parse(e.target.result);
            saveDB();
            alert("База обновлена!");
        } catch (err) { alert("Ошибка файла!"); }
    };
    reader.readAsText(event.target.files[0]);
}

function renderInventory() {
    const list = document.getElementById("inventory-list");
    if (!list) return;
    list.innerHTML = "<h3>Инвентарный список:</h3>" + db.map(i => `
        <div class="item">
            <span class="loc-tag">${i.loc}</span>
            <b>${i.name}</b><br>
            <small>Инв: ${i.inv} | Зав: ${i.serial}</small>
        </div>`).join('');
}
renderInventory();
