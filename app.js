// app.js FINAL LENGKAP
const sheetURL = 'https://script.google.com/macros/s/AKfycbzuYVu7HgkCiiEpQajhGxqjSrMSDbUnFkCP05QGPRYp558pYXVU4TMUJ9pDSfCf_9BX/exec';
let menus = [];
let cart = [];
let sales = JSON.parse(localStorage.getItem('sales') || '[]');
let tempTrans = JSON.parse(localStorage.getItem('tempTrans') || '[]');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('opacity-0');
    setTimeout(() => p.classList.add('hidden'), 300);
  });
  const target = document.getElementById(id + 'Page');
  target.classList.remove('hidden');
  setTimeout(() => target.classList.remove('opacity-0'), 10);
  if (id === 'menu') renderMenuTable();
  if (id === 'kasir') { renderMenuList(); renderTempTrans(); }
  if (id === 'rekap') renderRekap();
}

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
  localStorage.setItem('user', JSON.stringify(currentUser));
}

function renderMenuList() {
  const menuList = document.getElementById('menuList');
  menuList.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded shadow bg-white';
    div.innerHTML = `
      <img src="${menu.gambar}" class="w-full h-32 object-cover rounded mb-2">
      <h4 class="font-bold font-diary text-pink-700 text-lg">${menu.nama}</h4>
      <div class="flex gap-2 mt-2 justify-center">
        <button onclick="addToCart(${i}, 'hot')" class="bg-rose-300 hover:bg-rose-400 text-white px-3 py-2 rounded-full shadow text-lg">
          <i class="fas fa-mug-hot"></i>
        </button>
        <button onclick="addToCart(${i}, 'cold')" class="bg-sky-300 hover:bg-sky-400 text-white px-3 py-2 rounded-full shadow text-lg">
          <i class="fas fa-ice-cream"></i>
        </button>
      </div>`;
    menuList.appendChild(div);
  });
}

function addToCart(i, type) {
  const m = menus[i];
  const name = `${m.nama} (${type === 'cold' ? 'Es' : 'Panas'})`;
  const price = type === 'cold' ? parseInt(m.hargaes) : parseInt(m.hargapanas);
  const exist = cart.find(c => c.name === name);
  if (exist) exist.qty++;
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
      <li class="flex justify-between items-center border-b py-2">
        <span class="w-1/2">${item.name}</span>
        <div class="flex items-center gap-2">
          <button onclick="decreaseQty(${i})" class="px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300">-</button>
          <span>x${item.qty}</span>
          <button onclick="increaseQty(${i})" class="px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300">+</button>
        </div>
        <span>= Rp ${item.qty * item.price}</span>
        <button onclick="removeFromCart(${i})" class="text-red-500 ml-2">🗑</button>
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

function openCheckoutModal() {
  if (!cart.length) return alert("Keranjang kosong!");
  const modal = document.getElementById('checkoutModal');
  const list = document.getElementById('checkoutList');
  list.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    total += item.qty * item.price;
    list.innerHTML += `<li class="flex justify-between border-b py-1"><span>${item.name} x${item.qty}</span><span>Rp ${item.qty * item.price}</span></li>`;
  });
  document.getElementById('checkoutTotal').textContent = total;
  modal.classList.remove('hidden');
}

async function confirmCheckout() {
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID');
  const date = now.toLocaleDateString('id-ID');
  const trx = {
    date, time, user: currentUser?.email || 'anon',
    items: JSON.parse(JSON.stringify(cart))
  };
  sales.push(trx);
  tempTrans.unshift(trx);
  saveToLocal();
  const form = new FormData();
  form.append("action", "transaksi");
  form.append("data", JSON.stringify(trx));
  try {
    await fetch(sheetURL, { method: 'POST', body: form });
    alert("Berhasil disimpan!");
  } catch (e) {
    alert("Tersimpan lokal, gagal upload.");
  }
  cart = [];
  renderCart();
  renderTempTrans();
  closeCheckoutModal();
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

function renderTempTrans() {
  const list = document.getElementById('tempTransList');
  list.innerHTML = '';
  tempTrans.forEach((trx, i) => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-white';
    div.innerHTML = `
      <div><strong>${trx.time}</strong> - <em>${trx.user}</em></div>
      <ul class="text-sm">
        ${trx.items.map(item => `<li>${item.name} x${item.qty} = Rp ${item.qty * item.price}</li>`).join('')}
      </ul>
      <button onclick="printSingleStruk(${i})" class="text-sm bg-blue-500 px-2 py-1 text-white rounded mt-2">Cetak Struk</button>
    `;
    list.appendChild(div);
  });
}

function printSingleStruk(index) {
  const trx = tempTrans[index];
  const doc = new window.jspdf.jsPDF();
  doc.text("Struk Pembelian", 10, 10);
  doc.text(trx.time + ' - ' + trx.user, 10, 20);
  let y = 30;
  trx.items.forEach(item => {
    doc.text(`${item.name} x${item.qty} = Rp ${item.qty * item.price}`, 10, y);
    y += 10;
  });
  const total = trx.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  doc.text(`Total: Rp ${total}`, 10, y + 10);
  doc.save('struk.pdf');
}

function loginUser(email) {
  currentUser = { email };
  localStorage.setItem('user', JSON.stringify(currentUser));
  alert('Login sukses sebagai ' + email);
  showPage('kasir');
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('user');
  location.reload();
}

window.onload = () => {
  fetchMenus();
  showPage(currentUser ? 'kasir' : 'login');
};
