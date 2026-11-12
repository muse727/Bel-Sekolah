import React, { useState } from 'react';

interface LandingPageProps {
  onOpenApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "Apakah aplikasi ini gratis untuk digunakan?",
      a: "Ya, 100% gratis dan open-source di bawah lisensi MIT. Anda bebas menggunakan, memodifikasi, dan memasangnya di sebanyak mungkin perangkat sekolah."
    },
    {
      q: "Bagaimana cara kerja jadwal otomatisnya?",
      a: "Aplikasi berjalan sebagai background service yang presisi per detik. Sistem akan mencocokkan waktu sistem komputer dengan konfigurasi jadwal harian (Senin–Kamis, Jumat, Ujian, dll.) dan memutar audio bel tanpa delay."
    },
    {
      q: "Apakah komputer sekolah harus terhubung ke internet?",
      a: "Tidak! Aplikasi desktop Windows Bel Sekolah berjalan 100% offline dengan database lokal SQLite dan file audio internal. Internet hanya dibutuhkan saat pertama kali mendownload installer."
    },
    {
      q: "Apakah bisa dipasang di laptop atau mini PC biasa?",
      a: "Sangat bisa. Aplikasi ini dibuat dengan Rust & Tauri yang luar biasa hemat sumber daya (RAM < 35MB, CPU 0% saat standby), sehingga komputer Pentium/Celeron tua sekalipun tetap lancar dan dingin."
    },
    {
      q: "Bagaimana jika ada pengumuman mendadak?",
      a: "Tersedia soundboard darurat satu-klik (sirine kebakaran, gempa, pengumuman masuk darurat) yang langsung menginterupsi audio lain seketika."
    }
  ];

  const features = [
    {
      icon: "⏰",
      tag: "Otomasi Presisi",
      title: "Jadwal Bel Akurat per Detik",
      desc: "Sinkronisasi waktu lokal presisi tinggi. Bel berbunyi tepat waktu tanpa perlu operator manual setiap pergantian jam pelajaran."
    },
    {
      icon: "🎯",
      tag: "Multi-Profil",
      title: "Profil Jadwal Fleksibel",
      desc: "Ganti jadwal dengan 1 klik antara Hari Reguler (Senin-Kamis), Khusus Jumat, Jadwal Ujian (PTS/PAS), maupun Jam Khusus Ramadhan."
    },
    {
      icon: "⚡",
      tag: "Soundboard",
      title: "Akses Cepat Pengeras Suara",
      desc: "Tombol instan untuk bel manual 3 nada, lagu Indonesia Raya, himne sekolah, hingga sirine darurat bencana."
    },
    {
      icon: "🛡️",
      tag: "Offline First",
      title: "100% Berjalan Tanpa Internet",
      desc: "Menggunakan database lokal SQLite terenkripsi ringan. Jaringan sekolah mati, bel tetap berdentang tepat waktu."
    },
    {
      icon: "🎙️",
      tag: "Audio Studio",
      title: "Pustaka Nada Bebas Kustom",
      desc: "Unggah MP3, WAV, atau rekaman suara guru piket langsung ke sistem. Atur volume audio per masing-masing bel secara terpisah."
    },
    {
      icon: "📊",
      tag: "Audit Log",
      title: "Riwayat & Monitoring Real-time",
      desc: "Pantau waktu eksekusi bel yang sudah bunyi hari ini, hitungan mundur bel berikutnya, dan histori lengkap putar nada."
    }
  ];

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased selection:bg-[#c6ff00] selection:text-black relative overflow-x-hidden">
      {/* Background radial glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#7c3aed]/20 via-[#3b82f6]/10 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[600px] h-[600px] bg-[#c6ff00]/5 blur-[150px] pointer-events-none -z-10" />

      {/* Floating Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#07090e]/75 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c6ff00] to-[#10b981] flex items-center justify-center shadow-lg shadow-[#c6ff00]/20">
              <span className="text-black font-black text-sm">🔔</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">Bel Sekolah</span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white/10 text-emerald-400 border border-white/10 tracking-wider">v0.1.4</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur Utama</a>
            <a href="#performa" className="hover:text-white transition-colors">Performa & Kecepatan</a>
            <a href="#download" className="hover:text-white transition-colors">Unduh Windows</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApp}
              className="text-xs font-medium text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 bg-white/5"
            >
              <span>Buka Web App</span>
              <span className="text-slate-500">↗</span>
            </button>
            <a
              href="#download"
              className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[#c6ff00] text-black hover:bg-[#b2e600] transition-all shadow-md shadow-[#c6ff00]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Unduh Gratis
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 text-center max-w-4xl mx-auto">
        {/* Subtle pill pill badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-8 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#c6ff00] animate-pulse" />
          <span>Sistem Bel Otomatis Modern untuk Sekolah & Pesantren</span>
          <span className="text-white/30">•</span>
          <span className="text-emerald-400 font-semibold">Windows Desktop Native</span>
        </div>

        {/* Big Bold Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Waktu sekolah tertib.<br />
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Tanpa ribet bel manual lagi.
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Aplikasi bel otomatis berbasis desktop Windows & web dengan multi-profil jadwal harian, audio kustom, soundboard darurat, dan keandalan 100% offline.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <a
            href="#download"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#c6ff00] to-[#99e600] text-black font-bold text-sm shadow-xl shadow-[#c6ff00]/20 hover:shadow-[#c6ff00]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802"/>
            </svg>
            <span>Unduh untuk Windows (.MSI)</span>
          </a>
          <button
            onClick={onOpenApp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-sm border border-white/10 transition-all hover:border-white/20"
          >
            <span>Coba Versi Web Langsung</span>
            <span className="text-slate-400">→</span>
          </button>
        </div>

        {/* App Showcase Mockup Window with Glowing Backlight */}
        <div className="relative max-w-5xl mx-auto mt-6">
          {/* Backlight Glow Behind App Preview */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-[#7c3aed] via-[#38bdf8] to-[#c6ff00] rounded-2xl blur-xl opacity-30 -z-10" />

          {/* Window Container */}
          <div className="rounded-2xl border border-white/15 bg-[#0b0f17] shadow-2xl overflow-hidden text-left">
            {/* macOS / Window Titlebar */}
            <div className="px-4 py-3 bg-[#0f141f] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-slate-400">Bel Sekolah SIT AL MUBARAK — Desktop Engine v0.1.4</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-slate-400 font-medium">Layanan Aktif (Online/Offline)</span>
              </div>
            </div>

            {/* Dashboard Screenshot Graphic */}
            <div className="relative group overflow-hidden">
              <img
                src="/preview.png"
                alt="Tampilan Antarmuka Bel Sekolah"
                className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.01]"
                onError={(e) => {
                  // Fallback jika path beda
                  (e.target as HTMLImageElement).src = "https://raw.githubusercontent.com/muse727/Bel-Sekolah/main/docs/preview.png";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-transparent pointer-events-none opacity-40" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid: "Semua yang sering kamu lirik, di satu tempat" */}
      <section id="fitur" className="py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[#c6ff00] text-xs font-bold uppercase tracking-widest mb-3">Fitur Lengkap</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Semua yang dibutuhkan sekolah,<br />tanpa kerumitan.
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mt-3">
            Didesain khusus untuk operator piket, tata usaha, dan staf pengelola bel di sekolah modern.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all duration-300 hover:bg-white/[0.04] group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 group-hover:bg-[#c6ff00]/10 transition-all">
                  {item.icon}
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#c6ff00] mb-1 block">
                    {item.tag}
                  </span>
                  <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-[#c6ff00] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Section: "Saking ringannya, kamu bakal lupa aplikasi ini ada" */}
      <section id="performa" className="py-20 px-6 border-y border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Engine Rust + Tauri</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Saking ringannya, kamu bakal lupa aplikasi ini ada.
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mt-3">
              Dibangun dari nol menggunakan Rust murni untuk stabilitas maksimum 24/7 tanpa memory leak dan tanpa beban berat Electron.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-white mb-2 font-mono tracking-tight">
                ~28<span className="text-sm font-sans text-emerald-400 font-semibold ml-1">MB</span>
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Konsumsi RAM Standby</p>
              <p className="text-[11px] text-slate-500">10x lebih hemat dibanding aplikasi Electron biasa.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-white mb-2 font-mono tracking-tight">
                0<span className="text-sm font-sans text-[#c6ff00] font-semibold ml-1">%</span>
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Beban CPU Normal</p>
              <p className="text-[11px] text-slate-500">PC tua kantor tidak akan panas atau lemot sama sekali.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="text-4xl sm:text-5xl font-black text-white mb-2 font-mono tracking-tight">
                &lt;15<span className="text-sm font-sans text-sky-400 font-semibold ml-1">MB</span>
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Ukuran Installer MSI</p>
              <p className="text-[11px] text-slate-500">Download beres dalam 5 detik di koneksi sekolah.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section (Matching Nusa Style Box) */}
      <section id="download" className="py-24 px-6 max-w-4xl mx-auto">
        <div className="relative rounded-3xl p-8 sm:p-12 border border-white/15 bg-gradient-to-b from-[#111624] to-[#090d16] text-center shadow-2xl overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#c6ff00]/10 blur-[80px] pointer-events-none" />

          {/* App Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#c6ff00] to-[#10b981] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[#c6ff00]/25">
            <span className="text-3xl">🔔</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Dapatkan Bel Sekolah untuk Windows
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            Mendukung Windows 10 & 11 (64-bit). Siap pakai dalam 1 menit dengan installer MSI resmi.
          </p>

          {/* Direct Download Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <a
              href="https://github.com/muse727/Bel-Sekolah/releases"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#c6ff00] text-black font-extrabold text-sm shadow-xl shadow-[#c6ff00]/20 hover:bg-[#b2e600] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4h-13.051M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.802"/>
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Windows 10 / 11</div>
                <div>Unduh Installer (.MSI)</div>
              </div>
            </a>

            <button
              onClick={onOpenApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm border border-white/10 transition-all hover:border-white/20"
            >
              <span>Akses Web Cloud</span>
              <span className="text-slate-400">↗</span>
            </button>
          </div>

          {/* Steps & Release Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-6 border-t border-white/10 text-xs text-slate-400">
            <div>
              <span className="text-white font-semibold block mb-1">1. Unduh File .MSI</span>
              <p>Klik tombol rilis di atas dan unduh file installer versi terbaru.</p>
            </div>
            <div>
              <span className="text-white font-semibold block mb-1">2. Pasang di Komputer</span>
              <p>Buka installer. Jika muncul SmartScreen, klik <em>More info</em> lalu <em>Run anyway</em>.</p>
            </div>
            <div>
              <span className="text-white font-semibold block mb-1">3. Otomatis Siap Bunyi</span>
              <p>Aplikasi otomatis aktif dengan jadwal reguler SIT AL MUBARAK.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-6 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#c6ff00] text-xs font-bold uppercase tracking-widest mb-2">Tanya Jawab</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-semibold text-sm text-white">{faq.q}</span>
                  <span className={`text-slate-400 transition-transform duration-200 text-lg ${isOpen ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">Bel Sekolah SIT AL MUBARAK</span>
            <span>•</span>
            <span>Open Source Project</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://github.com/muse727/Bel-Sekolah" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors">
              GitHub Repo
            </a>
            <a href="https://github.com/muse727/Bel-Sekolah/releases" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition-colors">
              Rilis & Unduhan
            </a>
            <button onClick={onOpenApp} className="hover:text-slate-300 transition-colors text-left">
              Web Dashboard
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
