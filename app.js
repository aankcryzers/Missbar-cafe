const sheetURL = "https://script.google.com/macros/s/AKfycbwxBjbQKLWuhSvo9f4lESHq8-5tWJ5aHTgMxCp2oj6pomY8KevrAc2WfTjwsdl9ieQ2/exec";

let menus = [];
let cart = [];
let sales = JSON.parse(localStorage.getItem('sales') || '[]');
let tempTrans = JSON.parse(localStorage.getItem('tempTrans') || '[]');

window.onload = () => {
  fetchMenus();
  renderCart();
  renderTempTrans();
  showPage('kasir');
};

function showPage(page) {
  ['kasirPage', 'menuPage', 'rekapPage'].forEach(p => document.getElementById(p).classList.add('hidden'));
  document.getElementById(page + 'Page').classList.remove('hidden');
  if (page === 'rekap') renderRekap();
  if (page === 'menu') renderMenuTable();
}

function fetchMenus() {
  fetch(sheetURL + "?action=getMenus")
    .then(res => res.json())
    .then(data => {
      menus = data;
      renderMenuList();
      renderMenuTable();
    })
    .catch(() => alert("Gagal ambil menu dari spreadsheet."));
}

function renderMenuList() {
  const menuList = document.getElementById("menuList");
  menuList.innerHTML = "";
  menus.forEach((m, i) => {
    menuList.innerHTML += `
      <div class="bg-white rounded shadow p-2 text-center">
        <img src="${m.img}" class="h-24 object-cover mx-auto rounded mb-2">
        <div class="font-bold">${m.name}</div>
        <button onclick="addToCart(${i},'hot')" class="bg-red-500 text-white px-2 py-1 rounded m-1">Panas</button>
        <button onclick="addToCart(${i},'cold')" class="bg-blue-500 text-white px-2 py-1 rounded m-1">Es</button>
      </div>`;
  });
}

function addToCart(i, type) {
  const menu = menus[i];
  const name = `${menu.name} (${type === 'hot' ? 'Panas' : 'Es'})`;
  const price = type === 'hot' ? +menu.priceHot : +menu.priceCold;
  const exist = cart.find(item => item.name === name);
  if (exist) exist.qty++;
  else cart.push({ name, price, qty: 1 });
  renderCart();
}

function renderCart() {
  const list = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotal");
  let total = 0;
  list.innerHTML = "";
  cart.forEach((item, i) => {
    list.innerHTML += `
      <li>${item.name} x${item.qty} = Rp ${item.qty * item.price}
        <button onclick="cart[${i}].qty++;renderCart()">+</button>
        <button onclick="cart[${i}].qty > 1 ? cart[${i}].qty-- : cart.splice(${i},1);renderCart()">-</button>
      </li>`;
    total += item.qty * item.price;
  });
  totalEl.textContent = total;
}

function checkout() {
  if (!cart.length) return alert("Keranjang kosong");
  const time = new Date();
  const date = time.toISOString().split('T')[0];
  const trx = { time: time.toLocaleString('id-ID'), date, items: structuredClone(cart) };
  sales.push(trx);
  tempTrans.unshift(trx);
  localStorage.setItem("sales", JSON.stringify(sales));
  localStorage.setItem("tempTrans", JSON.stringify(tempTrans));

  const fd = new FormData();
  fd.append("data", JSON.stringify(trx));

  fetch(sheetURL, { method: "POST", body: fd })
    .then(res => res.text())
    .then(() => alert("Berhasil checkout dan simpan ke Spreadsheet"))
    .catch(() => alert("Berhasil lokal tapi gagal simpan ke Spreadsheet"));

  cart = [];
  renderCart();
  renderTempTrans();
}

function clearTempTrans() {
  if (confirm("Yakin hapus semua log?")) {
    tempTrans = [];
    localStorage.setItem("tempTrans", "[]");
    renderTempTrans();
  }
}

function renderTempTrans() {
  const div = document.getElementById("tempTransList");
  div.innerHTML = "";
  tempTrans.forEach(trx => {
    div.innerHTML += `
      <div class="bg-white p-2 rounded shadow">
        <strong>${trx.time}</strong><br>
        <ul class="text-sm">
          ${trx.items.map(i => `<li>${i.name} x${i.qty} = Rp ${i.qty * i.price}</li>`).join('')}
        </ul>
      </div>`;
  });
}

function renderMenuTable() {
  const div = document.getElementById("menuTable");
  div.innerHTML = "";
  menus.forEach((m, i) => {
    div.innerHTML += `
      <div class="bg-white rounded shadow p-2 text-sm">
        <img src="${m.img}" class="h-20 object-cover rounded mb-1">
        <div class="font-bold">${m.name}</div>
        <div>Panas: Rp ${m.priceHot}</div>
        <div>Es: Rp ${m.priceCold}</div>
      </div>`;
  });
}

function renderRekap() {
  const dateFilter = document.getElementById("filterDate").value;
  const data = dateFilter ? sales.filter(s => s.date === dateFilter) : sales;
  const list = document.getElementById("rekapList");
  list.innerHTML = "";
  const daily = {};
  data.forEach(trx => {
    const t = trx.date;
    daily[t] = (daily[t] || 0) + trx.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    list.innerHTML += `<div class="bg-white p-2 rounded mb-1">
      <strong>${trx.time}</strong>
      <ul>${trx.items.map(i => `<li>${i.name} x${i.qty} = Rp ${i.qty * i.price}</li>`).join('')}</ul>
    </div>`;
  });

  const ctx = document.getElementById("salesChart").getContext("2d");
  if (window.chart) window.chart.destroy();
  window.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(daily),
      datasets: [{ label: "Penjualan", data: Object.values(daily), backgroundColor: "#4ade80" }]
    }
  });

  document.getElementById("rekapSummary").textContent = "Total Penjualan: Rp " + Object.values(daily).reduce((a, b) => a + b, 0);
}
