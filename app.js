// == KONFIGURASI ==
const sheetURL = "https://script.google.com/macros/s/AKfycbw.../exec"; // Ganti dengan URL Apps Script kamu

// == STATE ==
let user = null;
let menus = [];
let cart = [];
let sales = [];
let tempTrans = [];

// == UTIL ==
function saveToLocal() {
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("tempTrans", JSON.stringify(tempTrans));
}
function loadFromLocal() {
  cart = JSON.parse(localStorage.getItem("cart") || "[]");
  user = JSON.parse(localStorage.getItem("user") || "null");
  tempTrans = JSON.parse(localStorage.getItem("tempTrans") || "[]");
}

// == PAGE CONTROL ==
function showPage(page) {
  ['loginPage','registerPage','menuPage','kasirPage','rekapPage'].forEach(id =>
    document.getElementById(id).classList.remove('active')
  );
  document.getElementById(page + "Page").classList.add('active');
  document.getElementById("mainNav").style.display = (page == "login" || page == "register") ? "none" : "";
}

// == LOGIN MANUAL ==
function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  if(!username || !password) return alert("Username dan password wajib diisi!");
  user = { username };
  saveToLocal();
  showPage("menu");
}

// == REGISTER ==
function registerUser() {
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  if(!username || !password) return alert("Username dan password wajib diisi!");
  alert("Akun berhasil dibuat! Silakan login.");
  showPage("login");
}

// == LOGOUT ==
function logoutUser() {
  localStorage.removeItem("user");
  user = null;
  showPage("login");
}

// == AUTO LOGIN ==
window.onload = function() {
  loadFromLocal();
  if(user) showPage("menu");
  else showPage("login");
  fetchMenus();
  fetchSales();
  renderCart();
  renderTempTrans();
};

// == GOOGLE LOGIN ==
function handleGoogleLogin(response) {
  if(!response.credential) return;
  const data = parseJwt(response.credential);
  user = { email: data.email, username: data.name };
  saveToLocal();
  showPage("menu");
}
function parseJwt (token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return {};
  }
}

// == MENU ==
async function fetchMenus() {
  try {
    const res = await fetch(sheetURL);
    menus = await res.json();
    renderMenus();
    renderMenuTable();
  } catch(e) {
    menus = [];
    renderMenus();
    renderMenuTable();
  }
}
function renderMenus() {
  const menuList = document.getElementById("menuList");
  if (!menuList) return;
  menuList.innerHTML = "";
  menus.forEach(menu => {
    const div = document.createElement("div");
    div.className = "menu-item";
    div.innerHTML = `
      <img src="${menu.gambar || ''}" alt="${menu.nama}">
      <h4>${menu.nama}</h4>
      <div>
        <button class="btn" onclick="addToCart('${menu.nama}', ${menu.hargapanas})">Panas: Rp${menu.hargapanas}</button>
        <button class="btn" onclick="addToCart('${menu.nama}', ${menu.hargaes})">Es: Rp${menu.hargaes}</button>
      </div>
    `;
    menuList.appendChild(div);
  });
}
function renderMenuTable() {
  const menuTable = document.getElementById("menuTable");
  if (!menuTable) return;
  menuTable.innerHTML = "";
  menus.forEach(menu => {
    const div = document.createElement("div");
    div.className = "menu-table-item";
    div.innerHTML = `
      <img src="${menu.gambar || ''}" alt="${menu.nama}">
      <h4>${menu.nama}</h4>
      <div>
        <button class="btn" onclick="addToCart('${menu.nama}', ${menu.hargapanas})">Panas: Rp${menu.hargapanas}</button>
        <button class="btn" onclick="addToCart('${menu.nama}', ${menu.hargaes})">Es: Rp${menu.hargaes}</button>
      </div>
    `;
    menuTable.appendChild(div);
  });
}

// == KERANJANG ==
function addToCart(nama, harga) {
  const idx = cart.findIndex(i => i.nama === nama && i.harga === harga);
  if (idx > -1) cart[idx].qty += 1;
  else cart.push({ nama, harga, qty: 1 });
  saveToLocal();
  renderCart();
}

function renderCart() {
  const badge = document.getElementById("cartBadge");
  if (badge) badge.textContent = cart.reduce((a, b) => a + b.qty, 0);
  const cartList = document.getElementById("cartPopupList");
  if (!cartList) return;
  cartList.innerHTML = "";
  cart.forEach((item, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${item.nama} (${item.qty}x) Rp${item.harga} = Rp${item.harga * item.qty}
      <button class="btn" style="padding:.2em .7em" onclick="removeCart(${i})">Hapus</button>
    `;
    cartList.appendChild(li);
  });
  // Total
  const total = cart.reduce((a, b) => a + (b.qty * b.harga), 0);
  document.getElementById("cartPopupTotal").textContent = total;
}
function removeCart(idx) {
  cart.splice(idx, 1);
  saveToLocal();
  renderCart();
}

// == CART POPUP ==
function toggleCartPopup() {
  document.getElementById("cartPopup").classList.add("active");
  renderCart();
}
function closeCartPopup(e) {
  if (e.target === document.getElementById("cartPopup")) {
    document.getElementById("cartPopup").classList.remove("active");
  }
}

// == CHECKOUT ==
function checkoutCart() {
  if (!user) return alert("Silakan login!");
  if (cart.length === 0) return alert("Keranjang kosong!");
  // Tampilkan modal konfirmasi
  document.getElementById("checkoutModal").style.display = "flex";
  // Render isi keranjang di modal
  const checkoutList = document.getElementById("checkoutList");
  checkoutList.innerHTML = "";
  cart.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.nama} (${item.qty}x) Rp${item.harga} = Rp${item.harga * item.qty}`;
    checkoutList.appendChild(li);
  });
  document.getElementById("checkoutTotal").textContent = cart.reduce((a, b) => a + b.harga * b.qty, 0);
}
function closeCheckoutModal() {
  document.getElementById("checkoutModal").style.display = "none";
}
async function confirmCheckout() {
  // Kirim ke spreadsheet
  const date = new Date();
  const trx = {
    date: date.toLocaleDateString("en-CA"),
    time: date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
    email: user.email || "",
    username: user.username || "",
    items: cart.map(i => ({
      name: i.nama,
      qty: i.qty,
      price: i.harga
    }))
  };
  await fetch(sheetURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "action=transaksi&data=" + encodeURIComponent(JSON.stringify(trx))
  });
  // Simpan transaksi lokal (untuk history kasir sementara)
  tempTrans.unshift({
    ...trx,
    total: cart.reduce((a, b) => a + b.qty * b.harga, 0)
  });
  tempTrans = tempTrans.slice(0, 5); // Limit 5 transaksi terakhir
  saveToLocal();
  cart = [];
  saveToLocal();
  renderCart();
  renderTempTrans();
  closeCheckoutModal();
  toggleCartPopup(); // Tutup popup cart
  fetchSales(); // Update rekap
  alert("Transaksi sukses!");
}

// == HISTORY KASIR SEMENTARA (Transaksi Terakhir) ==
function renderTempTrans() {
  const tempList = document.getElementById("tempTransList");
  if (!tempList) return;
  tempList.innerHTML = "";
  tempTrans.forEach(trx => {
    const div = document.createElement("div");
    div.className = "mb-2 text-sm";
    div.innerHTML = `
      [${trx.date} ${trx.time}] <b>${trx.email || trx.username}</b>
      <br>
      <span>${trx.items.map(i => `${i.name} (${i.qty}x)`).join(", ")}</span>
      <br>
      <b>Total: Rp${trx.total}</b>
    `;
    tempList.appendChild(div);
  });
}

// == SALES/REKAP ==
async function fetchSales() {
  try {
    const res = await fetch(sheetURL + "?type=transaksi");
    sales = await res.json();
    renderRekap();
  } catch(e) {
    sales = [];
    renderRekap();
  }
}

// == RENDER REKAP ==
function renderRekap() {
  // Top 10 Penjualan
  const top10List = document.getElementById("top10List");
  if (top10List) {
    // Hitung total qty per menu
    const stat = {};
    sales.forEach(row => {
      const menu = row["nama menu"] || row.name;
      if (!stat[menu]) stat[menu] = 0;
      stat[menu] += Number(row.qty || row["qty"] || 0);
    });
    const sorted = Object.entries(stat).sort((a, b) => b[1] - a[1]).slice(0, 10);
    top10List.innerHTML = sorted.map(([menu, qty]) => `<li>${menu}: <b>${qty}</b></li>`).join('');
  }

  // History Penjualan Per Tanggal
  const table = document.getElementById("rekapHistoryTable");
  if (table) {
    let html = `<tr><th>Tanggal</th><th>User</th><th>Menu</th><th>Qty</th><th>Harga</th><th>Total</th></tr>`;
    sales.forEach(trx => {
      html += `<tr>
        <td>${trx.tanggal || trx.date}</td>
        <td>${trx["user/email"] || trx.email || trx.username}</td>
        <td>${trx["nama menu"] || trx.name}</td>
        <td>${trx.qty}</td>
        <td>Rp${trx.harga}</td>
        <td>Rp${trx.total}</td>
      </tr>`;
    });
    table.innerHTML = html;
  }
}

// == MENU MODAL (TAMBAH MENU, dummy, tidak ke spreadsheet) ==
function openMenuModal() {
  document.getElementById("menuModal").style.display = "flex";
  document.getElementById("menuNama").value = "";
  document.getElementById("menuHargaPanas").value = "";
  document.getElementById("menuHargaEs").value = "";
  document.getElementById("menuGambar").value = "";
}
function closeMenuModal() {
  document.getElementById("menuModal").style.display = "none";
}
async function saveMenuEdit() {
  const nama = document.getElementById("menuNama").value.trim();
  const hargapanas = Number(document.getElementById("menuHargaPanas").value);
  const hargaes = Number(document.getElementById("menuHargaEs").value);
  const gambar = document.getElementById("menuGambar").value.trim();
  if (!nama || !hargapanas || !hargaes) return alert("Nama dan harga wajib diisi!");

  // Kirim ke spreadsheet
  await fetch(sheetURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "action=tambahmenu&data=" + encodeURIComponent(JSON.stringify({ nama, hargapanas, hargaes, gambar }))
  });
  closeMenuModal();
  fetchMenus();
}

// == NAVIGATION ==
document.getElementById("navMenu").onclick = () => { showPage("menu"); fetchMenus(); };
document.getElementById("navKasir").onclick = () => { showPage("kasir"); fetchMenus(); renderMenuTable(); };
document.getElementById("navRekap").onclick = () => { showPage("rekap"); fetchSales(); };

// == SHORTCUT PAGE CONTROL ==
window.showPage = showPage;
window.logoutUser = logoutUser;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.handleGoogleLogin = handleGoogleLogin;
window.addToCart = addToCart;
window.removeCart = removeCart;
window.toggleCartPopup = toggleCartPopup;
window.closeCartPopup = closeCartPopup;
window.checkoutCart = checkoutCart;
window.closeCheckoutModal = closeCheckoutModal;
window.confirmCheckout = confirmCheckout;
window.openMenuModal = openMenuModal;
window.closeMenuModal = closeMenuModal;
window.saveMenuEdit = saveMenuEdit;
