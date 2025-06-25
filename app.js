// app.js
let menus = JSON.parse(localStorage.getItem('menus') || '[]');
let cart = [];
let sales = JSON.parse(localStorage.getItem('sales') || '[]');
let tempTrans = JSON.parse(localStorage.getItem('tempTrans') || '[]');
let editingMenuIndex = null;

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
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
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
  if (id === 'menu') renderMenuTable();
  if (id === 'kasir') { renderMenuList(); renderTempTrans(); }
  if (id === 'rekap') renderRekap();
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
      <img src="${menu.img}" alt="" class="w-full h-32 object-cover rounded mb-2">
      <h4 class="font-bold">${menu.name}</h4>
      <div class="flex gap-1 mt-2">
        <button onclick="addToCart(${i}, 'hot')" class="bg-red-500 text-white px-2 py-1 rounded text-sm">Panas</button>
        <button onclick="addToCart(${i}, 'cold')" class="bg-blue-500 text-white px-2 py-1 rounded text-sm">Es</button>
      </div>
    `;
    menuList.appendChild(div);
  });
}

function addToCart(index, type) {
  const menu = menus[index];
  const price = type === 'cold' ? menu.priceCold : menu.priceHot;
  const name = `${menu.name} (${type === 'cold' ? 'Es' : 'Panas'})`;
  const existing = cart.find(i => i.name === name);
  if (existing) existing.qty += 1;
  else cart.push({ name, price, qty: 1 });
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  const totalEl = document.getElementById('cartTotal');
  list.innerHTML = '';
  let total = 0;
  cart.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${item.name}
      <button onclick="decreaseQty(${i})" class="ml-2 bg-gray-300 px-2 rounded">-</button>
      x${item.qty}
      <button onclick="increaseQty(${i})" class="ml-2 bg-gray-300 px-2 rounded">+</button>
      = Rp ${item.qty * item.price}
      <button onclick="removeFromCart(${i})" class="ml-2 text-red-600">Hapus</button>
    `;
    list.appendChild(li);
    total += item.qty * item.price;
  });
  totalEl.textContent = total;
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}
function increaseQty(index) {
  cart[index].qty += 1;
  renderCart();
}
function decreaseQty(index) {
  if (cart[index].qty > 1) {
    cart[index].qty -= 1;
  } else {
    cart.splice(index, 1);
  }
  renderCart();
}

function checkout() {
  if (cart.length === 0) return alert('Keranjang kosong!');
  const time = new Date();
  const date = time.toISOString().split('T')[0];
  const transaksi = { time: time.toLocaleString('id-ID'), date, items: JSON.parse(JSON.stringify(cart)) };
  sales.push(transaksi);
  tempTrans.unshift(transaksi);
  saveToLocal();

  const scriptURL = 'https://script.google.com/macros/s/AKfycbx31A-ImwsYRteQCtSCvBEscYPUL06JXZwzUdHbJLAqQKaop0z6V7c76mGu0QcS60Gg/exec';
  const form = new FormData();
  form.append("data", JSON.stringify(transaksi));

  fetch(scriptURL, { method: 'POST', body: form })
    .then(response => response.text())
    .then(result => {
      alert('Transaksi berhasil dan disimpan!');
      cart = [];
      renderCart();
      renderTempTrans();
    })
    .catch(error => {
      alert('Transaksi lokal sukses, tapi gagal simpan ke spreadsheet.');
      cart = [];
      renderCart();
      renderTempTrans();
    });
}

function printReceipt() {
  if (cart.length === 0) return alert('Keranjang kosong!');
  const doc = new window.jspdf.jsPDF();
  doc.text("Struk Pembelian - Kasir Kopi", 10, 10);
  let y = 20;
  cart.forEach(item => {
    doc.text(`${item.name} x${item.qty} = Rp ${item.qty * item.price}`, 10, y);
    y += 10;
  });
  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  doc.text(`Total: Rp ${total}`, 10, y + 10);
  doc.save('struk.pdf');
}

function renderTempTrans() {
  const container = document.getElementById('tempTransList');
  container.innerHTML = '';
  tempTrans.forEach((trx, i) => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-white';
    div.innerHTML = `
      <div><strong>${trx.time}</strong></div>
      <ul class="text-sm">
        ${trx.items.map(item => `<li>${item.name} x${item.qty} = Rp ${item.qty * item.price}</li>`).join('')}
      </ul>
    `;
    container.appendChild(div);
  });
}

function renderMenuTable() {
  const menuTable = document.getElementById('menuTable');
  menuTable.innerHTML = '';
  menus.forEach((menu, index) => {
    const div = document.createElement('div');
    div.className = 'border p-2 bg-white rounded shadow';
    div.innerHTML = `
      <img src="${menu.img}" alt="" class="w-full h-24 object-cover rounded mb-2">
      <h4 class="font-bold">${menu.name}</h4>
      <p>Panas: Rp ${menu.priceHot}</p>
      <p>Es: Rp ${menu.priceCold}</p>
      <div class="flex gap-2 mt-2">
        <button onclick="onEditMenu(${index})" class="bg-yellow-600 text-white px-2 py-1 rounded text-sm">Edit</button>
        <button onclick="onDeleteMenu(${index})" class="bg-red-600 text-white px-2 py-1 rounded text-sm">Hapus</button>
      </div>
    `;
    menuTable.appendChild(div);
  });
}

function onEditMenu(index) {
  const menu = menus[index];
  document.getElementById('menuName').value = menu.name;
  document.getElementById('menuPriceHot').value = menu.priceHot;
  document.getElementById('menuPriceCold').value = menu.priceCold;
  document.getElementById('editIndex').value = index;
  document.getElementById('submitBtn').textContent = 'Simpan Perubahan';
}

function onDeleteMenu(index) {
  if (confirm('Hapus menu ini?')) {
    menus.splice(index, 1);
    saveToLocal();
    renderMenuTable();
    renderMenuList();
  }
}

document.getElementById('menuForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('menuName').value.trim();
  const hot = parseInt(document.getElementById('menuPriceHot').value);
  const cold = parseInt(document.getElementById('menuPriceCold').value);
  const imgFile = document.getElementById('menuImage').files[0];
  const editIdx = document.getElementById('editIndex').value;

  if (!name) return alert('Nama menu tidak boleh kosong');
  if (isNaN(hot) || isNaN(cold)) return alert('Harga harus angka');

  function finishMenu(imgData) {
    if (editIdx !== "") {
      menus[editIdx] = {
        name,
        priceHot: hot,
        priceCold: cold,
        img: imgData || menus[editIdx].img
      };
    } else {
      if (!imgData) return alert('Pilih gambar');
      menus.push({ name, priceHot: hot, priceCold: cold, img: imgData });
    }
    saveToLocal();
    renderMenuTable();
    renderMenuList();
    document.getElementById('menuForm').reset();
    document.getElementById('editIndex').value = '';
    document.getElementById('submitBtn').textContent = 'Tambah Menu';
  }

  if (imgFile) {
    const reader = new FileReader();
    reader.onload = function () {
      finishMenu(reader.result);
    };
    reader.readAsDataURL(imgFile);
  } else {
    finishMenu(null);
  }
});

function renderRekap() {
  const rekapList = document.getElementById('rekapList');
  rekapList.innerHTML = '';
  if (!sales.length) {
    rekapList.innerHTML = '<p>Tidak ada data transaksi.</p>';
    document.getElementById('rekapSummary').textContent = '';
    if (window.salesChartInstance) window.salesChartInstance.destroy();
    return;
  }
  sales.forEach(trx => {
    const div = document.createElement('div');
    div.className = 'border p-2 mb-2 bg-white rounded'; 
    div.innerHTML = `
      <strong>${trx.time}</strong><br>
      <ul>${trx.items.map(i => `<li>${i.name} x${i.qty} = Rp ${i.qty * i.price}</li>`).join('')}</ul>
    `;
    rekapList.appendChild(div);
  });

  const salesPerDay = {};
  sales.forEach(trx => {
    salesPerDay[trx.date] = (salesPerDay[trx.date] || 0) + trx.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  });
  const labels = Object.keys(salesPerDay);
  const data = Object.values(salesPerDay);

  const ctx = document.getElementById('salesChart').getContext('2d');
  if (window.salesChartInstance) window.salesChartInstance.destroy();
  window.salesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Penjualan Harian',
        data,
        backgroundColor: '#38bdf8'
      }]
    },
    options: { responsive: true }
  });

  const total = data.reduce((a, b) => a + b, 0);
  document.getElementById('rekapSummary').textContent = 'Total Penjualan: Rp ' + total;
}

showPage('kasir');
