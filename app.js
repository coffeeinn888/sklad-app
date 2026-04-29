let db = JSON.parse(localStorage.getItem('inventory')) || [];
const LOCATIONS = ["Комплект", ...Array.from({length: 15}, (_, i) => "Лиса-" + (i + 1))];
let html5QrCode = null;

// Инициализация при загрузке
window.addEventListener('load', () => {
    renderInventory();
    document.getElementById('btnNew').addEventListener('click', () => scan(true));
    document.getElementById('btnTransfer').addEventListener('click', () => scan(false));
    console.log("Система готова");
});

function saveDB() {
    localStorage.setItem('inventory', JSON.stringify(db));
    renderInventory();
}

async function scan(isNew) {
    const readerDiv = document.getElementById("reader");
    
    if (typeof Html5Qrcode === 'undefined') {
        alert("Ошибка: Библиотека сканера не загружена! Проверьте интернет.");
        return;
    }

    readerDiv.style.display = "block";
    if (html5QrCode) {
        try { await html5QrCode.stop(); } catch(e) {}
    }

    html5QrCode = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: 250, aspectRatio: 1.0 };

    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        (text) => {
            html5QrCode.stop().then(() => {
                readerDiv.style.display = "none";
                if (isNew) processNewEntry(text);
                else processTransfer(text);
            });
        }
    ).catch(err => {
        alert("Камера не запустилась. Убедитесь, что сайт открыт через HTTPS и доступ разрешен в настройках.");
        readerDiv.style.display = "none";
    });
}

function processNewEntry(data) {
    const p = data.split('|');
    if (p.length < 3) {
        alert("Ошибка QR! Нужен формат: Название|Заводской|Инвентарный");
        return;
    }
    const inv = p[2].trim();
    if (db.find(i => i.inv === inv)) {
        alert("Инв. № " + inv + " уже в базе!");
        return;
    }
    db.push({ name: p[0].trim(), serial: p[1].trim(), inv: inv, loc: "Комплект" });
    saveDB();
    alert("Добавлено: " + p[0]);
}

function processTransfer(qrData) {
    const idToFind = qrData.includes('|') ? qrData.split('|')[2].trim() : qrData.trim();
    const item = db.find(i => i.inv === idToFind);
    if (!item) {
        alert("Оборудование не найдено!");
        return;
    }
    showTransferUI(item);
}

function showTransferUI(item) {
    const container = document.getElementById("transfer-zone");
    let options = LOCATIONS.map(l => `<option value="${l}" ${item.loc === l ? 'selected' : ''}>${l}</option>`).join('');
    container.innerHTML = `
        <div class="card" style="border: 2px solid #28a745;">
            <h3>${item.name}</h3>
            <p>Текущее место: <b>${item.loc}</b></p>
            <select id="new-loc">${options}</select>
            <button class="btn btn-green" onclick="confirmMove('${item.inv}')">💾 СОХРАНИТЬ</button>
        </div>`;
    container.scrollIntoView();
}

function confirmMove(inv) {
    const item = db.find(i => i.inv === inv);
    item.loc = document.getElementById("new-loc").value;
    saveDB();
    document.getElementById("transfer-zone").innerHTML = "";
    alert("Перемещено в " + item.loc);
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
            <b>${i.name}</b><br>
            <small>Инв: ${i.inv} | Зав: ${i.serial}</small>
        </div>`).join('');
}
