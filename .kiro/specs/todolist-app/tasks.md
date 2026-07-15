# Implementation Plan: Todolist App

## Overview

Implementasi aplikasi Todo List Frontend menggunakan vanilla HTML, CSS, dan JavaScript dengan arsitektur MVC ringan. `taskStore.js` berperan sebagai Model (data layer + persistensi localStorage), sedangkan `app.js` berperan sebagai Controller + View (event handling + DOM rendering). Pengujian menggunakan **fast-check** untuk property-based tests dan **Vitest** untuk unit tests.

---

## Tasks

- [x] 1. Setup project structure dan environment pengujian
  - Buat struktur direktori: `index.html`, `style.css`, `taskStore.js`, `app.js`
  - Inisialisasi `package.json` dan install dev dependencies: `fast-check`, `vitest`
  - Tambahkan script `"test": "vitest --run"` di `package.json`
  - Buat file konfigurasi `vitest.config.js` (environment: `jsdom`)
  - Buat file test `taskStore.test.js` (kosong, siap diisi)
  - _Requirements: 7.1, 7.2_

- [x] 2. Implementasi `taskStore.js` — Model / Data Layer
  - [x] 2.1 Definisikan konstanta, state, dan fungsi `loadTasks` / `saveTasks`
    - Definisikan `STORAGE_KEY = "todolist-tasks"` dan `let tasks = []`
    - Implementasikan `loadTasks()`: baca localStorage, parse JSON, validasi field `id`/`title`/`completed` tiap item; jika gagal parse atau validasi, return `[]` dan hapus key
    - Implementasikan `saveTasks()`: `JSON.stringify(tasks)` ke localStorage, tangkap `DOMException` dan lempar `StorageError`
    - Implementasikan `getAllTasks()`: return salinan array `tasks`
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 2.2 Tulis property test untuk `loadTasks` / `saveTasks`
    - **Property 6: Persistensi round-trip mempertahankan data**
    - **Validates: Requirements 7.1, 7.2**
    - Gunakan `fc.array(taskArb)` + mock localStorage (objek `Map`)

  - [x] 2.3 Implementasikan `addTask(title)`
    - Trim input; lempar `ValidationError` jika kurang dari 3 atau lebih dari 50 karakter
    - Buat task baru: `{ id: crypto.randomUUID(), title: trimmed, completed: false, createdAt: Date.now() }`
    - **Unshift** task ke `tasks[]` (posisi indeks 0), lalu panggil `saveTasks()`
    - Return task baru
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_

  - [x] 2.4 Tulis property test untuk `addTask`
    - **Property 1: Task baru ditambahkan ke awal list**
    - **Validates: Requirements 1.1, 1.2, 1.5**
    - Gunakan `fc.array(taskArb)`, `fc.string({minLength:3, maxLength:50})`

  - [x] 2.5 Tulis property test untuk validasi input `addTask`
    - **Property 2: Input whitespace/kosong selalu ditolak**
    - **Validates: Requirements 1.4, 5.5**
    - Gunakan `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))`

  - [x] 2.6 Implementasikan `updateTaskTitle(id, title)`
    - Trim input; lempar `ValidationError` jika kurang dari 3 atau lebih dari 50 karakter
    - Cari task berdasarkan `id`; jika tidak ditemukan, abaikan (tidak melempar error ke UI)
    - Update `title` pada task yang ditemukan, lalu panggil `saveTasks()`
    - Return task yang diupdate
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

  - [x] 2.7 Tulis property test untuk `updateTaskTitle`
    - **Property 9: Edit hanya ubah target task**
    - **Validates: Requirements 5.2, 5.3**
    - Gunakan `fc.array(taskArb, {minLength:1})`, `fc.string({minLength:3, maxLength:50})`

  - [x] 2.8 Implementasikan `toggleTask(id)`
    - Cari task berdasarkan `id`; jika tidak ditemukan, abaikan
    - Toggle nilai `completed` (true ↔ false), lalu panggil `saveTasks()`
    - Return task yang diupdate
    - _Requirements: 3.1, 3.3_

  - [x] 2.9 Tulis property test untuk `toggleTask`
    - **Property 3: Toggle status adalah operasi idempoten bolak-balik (round-trip)**
    - **Validates: Requirements 3.1, 3.3**
    - Gunakan `fc.array(taskArb, {minLength:1})`, `fc.nat()` (pilih index)

  - [x] 2.10 Implementasikan `toggleAllTasks()`
    - Jika ada minimal satu Active Task → ubah semua menjadi `completed = true`
    - Jika semua sudah Completed → ubah semua menjadi `completed = false`
    - Panggil `saveTasks()`, return `tasks[]` terbaru
    - _Requirements: 8.2, 8.4, 8.6_

  - [x] 2.11 Tulis property test untuk `toggleAllTasks`
    - **Property 7: toggleAllTasks adalah operasi idempoten terhadap status all-completed**
    - **Validates: Requirements 8.2, 8.4**
    - Gunakan `fc.array(taskArb, {minLength:1})`

  - [x] 2.12 Implementasikan `deleteTask(id)` dan `deleteCompletedTasks()`
    - `deleteTask(id)`: filter `tasks[]` hapus item dengan `id` tersebut, panggil `saveTasks()`
    - `deleteCompletedTasks()`: filter `tasks[]` pertahankan hanya item `completed === false`, panggil `saveTasks()`
    - _Requirements: 4.2, 4.3_

  - [x] 2.13 Tulis property test untuk `deleteCompletedTasks`
    - **Property 8: deleteCompletedTasks tidak menghapus active tasks**
    - **Validates: Requirements 4.3**
    - Gunakan `fc.array(taskArb)`

- [ ] 3. Checkpoint — Pastikan semua unit & property tests di `taskStore.test.js` lulus
  - Jalankan `npm test` dan pastikan seluruh test hijau sebelum melanjutkan ke layer UI.
  - Tanya pengguna jika ada pertanyaan atau perlu penyesuaian pada Model.

- [x] 4. Implementasi `index.html` dan `style.css` — Markup & Styling
  - [x] 4.1 Buat `index.html` dengan skeleton markup sesuai desain
    - Struktur: `.app-container` → `<h1>`, `.input-area` (input + tombol Tambah), `#input-error`, `.list-section` (mark-all checkbox, `#task-list`, `#empty-msg`), `<footer>` (`#active-count`, `.filter-buttons`, `#clear-completed-btn`)
    - Tambahkan `maxlength="50"` pada `#task-input`
    - Sertakan tag `<script src="taskStore.js">` dan `<script src="app.js">` sebelum `</body>`
    - _Requirements: 1.6, 2.1, 2.3, 2.4, 4.1, 4.3, 4.4, 6.1, 8.1_

  - [x] 4.2 Buat `style.css` — styling dasar dan state visual
    - Style untuk `.completed` task: `text-decoration: line-through` dan warna lebih redup
    - Style untuk `.filter-btn.active`: visual berbeda (border/background/warna) untuk filter aktif
    - Style untuk `.error-msg`: warna merah, tersembunyi secara default (`display: none`)
    - Style untuk `disabled` state tombol: opacity / cursor tidak aktif
    - Style untuk task item dalam mode edit (tampilkan input edit, sembunyikan label)
    - _Requirements: 3.2, 6.6_

- [~] 5. Implementasi `app.js` — Controller + View Layer
  - [x] 5.1 Inisialisasi state UI, muat data, dan render awal
    - Deklarasikan `let currentFilter = "all"` dan `let editingTaskId = null`
    - Pada `DOMContentLoaded`: panggil `loadTasks()` dari `taskStore.js`, lalu panggil `render()`
    - _Requirements: 6.2, 7.2_

  - [x] 5.2 Implementasikan fungsi `render()`, `renderTaskItem(task)`, dan `getFilteredTasks()`
    - `getFilteredTasks()`: filter `getAllTasks()` sesuai `currentFilter` ("all" / "active" / "completed")
    - `render()`: kosongkan `#task-list`, iterasi `getFilteredTasks()`, append hasil `renderTaskItem(task)` ke list
    - `render()` tampilkan `#empty-msg` jika `getFilteredTasks()` kosong (beda pesan untuk list benar-benar kosong vs filter tidak cocok)
    - `renderTaskItem(task)`: buat `<li>` dengan checkbox, label judul, tombol hapus, dan input edit (hidden by default); set class `completed` jika task selesai; set mode edit jika `task.id === editingTaskId`
    - _Requirements: 2.1, 2.2, 2.3, 3.2, 4.1, 6.3, 6.4, 6.5, 6.7_

  - [x] 5.3 Tulis property test untuk `getFilteredTasks`
    - **Property 5: Filter mengembalikan subset yang benar**
    - **Validates: Requirements 6.3, 6.4, 6.5**
    - Gunakan `fc.array(taskArb)`, `fc.constantFrom("all", "active", "completed")`

  - [x] 5.4 Implementasikan `renderFooter()` dan `renderMarkAllControl()`
    - `renderFooter()`: hitung `tasks.filter(t => !t.completed).length`, update teks `#active-count`; enable/disable `#clear-completed-btn` berdasarkan ada tidaknya Completed Task
    - `renderMarkAllControl()`: update `checked` dan `disabled` state `#mark-all-checkbox` berdasarkan kondisi Task_List
    - Panggil kedua fungsi ini dari dalam `render()`
    - _Requirements: 2.4, 2.5, 4.4, 8.1, 8.3, 8.5_

  - [x] 5.5 Tulis property test untuk konsistensi active count
    - **Property 4: Jumlah active count selalu konsisten dengan state tasks**
    - **Validates: Requirements 2.4, 2.5**
    - Gunakan `fc.array(taskArb)`

  - [x] 5.6 Implementasikan `handleAddTask` dan `setFilter`
    - `handleAddTask(e)`: ambil nilai `#task-input`, panggil `addTask(title)`; jika sukses, kosongkan input dan fokus kembali ke input, sembunyikan `#input-error`; jika `ValidationError`, tampilkan pesan di `#input-error`; tangkap `StorageError` dan tampilkan notifikasi
    - Daftarkan handler ke tombol `#add-btn` (click) dan `#task-input` (keydown Enter)
    - `setFilter(filter)`: update `currentFilter`, update class `active` pada `.filter-btn`, panggil `render()`
    - Daftarkan handler ke setiap `.filter-btn` (click)
    - _Requirements: 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 5.7 Implementasikan `handleToggleTask`, `handleDeleteTask`, `handleDeleteCompleted`, `handleToggleAll`
    - `handleToggleTask(id)`: panggil `toggleTask(id)`, tangkap `StorageError`, lalu `render()`
    - `handleDeleteTask(id)`: panggil `deleteTask(id)`, tangkap `StorageError`, lalu `render()`
    - `handleDeleteCompleted()`: panggil `deleteCompletedTasks()`, tangkap `StorageError`, lalu `render()`
    - `handleToggleAll()`: panggil `toggleAllTasks()`, tangkap `StorageError`, lalu `render()`
    - Daftarkan event handler ke elemen terkait melalui event delegation pada `#task-list` dan listener langsung pada `#clear-completed-btn` dan `#mark-all-checkbox`
    - _Requirements: 3.1, 3.3, 4.2, 4.3, 8.2, 8.4, 8.6_

  - [x] 5.8 Implementasikan `handleStartEdit`, `handleSaveEdit`, `handleCancelEdit`
    - `handleStartEdit(id)`: jika ada `editingTaskId`, panggil `handleSaveEdit` dulu (req 5.7); set `editingTaskId = id`; panggil `render()`; fokuskan input edit dan pindahkan kursor ke akhir teks
    - `handleSaveEdit(id, newTitle)`: panggil `updateTaskTitle(id, newTitle)`; jika sukses, set `editingTaskId = null` dan `render()`; jika `ValidationError`, tampilkan pesan error dan tetap di mode edit
    - `handleCancelEdit(id)`: set `editingTaskId = null`, panggil `render()`
    - Daftarkan event: double-click pada label task untuk `handleStartEdit`; Enter / blur pada input edit untuk `handleSaveEdit`; Escape pada input edit untuk `handleCancelEdit`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_

- [x] 6. Checkpoint — Verifikasi fungsionalitas UI secara menyeluruh
  - Pastikan semua test lulus dengan `npm test`
  - Verifikasi secara manual di browser: tambah task, toggle, edit (Enter/Escape/blur), hapus, filter, mark-all, hapus-semua-selesai, refresh halaman (persistensi)
  - Tanya pengguna jika ada penyesuaian atau bug yang ditemukan.

- [x] 7. Terapkan desain gaya Neobrutalism
  - Update `design.md` untuk menyertakan konsep UI/UX Neobrutalism (border tebal, bayangan tajam, warna kontras).
  - Terapkan gaya pada `style.css`: tambahkan background kontras, hard-shadow (misal `box-shadow: 4px 4px 0px #000`), border hitam tebal, dan tipografi tebal.
  - Tambahkan efek interaktif statis (tanpa transisi blur) saat ditekan (`:active`) dan hover.

---

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk MVP lebih cepat
- Setiap task mereferensikan nomor requirement spesifik untuk keterlacakan
- Property tests menggunakan **fast-check**, unit tests menggunakan **Vitest**
- `localStorage` di-mock menggunakan objek `Map` saat property tests berjalan di environment jsdom
- Setiap property test harus menyertakan komentar tag: `// Feature: todolist-app, Property N: <teks property>`
- Tidak ada server atau API eksternal — semua berjalan di sisi klien

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "4.1"] },
    { "id": 1, "tasks": ["2.3", "2.6", "2.8", "2.10", "2.12", "4.2"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.5", "2.7", "2.9", "2.11", "2.13", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.4"] },
    { "id": 4, "tasks": ["5.3", "5.5", "5.6"] },
    { "id": 5, "tasks": ["5.7", "5.8"] }
  ]
}
```
