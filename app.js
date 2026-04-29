let db = JSON.parse(localStorage.getItem('inventory')) || [];
const LOCATIONS = ["Комплект", ...Array.from({length: 15}, (_, i) => `Лиса-${i + 1}`)];

function saveDB() {
    localStorage.setItem('inventory', JSON.stringify(db));
    renderInventory();
}

function startCamera(onSuccess) {
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 },
        (text) => {
            html5QrCode.stop();
            onSuccess(text);
        }
    ).catch(err => alert("Ошибка камеры: " + err));
}

// 1. Внесение нового через QR (Формат: Название|Заводской|Инвентарный)
function scanNewEntry() {
    startCamera((data) => {
        const p = data.split('|');
        if (p.length < 3) {
            alert("Ошибка! Формат QR должен быть: Название|Заводской|Инвентарный");
            return;
        }
        const newObj = {
            id: p[2].trim(), // Инвентарный номер как ID
            name: p[0].trim(),
            serial: p[1].trim(),
            inv: p[2].trim(),
            loc: "Комплект"
        };
        if (db.find(i => i.id === newObj.id)) {
            alert("Объект с ИНВ № " + newObj.id + " уже есть в базе!");
        } else {
            db.push(newObj);
            saveDB();
            alert("ДОБАВЛЕНО: " + newObj.name);
        }
    });
}

// 2. Перемещение
function scanForTransfer() {
    startCamera((qrId) => {
        const idToFind = qrId.includes('|') ? qrId.split('|')[2].trim() : qrId.trim();
        const item = db.find(i => i.id === idToFind);
        if (!item) {
            alert("Оборудование не найдено в базе!");
            return;
        }
        showTransferUI(item);
    });
}

function showTransferUI(item) {
    const container = document.getElementById("transfer-zone");
    let options = LOCATIONS.map(l => `<option value="${l}" ${item.loc === l ? 'selected' : ''}>${l}</option>`).join('');
    container.innerHTML = `
        <div class="card" style="border: 2px solid #28a745;">
            <h3>📍 Смена места</h3>
            <p><b>${item.name}</b> (Инв: ${item.inv})</p>
            <select id="new-loc">${options}</select>
            <button class="btn btn-green" onclick="confirmMove('${item.id}')">💾 СОХРАНИТЬ</button>
        </div>`;
}

function confirmMove(id) {
    const item = db.find(i => i.id === id);
    item.loc = document.getElementById("new-loc").value;
    saveDB();
    document.getElementById("transfer-zone").innerHTML = "";
    alert("Перемещено в " + item.loc);
}

// 3. Импорт/Экспорт
function exportToFile() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `base_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importFromFile(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            db = JSON.parse(e.target.result);
            saveDB();
            alert("База загружена!");
        } catch (err) { alert("Ошибка файла!"); }
    };
    reader.readAsText(event.target.files[0]);
}

function renderInventory() {
    const list = document.getElementById("inventory-list");
    list.innerHTML = "<h3>Инвентарный список:</h3>" + db.map(i => `
        <div class="item">
            <span class="loc-tag">${i.loc}</span>
            <b>${i.name}</b><br>
            <small>Инв: ${i.inv} | Зав: ${i.serial}</small>
        </div>`).join('');
}
renderInventory();
