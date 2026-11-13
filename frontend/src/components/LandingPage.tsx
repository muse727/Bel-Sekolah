import React, { useState } from 'react';

interface LandingPageProps {
  onOpenApp: () => void;
}

// Clean inline SVG icons replacing all emojis
function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconVolume({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconSliders({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconActivity({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconWindows({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802" />
    </svg>
  );
}

function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Apakah aplikasi ini gratis untuk digunakan?",
      a: "Ya, 100% gratis dan open-source di bawah lisensi MIT. Bebas digunakan, disesuaikan, dan dipasang pada komputer sekolah tanpa batasan unit."
    },
    {
      q: "Bagaimana cara kerja jadwal otomatisnya?",
      a: "Aplikasi berjalan sebagai background service yang mengecek detik waktu secara presisi. Sistem mencocokkan waktu komputer lokal dengan konfigurasi jadwal harian aktif dan memutar file audio tanpa ketergantungan jaringan eksternal."
    },
    {
      q: "Apakah komputer sekolah harus terhubung ke internet?",
      a: "Tidak. Aplikasi desktop Windows berjalan sepenuhnya offline menggunakan database lokal SQLite dan file audio lokal. Internet hanya dibutuhkan saat mengunduh installer pertama kali atau saat mengakses fitur remote via QR Code."
    },
    {
      q: "Apakah bisa dipasang di komputer spesifikasi lama?",
      a: "Bisa. Dibangun menggunakan Rust dan Tauri dengan konsumsi memori kerja di bawah 35MB dan penggunaan CPU mendekati 0% saat standby."
    },
    {
      q: "Bagaimana jika ada pengumuman darurat?",
      a: "Tersedia panel soundboard satu-klik untuk membunyikan sirine darurat atau nada pengumuman mendadak yang langsung memotong audio yang sedang berjalan."
    }
  ];

  const features = [
    {
      icon: <IconClock className="w-5 h-5 text-[#D4FA3C]" />,
      tag: "Otomasi Presisi",
      title: "Jadwal Bel Akurat per Detik",
      desc: "Sinkronisasi waktu lokal komputer sekolah. Bel berdentang tepat pada detik yang ditentukan tanpa keterlambatan pemrosesan."
    },
    {
      icon: <IconCalendar className="w-5 h-5 text-[#D4FA3C]" />,
      tag: "Multi-Profil",
      title: "Profil Jadwal Fleksibel",
      desc: "Beralih jadwal harian antara Reguler, Khusus Jumat, Jadwal Ujian (PTS/PAS), maupun Jam Ramadhan hanya dengan satu klik."
    },
    {
      icon: <IconVolume className="w-5 h-5 text-[#D4FA3C]" />,
      tag: "Soundboard",
      title: "Akses Cepat Pengeras Suara",
      desc: "Tombol instan untuk bel manual, lagu nasional, pembacaan doa, atau sirine evakuasi darurat."
    },
    {
      icon: <IconShield className="w-5 h-5 text-[#D4FA3C]" />,
      tag: "Offline First",
      title: "Mandiri Tanpa Koneksi Internet",
      desc: "Penyimpanan jadwal dan audio langsung di disk lokal via SQLite. Gangguan internet atau Wi-Fi sekolah tidak menghentikan jadwal."
    },
    {
      icon: <IconSliders className="w-5 h-5 text-[#D4FA3C]" />,
      tag: "Pustaka Audio",
      title: "Nada dan Rekaman Bebas Kustom",
      desc: "Dukungan file audio MP3 dan WAV. Kelola nada bel masuk, istirahat, pulang, serta pengaturan volume master audio."
    },
    {
      icon: <IconActivity className="w-5 h-5 text-[#D4FA3C]" />,
      tag: "Audit Log",
      title: "Riwayat dan Pemantauan Status",
      desc: "Catatan histori otomatis setiap nada bel yang berbunyi, penghitung waktu mundur bel berikutnya, dan log diagnostik sistem."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-[#EDEDED] font-sans antialiased selection:bg-[#D4FA3C] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-[#222222]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#262626] flex items-center justify-center shrink-0">
              <img src="/logo-aplikasi.png" alt="Logo Bel Sekolah" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-sm sm:text-base">Bel Sekolah</span>
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-[#A1A1AA] border border-[#2A2A2A]">v0.1.4</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs text-[#A1A1AA]">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur Sistem</a>
            <a href="#arsitektur" className="hover:text-white transition-colors">Arsitektur & Kinerja</a>
            <a href="#download" className="hover:text-white transition-colors">Unduh Windows</a>
            <a href="#faq" className="hover:text-white transition-colors">Tanya Jawab</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenApp}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#2A2A2A] bg-[#141414] text-white hover:bg-[#1E1E1E] hover:border-[#383838] transition-colors"
            >
              Buka Web Control
            </button>
            <a
              href="#download"
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#D4FA3C] text-black hover:bg-[#C2E82F] transition-colors"
            >
              Unduh Installer
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-14 px-4 sm:px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121212] border border-[#262626] text-[#A1A1AA] text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-[#D4FA3C]" />
          <span>Sistem Bel Otomatis Sekolah & Pesantren</span>
          <span className="text-[#3F3F46]">•</span>
          <span className="text-white font-medium">Desktop Native & Web Remote</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-5">
          Otomasi bel sekolah terjadwal.<br />
          <span className="text-[#A1A1AA]">Tepat waktu, stabil, dan berjalan offline.</span>
        </h1>

        <p className="text-[#A1A1AA] text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
          Dirancang untuk komputer audio sekolah. Mengatur jam masuk, istirahat, dan kepulangan otomatis berdasarkan profil hari, dengan cadangan kontrol cepat lewat soundboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <a
            href="#download"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#D4FA3C] text-black font-bold text-sm hover:bg-[#C2E82F] transition-colors"
          >
            <IconWindows className="w-4 h-4" />
            <span>Unduh untuk Windows (.MSI)</span>
          </a>
          <button
            type="button"
            onClick={onOpenApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#141414] border border-[#262626] text-white font-semibold text-sm hover:bg-[#1E1E1E] hover:border-[#383838] transition-colors"
          >
            <span>Buka Dashboard Remote</span>
            <IconArrowRight className="w-4 h-4 text-[#A1A1AA]" />
          </button>
        </div>

        {/* System Mockup Window */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-[#262626] bg-[#0E0E0E] overflow-hidden text-left shadow-2xl">
          <div className="px-4 py-2.5 bg-[#141414] border-b border-[#222222] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#A1A1AA]">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2A2A2A]" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2A2A2A]" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#2A2A2A]" />
              <span className="ml-2 text-[11px] text-[#D4D4D8]">Bel Sekolah Desktop &mdash; Sistem Bel Otomatis</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
              <span className="w-2 h-2 rounded-full bg-[#D4FA3C]" />
              <span>Daemon Siap</span>
            </div>
          </div>
          <div className="relative">
            <img
              src="/preview.png"
              alt="Pratinjau Antarmuka Bel Sekolah"
              className="w-full h-auto object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/muse727/Bel-Sekolah/main/docs/preview.png";
              }}
            />
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="fitur" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto border-t border-[#222222]">
        <div className="mb-10 text-center sm:text-left">
          <p className="text-[#D4FA3C] text-xs font-bold uppercase tracking-wider mb-1">Fitur Utama</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Kebutuhan operasional sekolah dalam satu sistem
          </h2>
          <p className="text-[#A1A1AA] text-xs sm:text-sm mt-1">
            Dikelola dengan tata letak ringkas yang memudahkan petugas piket maupun operator sekolah.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#0E0E0E] border border-[#222222] hover:border-[#383838] transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[#262626] flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-0.5 block">
                    {item.tag}
                  </span>
                  <h3 className="text-sm font-bold text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[#A1A1AA] text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture & Performance Metrics */}
      <section id="arsitektur" className="py-16 px-4 sm:px-6 border-t border-[#222222] bg-[#070707]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#D4FA3C] text-xs font-bold uppercase tracking-wider mb-1">Arsitektur Ringan</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Stabilitas tinggi untuk pemakaian nonstop
            </h2>
            <p className="text-[#A1A1AA] text-xs sm:text-sm max-w-xl mx-auto mt-1">
              Dibangun dengan Rust murni dan Tauri untuk memastikan beban kerja komputer audio sekolah tetap minim.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-[#222222]">
              <div className="text-3xl font-black text-white font-mono mb-1">
                &lt; 35 <span className="text-xs font-sans text-[#D4FA3C] font-semibold">MB</span>
              </div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Konsumsi RAM Standby</p>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                Jauh lebih hemat sumber daya dibanding aplikasi desktop berbasis web engine konvensional.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-[#222222]">
              <div className="text-3xl font-black text-white font-mono mb-1">
                ~0 <span className="text-xs font-sans text-[#D4FA3C] font-semibold">%</span>
              </div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Penggunaan CPU Idle</p>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                Komputer operasional atau mini PC tetap bekerja dingin tanpa mengganggu pekerjaan lain.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0E0E0E] border border-[#222222]">
              <div className="text-3xl font-black text-white font-mono mb-1">
                &lt; 15 <span className="text-xs font-sans text-[#D4FA3C] font-semibold">MB</span>
              </div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Ukuran Installer</p>
              <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                Paket instalasi terkompresi ringkas, cepat diunduh, dan tidak memerlukan runtime runtime tambahan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto border-t border-[#222222]">
        <div className="rounded-2xl p-6 sm:p-10 border border-[#262626] bg-[#0E0E0E] text-center">
          <div className="w-12 h-12 rounded-xl bg-[#161616] border border-[#262626] flex items-center justify-center mx-auto mb-4 text-[#D4FA3C]">
            <IconWindows className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Pemasangan di Komputer Windows
          </h2>
          <p className="text-[#A1A1AA] text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Mendukung Windows 10 dan 11 (arsitektur 64-bit). File setup langsung mendaftarkan service dan database lokal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <a
              href="https://github.com/muse727/Bel-Sekolah/releases"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#D4FA3C] text-black font-bold text-sm hover:bg-[#C2E82F] transition-colors"
            >
              <IconWindows className="w-4 h-4" />
              <span>Unduh Installer Resmi (.MSI)</span>
            </a>

            <button
              type="button"
              onClick={onOpenApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#141414] border border-[#262626] text-white font-semibold text-sm hover:bg-[#1E1E1E] hover:border-[#383838] transition-colors"
            >
              <span>Akses Web Dashboard</span>
              <IconArrowRight className="w-4 h-4 text-[#A1A1AA]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-6 border-t border-[#222222] text-xs text-[#A1A1AA]">
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <span className="text-white font-bold block mb-1">1. Unduh Berkas .MSI</span>
              <p>Ambil installer versi rilis terbaru dari repositori GitHub resmi.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <span className="text-white font-bold block mb-1">2. Jalankan Instalasi</span>
              <p>Buka berkas instalasi dan ikuti panduan setup sampai selesai.</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <span className="text-white font-bold block mb-1">3. Atur Jadwal Bel</span>
              <p>Buka aplikasi, sesuaikan jam jadwal per hari, dan aktifkan profil yang berlaku.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 px-4 sm:px-6 max-w-3xl mx-auto border-t border-[#222222]">
        <div className="text-center mb-8">
          <p className="text-[#D4FA3C] text-xs font-bold uppercase tracking-wider mb-1">Bantuan Informasi</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-[#222222] bg-[#0E0E0E] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 hover:bg-[#141414] transition-colors"
                >
                  <span className="font-semibold text-xs sm:text-sm text-white">{faq.q}</span>
                  <span className={`text-[#A1A1AA] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>
                    <IconChevronDown className="w-4 h-4" />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-[#A1A1AA] leading-relaxed border-t border-[#222222] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-[#222222] text-xs text-[#A1A1AA]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-white">Bel Sekolah Otomatis</span>
            <span className="mx-2 text-[#3F3F46]">&bull;</span>
            <span>Aplikasi Terbuka &amp; Mandiri</span>
          </div>

          <div className="flex items-center gap-5">
            <a href="https://github.com/muse727/Bel-Sekolah" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              GitHub Repositori
            </a>
            <a href="https://github.com/muse727/Bel-Sekolah/releases" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Rilis &amp; Unduhan
            </a>
            <button type="button" onClick={onOpenApp} className="hover:text-white transition-colors">
              Web Control
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
