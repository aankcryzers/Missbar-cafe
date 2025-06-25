// app.js

let menus = JSON.parse(localStorage.getItem('menus') || '[]');
let cart = [];
let sales = JSON.parse(localStorage.getItem('sales') || '[]');
let tempTrans = JSON.parse(localStorage.getItem('tempTrans') || '[]');

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(id + 'Page').classList.remove('hidden');
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
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
      <img src="${menu.img}" class="w-full h-32 object-cover rounded mb-2">
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
      ${item.name} <button onclick="decreaseQty(${i})">-</button>
      x${item.qty} <button onclick="increaseQty(${i})">+</button>
      = Rp ${item.qty * item.price}
      <button onclick="removeFromCart(${i})" class="text-red-500">Hapus</button>`;
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
  if (cart[index].qty > 1) cart[index].qty -= 1;
  else cart.splice(index, 1);
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
  fetch(scriptURL, { method: 'POST', body: form });

  alert('Transaksi berhasil!');
  cart = [];
  renderCart();
  renderTempTrans();
}

function renderTempTrans() {
  const container = document.getElementById('tempTransList');
  container.innerHTML = '';
  tempTrans.forEach(trx => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-white';
    div.innerHTML = `
      <div><strong>${trx.time}</strong></div>
      <ul>${trx.items.map(item => `<li>${item.name} x${item.qty} = Rp ${item.qty * item.price}</li>`).join('')}</ul>
    `;
    container.appendChild(div);
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

showPage('kasir');
