const sheetURL = 'https://script.google.com/macros/s/AKfycbzuYVu7HgkCiiEpQajhGxqjSrMSDbUnFkCP05QGPRYp558pYXVU4TMUJ9pDSfCf_9BX/exec';
let menus = [];
let cart = [];
let sales = [];
let tempTrans = [];
let currentUser = null;

// ========== Google Sign-In Callback ==========
function handleGoogleLogin(response) {
  const id_token = response.credential;
  const payload = JSON.parse(atob(id_token.split('.')[1]));
  localStorage.setItem('user', JSON.stringify({ username: payload.name, email: payload.email }));
  alert('Login Google sukses sebagai ' + payload.email);
  showPage('menu');
}

// ========== Register User ==========
function registerUser() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!username || !password) return alert("Username dan password wajib diisi!");
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  if (users.find(u => u.username === username)) return alert("Username sudah terdaftar!");
  users.push({ username, password });
  localStorage.setItem('users', JSON.stringify(users));
  alert("Registrasi berhasil! Silakan login.");
  showPage('login');
}

// ========== Login User ==========
function loginUser() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) return alert("Username dan password wajib diisi!");
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return alert("Username atau password salah!");
  localStorage.setItem('user', JSON.stringify({ username }));
  alert('Login sukses!');
  showPage('menu');
}

// ========== Logout User ==========
function logoutUser() {
  localStorage.removeItem('user');
  showPage('login');
}

// ========== Helper: Safe Parse ==========
function safeParse(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || fallback);
  } catch { return fallback === 'null' ? null : JSON.parse(fallback); }
}

// ========== Load Saved Data ==========
function loadSavedData() {
  sales = safeParse('sales', '[]');
  tempTrans = safeParse('tempTrans', '[]');
  currentUser = safeParse('user', 'null');
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  if (!users.find(u => u.username === 'admin')) {
    users.push({ username: 'admin', password: 'admin' });
    localStorage.setItem('users', JSON.stringify(users));
  }
  menus = safeParse('menus', '[]');
}

// ========== Save to Local ==========
function saveToLocal() {
  localStorage.setItem('menus', JSON.stringify(menus));
  localStorage.setItem('sales', JSON.stringify(sales));
  localStorage.setItem('tempTrans', JSON.stringify(tempTrans));
  localStorage.setItem('user', JSON.stringify(currentUser));
}

// ========== Fetch Menus (async) ==========
async function fetchMenus() {
  try {
    const res = await fetch(sheetURL);
    menus = await res.json();
    saveToLocal();
    if (document.getElementById('menuPage').classList.contains('active')) renderMenuList();
    if (document.getElementById('kasirPage').classList.contains('active')) renderMenuTable();
  } catch (err) {
    menus = safeParse('menus', '[]');
    if (document.getElementById('menuPage').classList.contains('active')) renderMenuList();
    if (document.getElementById('kasirPage').classList.contains('active')) renderMenuTable();
  }
}

// ========== Menu Tambah/Edit/Hapus ==========
let editMenuIndex = null;
function openMenuModal(i){
  editMenuIndex = i ?? null;
  document.getElementById('menuModalTitle').innerText = (i==null) ? 'Tambah Menu' : 'Edit Menu';
  document.getElementById('menuNama').value = i!=null ? menus[i].nama : '';
  document.getElementById('menuHargaPanas').value = i!=null ? menus[i].hargapanas : '';
  document.getElementById('menuHargaEs').value = i!=null ? menus[i].hargaes : '';
  document.getElementById('menuGambar').value = i!=null ? menus[i].gambar : '';
  document.getElementById('menuModal').style.display='flex';
}
function closeMenuModal(){
  document.getElementById('menuModal').style.display='none';
}
function saveMenuEdit(){
  const nama = document.getElementById('menuNama').value.trim();
  const hargapanas = document.getElementById('menuHargaPanas').value;
  const hargaes = document.getElementById('menuHargaEs').value;
  const gambar = document.getElementById('menuGambar').value.trim();
  if(!nama) return alert("Nama wajib diisi!");
  const obj = { nama, hargapanas, hargaes, gambar };
  if(editMenuIndex==null) menus.push(obj);
  else menus[editMenuIndex] = obj;
  saveToLocal();
  closeMenuModal();
  renderMenuList();
  renderMenuTable();
  closeCartPopup(); // otomatis tutup popup jika sedang terbuka
}

// ========== MENU PAGE ==========
function renderMenuList() {
  const menuList = document.getElementById('menuList');
  if (!menuList) return;
  menuList.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.innerHTML = `
      <img src="${menu.gambar || 'https://via.placeholder.com/120'}" alt="menu">
      <div class="fw-bold mb-1">${menu.nama || 'Tanpa Nama'}</div>
      <div class="text-sm mb-1">Panas: <b>Rp ${menu.hargapanas || '-'}</b></div>
      <div class="text-sm mb-1">Es: <b>Rp ${menu.hargaes || '-'}</b></div>
      <div class="mt-2 flex gap-2 justify-center">
        <button onclick="openMenuModal(${i})" class="btn" style="background:var(--accent);font-size:.92rem">Edit</button>
        <button onclick="deleteMenu(${i})" class="btn" style="background:#aaa;font-size:.92rem">Hapus</button>
      </div>
    `;
    menuList.appendChild(div);
  });
}

// ========== KASIR PAGE ==========
function renderMenuTable() {
  const menuTable = document.getElementById('menuTable');
  if (!menuTable) return;
  menuTable.innerHTML = '';
  menus.forEach((menu, i) => {
    const div = document.createElement('div');
    div.className = 'menu-table-item';
    div.innerHTML = `
      <img src="${menu.gambar || 'https://via.placeholder.com/120'}" alt="menu">
      <div class="fw-bold mb-1" style="color:var(--accent)">${menu.nama || 'Tanpa Nama'}</div>
      <div class="flex gap-4 justify-center mt-2 mb-1">
        <div style="text-align:center">
          <span onclick="addToCart(${i}, 'hot')" title="Tambah Panas" style="cursor:pointer;font-size:2rem;color:#e60023;vertical-align:middle;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 4C12 4 16 9 16 13a4 4 0 1 1-8 0c0-4 4-9 4-9z" stroke="#e60023" stroke-width="2" fill="none"/><circle cx="12" cy="17" r="1.2" fill="#e60023"/></svg>
          </span>
          <div class="text-xs mt-1">Panas<br><b>Rp ${menu.hargapanas || '-'}</b></div>
        </div>
        <div style="text-align:center">
          <span onclick="addToCart(${i}, 'cold')" title="Tambah Es" style="cursor:pointer;font-size:2rem;color:#3498db;vertical-align:middle;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3c5 2 7 7.5 7 9.5a7 7 0 1 1-14 0C5 10.5 7 5 12 3z" stroke="#3498db" stroke-width="2" fill="none"/><circle cx="12" cy="17" r="1.2" fill="#3498db"/></svg>
          </span>
          <div class="text-xs mt-1">Es<br><b>Rp ${menu.hargaes || '-'}</b></div>
        </div>
      </div>
    `;
    menuTable.appendChild(div);
  });
}

// ========== Cart Logic ==========
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
  updateCartBadge();
}
function removeFromCart(i) { cart.splice(i, 1); renderCart(); renderCartPopup(); }
function increaseQty(i) { if (cart[i]) cart[i].qty++; renderCart(); renderCartPopup(); }
function decreaseQty(i) { if (cart[i]) { if (cart[i].qty > 1) cart[i].qty--; else cart.splice(i, 1); } renderCart(); renderCartPopup(); }

// ========== Keranjang Popup & Badge ==========
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if(!badge) return;
  const count = cart.reduce((n, i) => n + i.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

function toggleCartPopup() {
  renderCartPopup();
  document.getElementById('cartPopup').classList.add('active');
}
function closeCartPopup(e) {
  if (!e || e.target.id === 'cartPopup' || e.type === "keydown") {
    document.getElementById('cartPopup').classList.remove('active');
  }
}
function renderCartPopup() {
  const list = document.getElementById('cartPopupList');
  if (!list) return;
  list.innerHTML = '';
  let total = 0;
  cart.forEach((item, i) => {
    total += item.price * item.qty;
    list.innerHTML += `
      <li>
        <span>${item.name}</span>
        <span>
          <button onclick="decreaseQty(${i});" class="btn" style="background:#eee;color:#444;padding:.1rem .7rem">-</button>
          x${item.qty}
          <button onclick="increaseQty(${i});" class="btn" style="background:#eee;color:#444;padding:.1rem .7rem">+</button>
        </span>
        <span>Rp ${item.price * item.qty}</span>
        <button onclick="removeFromCart(${i});" class="btn" style="background:#e60023;padding:.1rem .7rem">🗑</button>
      </li>`;
  });
  document.getElementById('cartPopupTotal').textContent = total;
  updateCartBadge();
}

// Tutup popup dengan ESC keyboard
document.addEventListener('keydown', function(e){
  if(e.key === "Escape") closeCartPopup({target:{id:'cartPopup'}, type:"keydown"});
});

// Saat checkout: popup hilang, badge 0, transaksi dicatat, tempTrans update
function checkoutCart() {
  if (!cart.length) return alert("Keranjang kosong!");
  const now = new Date();
  const time = now.toLocaleTimeString('id-ID');
  const date = now.toLocaleDateString('id-ID');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const trx = {
    date,
    time,
    user: user?.username || 'anon',
    items: JSON.parse(JSON.stringify(cart))
  };
  sales.push(trx);
  tempTrans.unshift(trx);
  saveToLocal();
  renderTempTrans();

  cart = [];
  renderCart();
  renderCartPopup();
  document.getElementById('cartPopup').classList.remove('active');
}

// ========== Transaksi Sementara (Accordion) ==========
function renderTempTrans() {
  const list = document.getElementById('tempTransList');
  if (!list) return;
  list.innerHTML = '';
  tempTrans.forEach((trx, i) => {
    const detailId = `transDetail${i}`;
    const collapsed = trx._collapsed === undefined ? true : trx._collapsed;
    const div = document.createElement('div');
    div.className = 'border p-2 rounded bg-white mb-2';
    const totalTrx = trx.items.reduce((sum, it) => sum + it.qty * it.price, 0);
    div.innerHTML = `
      <div class="fw-bold" style="cursor:pointer;" onclick="toggleTransDetail(${i})">
        ${trx.date} ${trx.time} - <em>${trx.user}</em>
        <span style="float:right; color:var(--accent);font-size:1.2em;">${collapsed ? '+' : '−'}</span>
      </div>
      <div id="${detailId}" style="display:${collapsed ? 'none' : 'block'};margin-top:.5em;">
        <ul class="text-sm">
          ${trx.items.map(item => `<li>${item.name} x${item.qty} = Rp ${item.qty * item.price}</li>`).join('')}
        </ul>
        <div class="text-end fw-bold mb-2" style="text-align:right;">Total: Rp ${totalTrx}</div>
        <button onclick="printSingleStruk(${i})" class="text-sm btn mt-2" style="background:var(--accent);">Cetak Struk</button>
      </div>
    `;
    list.appendChild(div);
  });
}
function toggleTransDetail(i) {
  tempTrans[i]._collapsed = !(tempTrans[i]._collapsed === undefined ? true : tempTrans[i]._collapsed);
  renderTempTrans();
}

// ========== Cetak Struk ==========
function printSingleStruk(index) {
  const trx = tempTrans[index];
  if (!trx) return;
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("jsPDF belum dimuat!");
    return;
  }
  const doc = new window.jspdf.jsPDF();
  doc.setFontSize(14);
  doc.text("Struk Pembelian", 10, 10);
  doc.setFontSize(10);
  doc.text(trx.date + ' ' + trx.time + ' - ' + trx.user, 10, 20);
  let y = 30;
  trx.items.forEach(item => {
    doc.text(`${item.name} x${item.qty} = Rp ${item.qty * item.price}`, 10, y);
    y += 8;
  });
  const total = trx.items.reduce((sum, i) => sum + i.qty * i.price, 0);
  doc.text(`Total: Rp ${total}`, 10, y + 10);
  doc.save('struk.pdf');
}

// ========== REKAP PAGE ==========
function renderRekap() {
  const start = document.getElementById('rekapStart')?.value;
  const end = document.getElementById('rekapEnd')?.value;
  let data = sales;
  if (start && end) {
    function toISO(d) {
      if (!d) return '';
      if (d.includes('-')) return d;
      const [day, month, year] = d.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    data = data.filter(trx => {
      const tgl = toISO(trx.date);
      return (!start || tgl >= start) && (!end || tgl <= end);
    });
  }
  // Top 10
  const penjualan = {};
  data.forEach(trx => trx.items.forEach(item => {
    penjualan[item.name] = (penjualan[item.name] || 0) + item.qty;
  }));
  const top10 = Object.entries(penjualan).sort((a,b)=>b[1]-a[1]).slice(0,10);
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
        datasets: [{ label:'Penjualan', data: top10.map(([_,jml])=>jml), backgroundColor:'rgba(230,0,35,0.85)' }]
      }
    });
  }
  // History per tanggal
  const historyTable = document.getElementById('rekapHistoryTable');
  if(historyTable){
    let datax = sales;
    if (start && end) {
      function toISO(d) {
        if (!d) return '';
        if (d.includes('-')) return d;
        const [day, month, year] = d.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      datax = datax.filter(trx => {
        const tgl = toISO(trx.date);
        return (!start || tgl >= start) && (!end || tgl <= end);
      });
    }
    // Buat rekap per tanggal
    const daily = {};
    datax.forEach(trx=>{
      if(!daily[trx.date]) daily[trx.date]={total:0, count:0};
      daily[trx.date].total += trx.items.reduce((sum,it)=>sum+it.qty*it.price,0);
      daily[trx.date].count ++;
    });
    const sorted = Object.entries(daily).sort((a,b)=>new Date(a[0]) - new Date(b[0]));
    let html = `<tr><th>Tanggal</th><th>Transaksi</th><th>Total Omzet</th></tr>`;
    html += sorted.map(([tgl,d])=>`<tr><td>${tgl}</td><td>${d.count}</td><td>Rp ${d.total.toLocaleString()}</td></tr>`).join('');
    historyTable.innerHTML = html || '<tr><td colspan="3">Belum ada transaksi</td></tr>';
  }
}

// ========== ONLOAD ==========
window.onload = () => {
  loadSavedData();
  fetchMenus();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  showPage(user ? 'menu' : 'login');
  if(user) {
    renderMenuList();
    renderMenuTable();
    renderCart();
    renderTempTrans();
    renderRekap();
  }
};

// ========== NAV & SHOWPAGE PATCH ==========
function setActiveNav(id) {
  ['navMenu','navKasir','navRekap'].forEach(nid=>{
    const el = document.getElementById(nid);
    if(el) el.classList.remove('active');
  });
  if(id) {
    const el = document.getElementById(id);
    if(el) el.classList.add('active');
  }
}
window.showPage = function(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById(id+'Page');
  if(target) target.classList.add('active');
  const nav = document.getElementById('mainNav');
  if(nav) nav.style.display = (id==='login'||id==='register') ? 'none' : '';
  setActiveNav(id==='menu'?'navMenu':id==='kasir'?'navKasir':id==='rekap'?'navRekap':null);
  if(id==='menu' && typeof renderMenuList==='function') renderMenuList();
  if(id==='kasir' && typeof renderMenuTable==='function') renderMenuTable();
  if(id==='kasir' && typeof renderCart==='function') renderCart();
  if(id==='kasir' && typeof renderTempTrans==='function') renderTempTrans();
  if(id==='rekap' && typeof renderRekap==='function') renderRekap();
};