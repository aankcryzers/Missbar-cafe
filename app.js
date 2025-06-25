// app.js FINAL REVISI

const sheetURL = 'https://script.google.com/macros/s/AKfycbzbmrESTs5XcIcdQY0__3Ws-MFPdlw2zoNSUtnrc1u06GUzVnmETCidYHUeA9RQRA1d/exec';
let menus = [];
let cart = [];
let sales = JSON.parse(localStorage.getItem('sales') || '[]');
let tempTrans = JSON.parse(localStorage.getItem('tempTrans') || '[]');

async function fetchMenus() {
  try {
    const res = await fetch(sheetURL);
    menus = await res.json();
    saveToLocal();
    renderMenuList();
    renderMenuTable();
  } catch (err) {
    alert("Gagal mengambil menu dari spreadsheet");
    console.error(err);
  }
}

function saveToLocal() {
  localStorage.setItem('menus', JSON.stringify(menus));
  localStorage.setItem('sales', JSON.stringify(sales));
  localStorage.setItem('tempTrans', JSON.stringify(tempTrans));
}

function renderMenuList() {
  const menuList = document.getElementById('menuList');
  menuList.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded shadow bg-white';
    div.innerHTML = `
      <img src="${menu.gambar}" class="w-full h-32 object-cover rounded mb-2">
      <h4 class="font-bold font-butter text-amber-700 text-lg">${menu.nama}</h4>
      <div class="flex gap-1 mt-2">
        <button onclick="addToCart(${i}, 'hot')" class="bg-red-500 text-white px-2 py-1 rounded text-sm">Panas</button>
        <button onclick="addToCart(${i}, 'cold')" class="bg-blue-500 text-white px-2 py-1 rounded text-sm">Es</button>
      </div>`;
    menuList.appendChild(div);
  });
}

function renderMenuTable() {
  const menuTable = document.getElementById('menuTable');
  menuTable.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'border p-2 bg-white rounded shadow';
    div.innerHTML = `
      <img src="${menu.gambar}" class="w-full h-24 object-cover rounded mb-2">
      <h4 class="font-bold font-butter text-amber-700 text-lg">${menu.nama}</h4>
      <p>Panas: Rp ${menu.hargapanas}</p>
      <p>Es: Rp ${menu.hargaes}</p>`;
    menuTable.appendChild(div);
  });
}

function addToCart(i, type) {
  const m = menus[i];
  const name = `${m.nama} (${type === 'cold' ? 'Es' : 'Panas'})`;
  const price = type === 'cold' ? parseInt(m.hargaes) : parseInt(m.hargapanas);
  const exist = cart.find(c => c.name === name);
  if (exist) exist.qty += 1;
  else cart.push({ name, price, qty: 1 });
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  list.innerHTML = '';
  let total = 0;
  cart.forEach((item, i) => {
    total += item.price * item.qty;
    list.innerHTML += `
      <li>
        ${item.name} <button onclick="decreaseQty(${i})">-</button>
        x${item.qty} <button onclick="increaseQty(${i})">+</button>
        = Rp ${item.qty * item.price} <button onclick="removeFromCart(${i})">Hapus</button>
      </li>`;
  });
  document.getElementById('cartTotal').textContent = total;
}

function removeFromCart(i) {
  cart.splice(i, 1);
  renderCart();
}

function increaseQty(i) {
  cart[i].qty++;
  renderCart();
}

function decreaseQty(i) {
  if (cart[i].qty > 1) cart[i].qty--;
  else cart.splice(i, 1);
  renderCart();
}

async function checkout() {
  if (!cart.length) return alert('Keranjang kosong!');
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID');
  const date = now.toLocaleDateString('id-ID');

  const trx = { date, time, items: JSON.parse(JSON.stringify(cart)) };
  sales.push(trx);
  tempTrans.unshift(trx);
  saveToLocal();

  const form = new FormData();
  form.append("action", "transaksi");
  form.append("data", JSON.stringify(trx));

  try {
    await fetch(sheetURL, { method: 'POST', body: form });
    alert("Transaksi berhasil disimpan!");
  } catch (e) {
    alert("Transaksi lokal tersimpan, tetapi gagal mengirim ke spreadsheet.");
  }
  cart = [];
  renderCart();
  renderTempTrans();
}

function renderTempTrans() {
  const list = document.getElementById('tempTransList');
  list.innerHTML = '';
  tempTrans.forEach(trx => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-white';
    div.innerHTML = `
      <div><strong>${trx.time}</strong></div>
      <ul class="text-sm">
        ${trx.items.map(item => `<li>${item.name} x${item.qty} = Rp ${item.qty * item.price}</li>`).join('')}
      </ul>
      <button onclick="printSingleStruk(${tempTrans.indexOf(trx)})" class="text-sm bg-blue-500 px-2 py-1 text-white rounded mt-2">Cetak Struk</button>
    `;
    list.appendChild(div);
  });
}

function printSingleStruk(index) {
  const trx = tempTrans[index];
  const doc = new window.jspdf.jsPDF();
  doc.text("Struk Pembelian", 10, 10);
  doc.text(trx.time, 10, 20);
  let y = 30;
  trx.items.forEach(item => {
    doc.text(`${item.name} x${item.qty} = Rp ${item.qty * item.price}`, 10, y);
    y += 10;
  });
  const total = trx.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  doc.text(`Total: Rp ${total}`, 10, y + 10);
  doc.save('struk.pdf');
}

function clearTempTrans() {
  if (confirm('Hapus semua log transaksi sementara?')) {
    tempTrans = [];
    saveToLocal();
    renderTempTrans();
  }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id + 'Page').classList.remove('hidden');
  if (id === 'menu') renderMenuTable();
  if (id === 'kasir') { renderMenuList(); renderTempTrans(); }
  if (id === 'rekap') renderRekap();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function renderRekap() {
  const list = document.getElementById('rekapList');
  list.innerHTML = '';
  if (!sales.length) return list.innerHTML = '<p>Tidak ada transaksi.</p>';

  const grouped = {};
  sales.forEach(s => {
    if (!grouped[s.date]) grouped[s.date] = 0;
    grouped[s.date] += s.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  });

  const chartEl = document.getElementById('salesChart').getContext('2d');
  if (window.salesChartInstance) window.salesChartInstance.destroy();
  window.salesChartInstance = new Chart(chartEl, {
    type: 'bar',
    data: {
      labels: Object.keys(grouped),
      datasets: [{ label: 'Penjualan Harian', data: Object.values(grouped), backgroundColor: '#10b981' }]
    },
    options: { responsive: true }
  });

  const total = Object.values(grouped).reduce((a, b) => a + b, 0);
  document.getElementById('rekapSummary').textContent = `Total Penjualan: Rp ${total}`;
  Object.entries(grouped).forEach(([tgl, val]) => {
    const d = document.createElement('div');
    d.className = 'bg-white p-2 rounded shadow my-2';
    d.textContent = `${tgl}: Rp ${val}`;
    list.appendChild(d);
  });
}

window.onload = () => {
  fetchMenus();
  showPage('kasir');
};
