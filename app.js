// == Konfigurasi ==
const sheetURL = "https://script.google.com/macros/s/AKfycbw.../exec"; // Ganti dengan URL script kamu

// == Variabel Global ==
let menus = [];
let sales = [];
let cart = [];
let user = null;

// == Utility ==
function saveToLocal() {
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("user", JSON.stringify(user));
}
function loadFromLocal() {
  cart = JSON.parse(localStorage.getItem("cart") || "[]");
  user = JSON.parse(localStorage.getItem("user") || "null");
}

// == Load Menu dari Spreadsheet ==
async function fetchMenus() {
  const res = await fetch(sheetURL);
  menus = await res.json();
  renderMenus();
}

// == Load Rekap Penjualan dari Spreadsheet ==
async function fetchSales() {
  const res = await fetch(sheetURL + "?type=transaksi");
  sales = await res.json();
  renderRekap();
}

// == Render Menu ==
function renderMenus() {
  const menuList = document.getElementById("menu-list");
  menuList.innerHTML = "";
  menus.forEach(menu => {
    const item = document.createElement("div");
    item.innerHTML = `
      <img src="${menu.gambar || ''}" alt="${menu.nama}">
      <h4>${menu.nama}</h4>
      <button onclick="addToCart('${menu.nama}', ${menu.hargapanas})">Panas: Rp${menu.hargapanas}</button>
      <button onclick="addToCart('${menu.nama}', ${menu.hargaes})">Es: Rp${menu.hargaes}</button>
    `;
    menuList.appendChild(item);
  });
}

// == Tambah ke Keranjang ==
function addToCart(nama, harga) {
  const idx = cart.findIndex(i => i.nama === nama && i.harga === harga);
  if (idx > -1) cart[idx].qty += 1;
  else cart.push({ nama, harga, qty: 1 });
  saveToLocal();
  renderCart();
}

// == Render Keranjang ==
function renderCart() {
  const cartList = document.getElementById("cart-list");
  cartList.innerHTML = "";
  cart.forEach((item, i) => {
    const el = document.createElement("div");
    el.innerHTML = `
      ${item.nama} (${item.qty}x) Rp${item.harga} = Rp${item.harga * item.qty}
      <button onclick="removeCart(${i})">Hapus</button>
    `;
    cartList.appendChild(el);
  });
}

// == Hapus Item dari Keranjang ==
function removeCart(idx) {
  cart.splice(idx, 1);
  saveToLocal();
  renderCart();
}

// == Login Manual ==
function loginManual() {
  const username = document.getElementById("login-username").value.trim();
  if (!username) return alert("Username wajib diisi!");
  user = { username };
  saveToLocal();
  renderUser();
}

// == Simulasi Login Google ==
function loginGoogle(email, nama) {
  user = { email, username: nama };
  saveToLocal();
  renderUser();
}

// == Render User ==
function renderUser() {
  const userBox = document.getElementById("user-box");
  if (!user) {
    userBox.innerHTML = `<input id="login-username" placeholder="Username">
    <button onclick="loginManual()">Login</button>`;
  } else {
    userBox.innerHTML = `Login sebagai: ${user.email || user.username}
    <button onclick="logout()">Logout</button>`;
  }
}

// == Logout ==
function logout() {
  user = null;
  saveToLocal();
  renderUser();
}

// == Checkout ==
async function checkout() {
  if (!user) return alert("Login dulu!");
  if (cart.length === 0) return alert("Keranjang kosong!");

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

  // Kirim transaksi ke Google Sheet
  await fetch(sheetURL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "action=transaksi&data=" + encodeURIComponent(JSON.stringify(trx))
  });

  cart = [];
  saveToLocal();
  renderCart();
  await fetchSales(); // Refresh rekap
  alert("Transaksi sukses!");
}

// == Tampil Rekap Penjualan ==
function renderRekap() {
  const rekapList = document.getElementById("rekap-list");
  rekapList.innerHTML = "";
  if (!sales.length) {
    rekapList.innerHTML = "<em>Belum ada transaksi.</em>";
    return;
  }
  sales.forEach(trx => {
    const el = document.createElement("div");
    el.innerHTML = `
      [${trx.tanggal || trx.date} ${trx.jam || trx.time}] 
      <b>${trx["user/email"] || trx.user || trx.email || trx.username}</b> 
      - ${trx["nama menu"] || trx.name}: ${trx.qty} x Rp${trx.harga} = Rp${trx.total}
    `;
    rekapList.appendChild(el);
  });
}

// == Inisialisasi ==
window.onload = async function () {
  loadFromLocal();
  renderUser();
  renderCart();
  await fetchMenus();
  await fetchSales();
};
