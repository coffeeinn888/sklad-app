let db = JSON.parse(localStorage.getItem('inventory')) || [];
const LOCATIONS = ["Комплект", ...Array.from({length: 15}, (_, i) => "Лиса-" + (i + 1))];

function saveDB() {
    localStorage.setItem('inventory', JSON.stringify(db));
    renderInventory();
}

// Обработка фото
function handlePhoto(input, isNew) {
    if (!input.files || !input.files[0]) return;
    
    document.getElementById('loading').style.display = 'block';
    const file = input.files[0];
    const html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.scanFile(file, true)
        .then(decodedText => {
            document.getElementById('loading').style.display = 'none';
            if (isNew) processNewEntry(decodedText);
            else processTransfer(decodedText);
            input.value = ""; 
        })
        .catch(err => {
            document.getElementById('loading').style.display = 'none';
            alert("QR-код не обнаружен. Сделайте фото ближе и четче.");
            input.value = "";
        });
}

function processNewEntry(data) {
    const p = data.split('|');
    if (p.length < 3) {
        alert("Ошибка! Формат QR: Название|Заводской|Инвентарный");
        return;
    }
    const inv = p[2].trim();
    if (db.find(i => i.inv === inv)) {
        alert("Инв. № " + inv + " уже в базе!");
        return;
    }
    db.push({ name: p[0].trim(), serial: p[1].trim(), inv: inv, loc: "Комплект" });
    saveDB();
    alert("Успешно добавлено: " + p[0]);
}

function processTransfer(qrData) {
    const idToFind = qrData.includes('|') ? qrData.split('|')[2].trim() : qrData.trim();
    const item = db.find(i => i.inv === idToFind);
    if (!item) {
        alert("Аппарат " + idToFind + " не найден в базе!");
        return;
    }
    showTransferUI(item);
}

function showTransferUI(item) {
    const container = document.getElementById("transfer-zone");
    let options = LOCATIONS.map(l => `<option value="${l}" ${item.loc === l ? 'selected' : ''}>${l}</option>`).join('');
    container.innerHTML = `
        <div class="card" style="border: 2px solid #28a745;">
            <h3>🔄 Передача: ${item.name}</h3>
            <p>Инв. №: ${item.inv} | Сейчас в: <b>${item.loc}</b></p>
            <select id="new-loc">${options}</select>
            <button class="btn btn-green" onclick="confirmMove('${item.inv}')">💾 СОХРАНИТЬ МЕСТО</button>
        </div>`;
    container.scrollIntoView({behavior: "smooth"});
}

function confirmMove(inv) {
    const item = db.find(i => i.inv === inv);
    item.loc = document.getElementById("new-loc").value;
    saveDB();
    document.getElementById("transfer-zone").innerHTML = "";
    alert("Обновлено: " + item.loc);
}

function exportToFile() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sklad_${new Date().toISOString().slice(0,10)}.json`;
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
    if (!list) return;
    list.innerHTML = "<h3>Инвентарный список:</h3>" + db.map(i => `
        <div class="item">
            <span class="loc-tag">${i.loc}</span>
            <b>${i.name}</b><br><small>Инв: ${i.inv} | Зав: ${i.serial}</small>
        </div>`).reverse().join('');
}
renderInventory();
