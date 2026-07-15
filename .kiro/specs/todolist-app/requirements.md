# Requirements Document

## Introduction

Aplikasi Todo List Frontend adalah aplikasi web sederhana berbasis antarmuka pengguna (UI) yang memungkinkan pengguna untuk mengelola daftar tugas sehari-hari. Pengguna dapat menambahkan, mengedit, menyelesaikan, dan menghapus tugas. Aplikasi ini berjalan sepenuhnya di sisi klien (frontend) dan menyimpan data secara lokal di browser.

## Glossary

- **App**: Aplikasi Todo List Frontend secara keseluruhan
- **Task**: Satu item tugas yang memiliki judul, status penyelesaian, dan waktu pembuatan
- **Task_List**: Kumpulan seluruh Task yang dimiliki pengguna
- **Task_Input**: Komponen antarmuka berupa kolom teks untuk memasukkan judul Task baru
- **Task_Item**: Komponen antarmuka yang merepresentasikan satu Task dalam Task_List
- **Filter**: Komponen antarmuka untuk memfilter Task berdasarkan status (semua, aktif, selesai)
- **Local_Storage**: Mekanisme penyimpanan data di browser yang persisten meskipun halaman di-refresh
- **Active Task**: Task yang belum ditandai selesai
- **Completed Task**: Task yang telah ditandai selesai oleh pengguna

---

## Requirements

### Requirement 1: Menambahkan Task Baru

**User Story:** Sebagai pengguna, saya ingin menambahkan tugas baru ke daftar, sehingga saya dapat mencatat hal-hal yang perlu saya kerjakan.

#### Acceptance Criteria

1. THE Task_Input SHALL menerima teks judul Task dengan panjang antara 3 hingga 50 karakter.
2. WHEN pengguna menekan tombol "Tambah" atau menekan tombol Enter pada Task_Input, THE App SHALL menambahkan Task baru ke Task_List dengan status Active Task dan timestamp pembuatan saat ini.
3. WHEN Task baru berhasil ditambahkan, THE App SHALL mengosongkan Task_Input secara otomatis dan mengembalikan fokus ke Task_Input.
4. IF Task_Input kosong atau hanya berisi spasi ketika pengguna mencoba menambahkan Task, THEN THE App SHALL menampilkan pesan kesalahan "Judul tugas tidak boleh kosong" dan Task tidak ditambahkan ke Task_List.
5. WHEN Task baru ditambahkan, THE App SHALL menampilkan Task baru di bagian atas Task_List.
6. IF judul Task melebihi 50 karakter, THEN THE App SHALL mencegah input karakter tambahan setelah karakter ke-50.

---

### Requirement 2: Menampilkan Daftar Task

**User Story:** Sebagai pengguna, saya ingin melihat semua tugas saya dalam satu daftar, sehingga saya dapat mengetahui apa saja yang perlu dikerjakan.

#### Acceptance Criteria

1. THE App SHALL menampilkan seluruh Task dalam Task_List pada halaman utama sesuai dengan urutan terbaru di atas.
2. WHEN Task_List kosong dan tidak ada filter aktif selain "Semua", THE App SHALL menampilkan pesan "Belum ada tugas. Tambahkan tugas baru di atas!".
3. THE Task_Item SHALL menampilkan judul Task dan indikator visual status penyelesaiannya (checkbox tercentang untuk Completed Task, tidak tercentang untuk Active Task).
4. THE App SHALL menampilkan jumlah Active Task yang tersisa di bagian bawah Task_List dalam format "[N] tugas tersisa", di mana N adalah jumlah Active Task saat ini.
5. WHEN jumlah Active Task berubah (Task ditambah, dihapus, atau statusnya berubah), THE App SHALL memperbarui tampilan "[N] tugas tersisa" secara real-time.

---

### Requirement 3: Menandai Task sebagai Selesai

**User Story:** Sebagai pengguna, saya ingin menandai tugas sebagai selesai, sehingga saya dapat melacak progress pekerjaan saya.

#### Acceptance Criteria

1. WHEN pengguna mengklik kotak centang (checkbox) pada sebuah Active Task_Item, THE App SHALL mengubah status Task tersebut menjadi Completed Task dan menampilkan checkbox dalam kondisi tercentang (checked).
2. WHILE sebuah Task berstatus Completed Task, THE App SHALL menampilkan judul Task dengan tampilan coret (strikethrough) dan checkbox dalam kondisi tercentang.
3. WHEN pengguna mengklik kotak centang pada sebuah Completed Task, THE App SHALL mengubah status Task tersebut kembali menjadi Active Task, menghilangkan tampilan strikethrough pada judul, dan menampilkan checkbox dalam kondisi tidak tercentang.

---

### Requirement 4: Menghapus Task

**User Story:** Sebagai pengguna, saya ingin menghapus tugas yang tidak relevan lagi, sehingga daftar tugas saya tetap bersih dan terorganisir.

#### Acceptance Criteria

1. THE Task_Item SHALL selalu menampilkan tombol hapus yang terlihat (tidak hanya saat hover) untuk setiap Task.
2. WHEN pengguna mengklik tombol hapus pada sebuah Task_Item, THE App SHALL segera menghapus Task tersebut dari Task_List secara permanen tanpa dialog konfirmasi, dan Task_List SHALL diperbarui secara langsung.
3. WHEN pengguna mengklik tombol "Hapus Semua yang Selesai", THE App SHALL menghapus seluruh Completed Task dari Task_List sekaligus.
4. IF tidak ada Completed Task dalam Task_List, THEN THE App SHALL menonaktifkan (disabled, tetap terlihat) tombol "Hapus Semua yang Selesai".

---

### Requirement 5: Mengedit Task

**User Story:** Sebagai pengguna, saya ingin mengedit judul tugas yang sudah ada, sehingga saya dapat memperbarui informasi tugas jika ada perubahan.

#### Acceptance Criteria

1. WHEN pengguna melakukan double-click pada judul Task_Item, THE App SHALL mengaktifkan mode edit dan menampilkan kolom teks yang dapat diedit berisi judul Task saat ini dengan fokus ditempatkan di akhir teks.
2. WHEN pengguna menekan tombol Enter saat dalam mode edit, THE App SHALL menyimpan perubahan judul Task (setelah trim spasi di awal/akhir) dan menonaktifkan mode edit.
3. WHEN pengguna mengklik di luar kolom edit (blur event), THE App SHALL menyimpan perubahan judul Task (setelah trim spasi di awal/akhir) dan menonaktifkan mode edit.
4. WHEN pengguna menekan tombol Escape saat dalam mode edit, THE App SHALL membatalkan perubahan, mengembalikan judul Task ke nilai semula, dan menonaktifkan mode edit.
5. IF kolom edit kosong atau hanya berisi spasi ketika pengguna menyimpan perubahan, THEN THE App SHALL menampilkan pesan kesalahan "Judul tugas tidak boleh kosong" dan tetap dalam mode edit tanpa menyimpan perubahan.
6. IF judul yang diedit melebihi 50 karakter, THEN THE App SHALL mencegah input karakter tambahan setelah karakter ke-50 saat dalam mode edit.
7. WHEN pengguna melakukan double-click pada judul Task_Item lain saat sebuah Task_Item sedang dalam mode edit, THE App SHALL menyimpan perubahan pada Task_Item yang sedang diedit (mengikuti aturan kriteria 2), lalu mengaktifkan mode edit pada Task_Item yang baru diklik.

---

### Requirement 6: Memfilter Task

**User Story:** Sebagai pengguna, saya ingin memfilter daftar tugas berdasarkan statusnya, sehingga saya dapat fokus pada tugas yang relevan.

#### Acceptance Criteria

1. THE Filter SHALL menyediakan tiga pilihan tampilan: "Semua", "Aktif", dan "Selesai".
2. WHEN App dimuat pertama kali, THE Filter SHALL menampilkan pilihan "Semua" sebagai filter yang aktif secara default.
3. WHEN pengguna memilih filter "Semua", THE App SHALL menampilkan seluruh Task dalam Task_List.
4. WHEN pengguna memilih filter "Aktif", THE App SHALL menampilkan hanya Active Task dalam Task_List.
5. WHEN pengguna memilih filter "Selesai", THE App SHALL menampilkan hanya Completed Task dalam Task_List.
6. THE Filter SHALL menampilkan pilihan filter yang sedang aktif dengan atribut CSS class "active" yang membedakannya secara visual dari pilihan yang tidak aktif.
7. WHEN filter "Aktif" atau "Selesai" aktif dan tidak ada Task yang cocok dengan filter tersebut, THE App SHALL menampilkan pesan "Tidak ada tugas yang sesuai dengan filter ini."

---

### Requirement 7: Persistensi Data

**User Story:** Sebagai pengguna, saya ingin data tugas saya tersimpan secara otomatis, sehingga tugas saya tidak hilang ketika saya menutup atau me-refresh browser.

#### Acceptance Criteria

1. WHEN pengguna menambahkan, mengedit, menyelesaikan, atau menghapus sebuah Task, THE App SHALL menyimpan seluruh Task_List ke Local_Storage secara otomatis menggunakan key "todolist-tasks".
2. WHEN App dimuat pertama kali, THE App SHALL memuat Task_List dari Local_Storage jika key "todolist-tasks" ada dan nilainya adalah JSON array yang valid.
3. IF data di Local_Storage tidak valid (JSON parse gagal atau item dalam array tidak memiliki field id, title, atau completed) saat App dimuat, THEN THE App SHALL memuat Task_List kosong dan menghapus key "todolist-tasks" dari Local_Storage.
4. IF operasi penulisan ke Local_Storage gagal (misalnya storage penuh), THEN THE App SHALL menampilkan pesan kesalahan kepada pengguna bahwa data tidak dapat disimpan, namun tetap mempertahankan Task_List di memori untuk sesi saat ini.

---

### Requirement 8: Menandai Semua Task Sekaligus

**User Story:** Sebagai pengguna, saya ingin menandai semua tugas sebagai selesai sekaligus, sehingga saya dapat menyelesaikan seluruh daftar dengan cepat.

#### Acceptance Criteria

1. THE App SHALL menampilkan kontrol "Tandai Semua Selesai" (berupa checkbox) pada bagian atas Task_List; IF Task_List kosong, THEN THE App SHALL menampilkan kontrol tersebut dalam kondisi disabled.
2. WHEN pengguna mengklik kontrol "Tandai Semua Selesai" dan terdapat minimal satu Active Task dalam Task_List, THE App SHALL mengubah seluruh Active Task menjadi Completed Task.
3. IF seluruh Task dalam Task_List berstatus Completed Task, THEN THE App SHALL menampilkan kontrol "Tandai Semua Selesai" dalam kondisi tercentang (checked).
4. WHEN pengguna mengklik kontrol "Tandai Semua Selesai" saat seluruh Task sudah berstatus Completed Task, THE App SHALL mengubah seluruh Completed Task kembali menjadi Active Task.
5. IF Task_List kosong, THEN THE App SHALL menonaktifkan (disabled) kontrol "Tandai Semua Selesai".
6. WHEN pengguna mengklik kontrol "Tandai Semua Selesai", THE App SHALL menerapkan perubahan status ke seluruh Task dalam Task_List tanpa memandang filter yang sedang aktif.

---

### Requirement 9: Menyusun Ulang Task (Drag and Drop)

**User Story:** Sebagai pengguna, saya ingin dapat mengubah urutan tugas secara manual (drag-and-drop), sehingga saya dapat mengatur prioritas pekerjaan sesuai keinginan saya.

#### Acceptance Criteria

1. THE Task_Item SHALL mendukung interaksi *drag and drop* tanpa memerlukan elemen (drag handle) tambahan khusus (seluruh kotak tugas dapat di-drag).
2. WHEN pengguna men-drag sebuah Task_Item, THE App SHALL memberikan umpan balik visual bahwa elemen tersebut sedang dipindahkan (misalnya dengan mengurangi opacity/tampilan transparan).
3. WHEN pengguna men-drop Task_Item di posisi baru di dalam Task_List, THE App SHALL memindahkan Task_Item ke posisi tersebut.
4. WHEN posisi Task_Item berubah akibat *drop*, THE App SHALL memperbarui susunan `Task_List` utama di memori dan menyimpannya secara otomatis ke Local_Storage agar urutan tetap bertahan meskipun aplikasi dimuat ulang.
5. IF pengguna melakukan drag-and-drop saat filter tertentu sedang aktif (mis. Aktif atau Selesai), THEN urutan baru SHALL disimpan sesuai posisi penyisipan secara relatif terhadap tugas yang ada di filter tersebut.
