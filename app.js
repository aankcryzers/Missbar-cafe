const sheetURL = 'https://script.google.com/macros/s/AKfycbzuYVu7HgkCiiEpQajhGxqjSrMSDbUnFkCP05QGPRYp558pYXVU4TMUJ9pDSfCf_9BX/exec';
let menus = [];
let cart = [];
let sales = [];
let tempTrans = [];
let currentUser = null;

// --- Google Sign-In Callback (HARUS global) ---
function handleGoogleLogin(response) {
  const id_token = response.credential;
  const payload = JSON.parse(atob(id_token.split('.')[1]));
  localStorage.setItem('user', JSON.stringify({ username: payload.name, email: payload.email }));
  alert('Login Google sukses sebagai ' + payload.email);
  showPage('menu');
}

// --- Register User (HARUS global) ---
function registerUser() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!username || !password) {
    alert("Username dan password wajib diisi!");
    return;
  }
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  if (users.find(u => u.username === username)) {
    alert("Username sudah terdaftar!");
    return;
  }
  users.push({ username, password });
  localStorage.setItem('users', JSON.stringify(users));
  alert("Registrasi berhasil! Silakan login.");
  showPage('login');
}

// --- Login User (HARUS global) ---
function loginUser() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) {
    alert("Username dan password wajib diisi!");
    return;
  }
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    alert("Username atau password salah!");
    return;
  }
  localStorage.setItem('user', JSON.stringify({ username }));
  alert('Login sukses!');
  showPage('menu');
}

// --- Logout User ---
function logoutUser() {
  localStorage.removeItem('user');
  showPage('login');
}

// --- Helper: Safe Parse ---
function safeParse(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || fallback);
  } catch { return fallback === 'null' ? null : JSON.parse(fallback); }
}

// --- Load Saved Data ---
function loadSavedData() {
  sales = safeParse('sales', '[]');
  tempTrans = safeParse('tempTrans', '[]');
  currentUser = safeParse('user', 'null');
  // Tambah user admin jika belum ada
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  if (!users.find(u => u.username === 'admin')) {
    users.push({ username: 'admin', password: 'admin' });
    localStorage.setItem('users', JSON.stringify(users));
  }
}

// --- Save to Local ---
function saveToLocal() {
  localStorage.setItem('menus', JSON.stringify(menus));
  localStorage.setItem('sales', JSON.stringify(sales));
  localStorage.setItem('tempTrans', JSON.stringify(tempTrans));
  localStorage.setItem('user', JSON.stringify(currentUser));
}

// --- Fetch Menus (async) ---
async function fetchMenus() {
  try {
    const res = await fetch(sheetURL);
    menus = await res.json();
    saveToLocal();
    renderMenuList();
    renderMenuTable();
  } catch (err) {
    alert("Gagal mengambil menu dari spreadsheet");
    menus = safeParse('menus', '[]');
    renderMenuList();
    renderMenuTable();
  }
}

// --- MENU PAGE: Daftar Menu untuk dilihat (tanpa tombol tambah ke keranjang) ---
function renderMenuList() {
  const menuList = document.getElementById('menuList');
  if (!menuList) return;
  menuList.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.innerHTML = `
      <img src="${menu.gambar || 'https://via.placeholder.com/120'}" alt="menu">
      <div class="fw-bold mb-1" style="color:#f59e42">${menu.nama || 'Tanpa Nama'}</div>
      <div class="text-sm mb-1">Panas: <b>Rp ${menu.hargapanas || '-'}</b></div>
      <div class="text-sm mb-1">Es: <b>Rp ${menu.hargaes || '-'}</b></div>
    `;
    menuList.appendChild(div);
  });
}

// --- KASIR PAGE: Menu untuk transaksi (ada tombol tambah ke keranjang) ---
function renderMenuTable() {
  const menuTable = document.getElementById('menuTable');
  if (!menuTable) return;
  menuTable.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'menu-table-item';
    div.innerHTML = `
      <img src="${menu.gambar || 'https://via.placeholder.com/120'}" alt="menu">
      <div class="fw-bold mb-1" style="color:#f87171">${menu.nama || 'Tanpa Nama'}</div>
      <div class="mb-1">
        <button onclick="addToCart(${i}, 'hot')" class="btn" style="background:#f87171;">Panas<br>Rp ${menu.hargapanas || '-'}</button>
        <button onclick="addToCart(${i}, 'cold')" class="btn" style="background:#2563eb;">Es<br>Rp ${menu.hargaes || '-'}</button>
      </div>
    `;
    menuTable.appendChild(div);
  });
}

// --- Cart Logic ---
function addToCart(i, type) {
  const m = menus[i];
  if (!m) return;
  const name = `${m.nama} (${type === 'cold' ? 'Es' : 'Panas'})`;
  const price = type === 'cold' ? parseInt(m.hargaes) : parseInt(m.hargapanas);
  if (isNaN(price)) return alert('Harga tidak valid.');
  const exist = cart.find(c => c.name === name);
  if (exist) exist.qty++;
  else cart.push({ name, price, qty: 1 });
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  if (!list) return;
  list.innerHTML = '';
  let total = 0;
  cart.forEach((item, i) => {
    total += item.price * item.qty;
    list.innerHTML += `
      <li>
        <span>${item.name}</span>
        <span>
          <button onclick="decreaseQty(${i})" class="btn" style="background:#eee;color:#444;padding:.1rem .7rem">-</button>
          x${item.qty}
          <button onclick="increaseQty(${i})" class="btn" style="background:#eee;color:#444;padding:.1rem .7rem">+</button>
        </span>
        <span>Rp ${item.price * item.qty}</span>
        <button onclick="removeFromCart(${i})" class="btn" style="background:#f87171;padding:.1rem .7rem">🗑</button>
      </li>`;
  });
  const totalEl = document.getElementById('cartTotal');
  if (totalEl) totalEl.textContent = total;
}

function removeFromCart(i) {
  cart.splice(i, 1);
  renderCart();
}

function increaseQty(i) {
  if (cart[i]) cart[i].qty++;
  renderCart();
}

function decreaseQty(i) {
  if (cart[i]) {
    if (cart[i].qty > 1) cart[i].qty--;
    else cart.splice(i, 1);
  }
  renderCart();
}

// --- REKAP PAGE: Chart & Top 10 ---
function renderRekap() {
  const start = document.getElementById('rekapStart')?.value;
  const end = document.getElementById('rekapEnd')?.value;
  let data = sales;
  if (start && end) {
    // Format tanggal Indonesia: DD/MM/YYYY, ubah ke YYYY-MM-DD
    function toISO(d) {
      if (!d) return '';
      if (d.includes('-')) return d; // sudah ISO
      const [day, month, year] = d.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    data = data.filter(trx => {
      const tgl = toISO(trx.date);
      return (!start || tgl >= start) && (!end || tgl <= end);
    });
  }
  // Hitung penjualan per item
  const penjualan = {};
  data.forEach(trx => trx.items.forEach(item => {
    penjualan[item.name] = (penjualan[item.name] || 0) + item.qty;
  }));
  // Top 10
  const top10 = Object.entries(penjualan)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,10);
  // Tampilkan list
  const topList = document.getElementById('top10List');
  if(topList) topList.innerHTML = top10.map(([name,jml]) =>
    `<li>${name} <b>x${jml}</b> (${((jml/Object.values(penjualan).reduce((a,b)=>a+b,0)||0)*100).toFixed(1)}%)</li>`
  ).join('') || '<li>Tidak ada transaksi</li>';
  // Chart
  const ctx = document.getElementById('rekapChart')?.getContext('2d');
  if(ctx){
    if(window.rekapChartObj) window.rekapChartObj.destroy();
    window.rekapChartObj = new Chart(ctx, {
      type:'bar',
      data: {
        labels: top10.map(([name])=>name),
        datasets: [{ label:'Penjualan', data: top10.map(([_,jml])=>jml), backgroundColor:'#fbbf24' }]
      }
    });
  }
}

// --- Checkout Modal ---
function openCheckoutModal() {
  if (!cart.length) return alert("Keranjang kosong!");
  const modal = document.getElementById('checkoutModal');
  const list = document.getElementById('checkoutList');
  if (!modal || !list) return;
  list.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    total += item.qty * item.price;
    list.innerHTML += `<li class="flex justify-between border-b py-1"><span>${item.name} x${item.qty}</span><span>Rp ${item.qty * item.price}</span></li>`;
  });
  const totalEl = document.getElementById('checkoutTotal');
  if (totalEl) totalEl.textContent = total;
  modal.style.display = 'flex';
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.style.display = 'none';
}

// --- Konfirmasi Checkout ---
async function confirmCheckout() {
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID');
  const date = now.toLocaleDateString('id-ID');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const trx = {
    date, time, user: user?.username || 'anon',
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

// --- Transaksi Sementara (Struk) ---
function renderTempTrans() {
  const list = document.getElementById('tempTransList');
  if (!list) return;
  list.innerHTML = '';
  tempTrans.forEach((trx, i) => {
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-white mb-2';
    div.innerHTML = `
      <div><strong>${trx.time}</strong> - <em>${trx.user}</em></div>
      <ul class="text-sm">
        ${trx.items.map(item => `<li>${item.name} x${item.qty} = Rp ${item.qty * item.price}</li>`).join('')}
      </ul>
      <button onclick="printSingleStruk(${i})" class="text-sm btn mt-2" style="background:#2563eb;">Cetak Struk</button>
    `;
    list.appendChild(div);
  });
}

// --- Cetak Struk ---
function printSingleStruk(index) {
  const trx = tempTrans[index];
  if (!trx) return;
  if (!window.jspdf) {
    alert("jsPDF belum dimuat!");
    return;
  }
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

// --- ONLOAD: Init App ---
window.onload = () => {
  loadSavedData();
  fetchMenus();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  showPage(user ? 'menu' : 'login');
  // Render nav highlight & isi awal
  if(user) {
    renderMenuList();
    renderMenuTable();
    renderCart();
    renderTempTrans();
    renderRekap();
  }
};
