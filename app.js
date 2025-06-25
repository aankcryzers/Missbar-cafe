// app.js

let menus = [];
let cart = [];
let sales = [];
let tempTrans = [];

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx31A-ImwsYRteQCtSCvBEscYPUL06JXZwzUdHbJLAqQKaop0z6V7c76mGu0QcS60Gg/exec';
const SHEET_ID = '1Xrvkzu3AoVIISgO1aguvqPnKz2BmUdk9yRIUIiXg1w8';

async function fetchMenusFromSheet() {
  try {
    const res = await fetch(SHEET_URL + '?mode=readMenus');
    const data = await res.json();
    menus = data;
    renderMenuList();
    renderMenuTable();
  } catch (err) {
    console.error('Gagal mengambil menu dari spreadsheet', err);
  }
}

async function saveMenuToSheet(menu) {
  try {
    await fetch(SHEET_URL + '?mode=addMenu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menu)
    });
    fetchMenusFromSheet();
  } catch (err) {
    console.error('Gagal menyimpan menu ke spreadsheet', err);
  }
}

async function deleteMenuFromSheet(index) {
  try {
    await fetch(SHEET_URL + '?mode=deleteMenu&index=' + index);
    fetchMenusFromSheet();
  } catch (err) {
    console.error('Gagal menghapus menu dari spreadsheet', err);
  }
}

async function syncTransaksiToSheet(trx) {
  try {
    await fetch(SHEET_URL + '?mode=addTransaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trx)
    });
  } catch (err) {
    console.warn('Gagal simpan transaksi ke spreadsheet', err);
  }
}

// Fungsi render dan lainnya tetap diletakkan di file index.html

// Inisialisasi saat load
window.addEventListener('load', () => {
  fetchMenusFromSheet();
});
