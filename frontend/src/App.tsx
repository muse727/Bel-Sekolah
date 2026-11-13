import React, { useEffect, useState, useRef, useId, useCallback } from 'react';
import { LandingPage } from './components/LandingPage';

/**
 * Mode Remote: web dihosting di Vercel, menerima target PC sekolah via
 * query param ?target=https://xxx.trycloudflare.com&key=ABCD1234.
 * Semua request API diteruskan ke target tersebut dengan header X-Access-Token.
 */
function resolveRemoteTarget(): { base: string; token: string | null } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const target = params.get('target');
  if (!target || !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(target.trim())) return null;
  // Token dipersist di localStorage agar sesi tetap hidup saat refresh/hp lock
  let token = params.get('key');
  if (token) localStorage.setItem('bel_remote_token', token);
  else token = localStorage.getItem('bel_remote_token');
  return { base: target.trim().replace(/\/$/, ''), token: token || null };
}

const REMOTE = resolveRemoteTarget();

const IS_DESKTOP = typeof window !== 'undefined' &&
  (window.location.protocol === 'tauri:' ||
    (window as any).__TAURI_INTERNALS__ !== undefined);

const API_BASE = REMOTE ? REMOTE.base : IS_DESKTOP ? 'http://127.0.0.1:8080' : '';

/** Helper: bungkus path API dengan base yang benar untuk tiap lingkungan. */
const api = (path: string) => `${API_BASE}${path}`;

/** Header otentikasi remote (dikirim hanya saat mode remote aktif). */
const remoteHeaders = (): Record<string, string> =>
  REMOTE && REMOTE.token ? { 'X-Access-Token': REMOTE.token } : {};

/** Fetch pembungkus: base otomatis + header token saat mode remote. */
const apiFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(api(path), {
    ...init,
    headers: { ...remoteHeaders(), ...(init?.headers || {}) },
  });

interface Profile {
  id: number;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: number;
  item_count: number;
}

interface ScheduleItem {
  id: number;
  profile_id: number;
  day_of_week: string;
  bell_time: string;
  event_name: string;
  audio_id: number;
  volume: number;
  is_enabled: number;
  audio_title: string;
  audio_file: string;
}

interface SoundboardButton {
  id: number;
  label: string;
  audio_id: number;
  button_color: string;
  sort_order: number;
  audio_title: string;
  filename: string;
  category: string;
}

interface BellLog {
  id: number;
  schedule_item_id: number | null;
  audio_id: number;
  event_title: string;
  trigger_source: string;
  played_at: string;
  status: string;
  audio_title: string | null;
}

interface AudioItem {
  id: number;
  title: string;
  filename: string;
  duration_seconds: number;
  category: string;
}

interface SystemStatus {
  current_time: string;
  current_date: string;
  current_day: string;
  day_code: string;
  active_profile: Profile | null;
  next_bell: {
    id: number;
    audio_id: number;
    event_name: string;
    bell_time: string;
    audio_title: string;
    filename: string;
    remaining_seconds: number;
  } | null;
  stats: {
    total_today: number;
    completed_today: number;
    remaining_today: number;
    progress_percent: number;
  };
  settings: {
    school_name: string;
    school_logo?: string | null;
    master_volume: number;
    mute_mode: boolean;
    remote_port: string;
    timezone_name: string;
    timezone_offset_hours: number;
    time_format: string;
  };
}

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  message: string;
}

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}

/* Crisp SVG Icons (Zero Emoticons) */
function IconPlay({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );
}

function IconStop({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function IconMusic({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconTrash({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconClose({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconUpload({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

function IconArrowRight({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function IconCheckCircle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconAlertTriangle({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconInfo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function IconPower({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
    </svg>
  );
}

function IconChevronLeft({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconSun({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function IconMoon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

/* Horizontal Scroll Container: No visible scrollbar, supports mouse wheel, drag, touch, and arrow buttons when overflowing */
function HorizontalScrollStrip({
  children,
  className = '',
  innerClassName = '',
  ariaLabel,
  asNav = false,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  ariaLabel?: string;
  asNav?: boolean;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragState = useRef<{ active: boolean; startX: number; scrollLeft: number; moved: boolean }>({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  const updateScrollIndicators = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollIndicators);
    ro.observe(el);
    window.addEventListener('resize', updateScrollIndicators);

    const handleNativeWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScrollIndicators);
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [updateScrollIndicators, children]);

  const scrollByStep = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 200, behavior: 'smooth' });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || el.scrollWidth <= el.clientWidth + 2) return;
    dragState.current = {
      active: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || !dragState.current.active) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 5) {
      dragState.current.moved = true;
      el.scrollLeft = dragState.current.scrollLeft - walk;
    }
  };

  const stopDrag = () => {
    dragState.current.active = false;
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  const Tag = asNav ? 'nav' : 'div';

  return (
    <div className={`relative flex items-center min-w-0 ${className}`}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          aria-label="Geser ke kiri"
          className="absolute left-1 z-10 w-7 h-7 rounded-full bg-[#10130E]/95 border border-[#323C2B] text-[#D4FA3C] hover:bg-[#1E251A] flex items-center justify-center shadow-lg transition-colors"
        >
          <IconChevronLeft className="w-4 h-4" />
        </button>
      )}

      <Tag
        ref={scrollerRef as React.RefObject<any>}
        aria-label={ariaLabel}
        onScroll={updateScrollIndicators}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onClickCapture={handleClickCapture}
        className={`flex items-center overflow-x-auto no-scrollbar scroll-smooth select-none w-full ${
          canScrollLeft ? 'pl-8' : ''
        } ${canScrollRight ? 'pr-8' : ''} ${innerClassName}`}
      >
        {children}
      </Tag>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          aria-label="Geser ke kanan"
          className="absolute right-1 z-10 w-7 h-7 rounded-full bg-[#10130E]/95 border border-[#323C2B] text-[#D4FA3C] hover:bg-[#1E251A] flex items-center justify-center shadow-lg transition-colors"
        >
          <IconChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* Skeleton Loader Views */
function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <div className="lg:col-span-5 bg-[#171A15] border border-[#272E22] p-6 sm:p-7 rounded-3xl flex flex-col justify-between min-h-[290px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-36 rounded-full skeleton-shimmer" />
            <div className="h-6 w-20 rounded-full skeleton-shimmer" />
          </div>
          <div className="h-12 w-32 rounded-xl skeleton-shimmer" />
          <div className="h-7 w-64 rounded-xl skeleton-shimmer" />
          <div className="h-4 w-48 rounded-lg skeleton-shimmer" />
        </div>
        <div className="pt-6 border-t border-[#22281E] flex items-center justify-between">
          <div className="h-8 w-40 rounded-lg skeleton-shimmer" />
          <div className="h-9 w-28 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#171A15] border border-[#272E22] p-5 rounded-3xl flex flex-col justify-between min-h-[156px]">
          <div className="space-y-3">
            <div className="h-4 w-40 rounded skeleton-shimmer" />
            <div className="h-9 w-36 rounded-lg skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full skeleton-shimmer" />
            <div className="h-3 w-full rounded skeleton-shimmer" />
          </div>
        </div>

        <div className="bg-[#171A15] border border-[#272E22] p-5 rounded-3xl space-y-2.5">
          <div className="h-4 w-32 rounded skeleton-shimmer mb-3" />
          <div className="h-9 w-full rounded-xl skeleton-shimmer" />
          <div className="h-9 w-full rounded-xl skeleton-shimmer" />
          <div className="h-9 w-full rounded-xl skeleton-shimmer" />
        </div>

        <div className="sm:col-span-2 bg-[#171A15] border border-[#272E22] p-5 rounded-3xl space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-48 rounded skeleton-shimmer" />
            <div className="h-4 w-36 rounded skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-2xl skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulesSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-[#171A15] border border-[#272E22] p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-[76px] h-[64px] rounded-xl skeleton-shimmer" />
            <div className="space-y-2">
              <div className="h-5 w-44 rounded-lg skeleton-shimmer" />
              <div className="h-3.5 w-32 rounded skeleton-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
            <div className="w-14 h-8 rounded-xl skeleton-shimmer" />
            <div className="w-8 h-8 rounded-xl skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#171A15] border border-[#272E22] p-5 rounded-2xl space-y-4">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded skeleton-shimmer" />
            <div className="h-6 w-36 rounded-lg skeleton-shimmer" />
            <div className="h-3.5 w-44 rounded skeleton-shimmer" />
          </div>
          <div className="h-10 w-full rounded-xl skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const search = window.location.search;
      if (path === '/app' || search.includes('view=app')) {
        return 'app';
      }
    }
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'schedules' | 'soundboard' | 'audios' | 'settings' | 'logs'>('overview');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [soundboard, setSoundboard] = useState<SoundboardButton[]>([]);
  const [logs, setLogs] = useState<BellLog[]>([]);
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isActivatingProfile, setIsActivatingProfile] = useState<boolean>(false);

  // Theme mode: dark | light (default from localStorage or dark)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bel_theme_mode');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setThemeMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('bel_theme_mode', next);
        document.documentElement.setAttribute('data-theme', next);
      }
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const [playingTrack, setPlayingTrack] = useState<{ title: string } | null>(null);

  // School name edit state in settings
  const [schoolNameInput, setSchoolNameInput] = useState<string>('');
  const [isSavingSchoolName, setIsSavingSchoolName] = useState<boolean>(false);

  // Pairing ke server pusat (desktop)
  const [pairing, setPairing] = useState<{enabled: boolean; last_sync_at: string | null; last_sync_ok: boolean; error: string | null} | null>(null);
  const [pairingUrl, setPairingUrl] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingEnabled, setPairingEnabled] = useState(false);
  const [isSavingPairing, setIsSavingPairing] = useState(false);

  // Remote tunnel (akses dari HP via QR Code / Cloudflare Quick Tunnel)
  const [tunnel, setTunnel] = useState<{ running: boolean; public_url: string | null; expires_at: string | null; access_token: string | null } | null>(null);
  const [isTunnelLoading, setIsTunnelLoading] = useState(false);
  const [tunnelQrDataUrl, setTunnelQrDataUrl] = useState<string | null>(null);

  const refreshPairingStatus = async () => {
    try {
      const res = await apiFetch('/api/pairing/status');
      if (res.ok) {
        const data = await res.json();
        setPairing(data);
        setPairingEnabled(Boolean(data.enabled));
      }
    } catch { /* desktop offline */ }
  };

  const refreshTunnelStatus = async () => {
    try {
      const res = await apiFetch('/api/tunnel/status');
      if (res.ok) setTunnel(await res.json());
    } catch { /* desktop offline */ }
  };

  const handleStartTunnel = async () => {
    setIsTunnelLoading(true);
    try {
      const res = await apiFetch('/api/tunnel/start', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.public_url) {
        setTunnel({ running: true, public_url: data.public_url, expires_at: data.expires_at, access_token: data.access_token });
        pushToast('success', 'Akses Remote Aktif', 'Scan QR Code di bawah dengan HP untuk membuka dashboard remote.');
      } else {
        pushToast('error', 'Gagal Mengaktifkan Remote', data.error || 'Pastikan komputer terhubung ke internet.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat menghubungi mesin bel lokal.');
    } finally {
      setIsTunnelLoading(false);
    }
  };

  const handleStopTunnel = async () => {
    setIsTunnelLoading(true);
    try {
      const res = await apiFetch('/api/tunnel/stop', { method: 'POST' });
      if (res.ok) {
        setTunnel({ running: false, public_url: null, expires_at: null, access_token: null });
        setTunnelQrDataUrl(null);
        pushToast('info', 'Akses Remote Dimatikan', 'Semua sesi HP yang terhubung sudah hangus dan harus pairing ulang.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat menghubungi mesin bel lokal.');
    } finally {
      setIsTunnelLoading(false);
    }
  };

  // Generate QR Code setiap kali tunnel aktif (web Vercel + target + token)
  useEffect(() => {
    const VERCEL_DASH = 'https://bel-sekolah-taupe.vercel.app/';
    if (tunnel?.running && tunnel.public_url && tunnel.access_token) {
      import('qrcode').then(QR => {
        QR.default.toDataURL(`${VERCEL_DASH}?target=${encodeURIComponent(tunnel.public_url!)}&key=${tunnel.access_token}`, {
          width: 220,
          margin: 1,
          color: { dark: '#0E100D', light: '#F4F6F0' },
        })
          .then(setTunnelQrDataUrl)
          .catch(() => setTunnelQrDataUrl(null));
      }).catch(() => setTunnelQrDataUrl(null));
    } else if (!tunnel?.running) {
      setTunnelQrDataUrl(null);
    }
  }, [tunnel]);

  useEffect(() => {
    refreshPairingStatus();
    refreshTunnelStatus();
    const t = setInterval(refreshPairingStatus, 30000);
    return () => clearInterval(t);
  }, []);

  const handleSavePairing = async (enabled: boolean) => {
    setIsSavingPairing(true);
    try {
      const res = await apiFetch('/api/pairing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ central_server_url: pairingUrl, pairing_code: pairingCode, enabled }),
      });
      if (res.ok) {
        const data = await res.json();
        setPairing(data);
        setPairingEnabled(Boolean(data.enabled));
        pushToast('success', 'Pairing Disimpan', enabled ? 'Sinkronisasi ke server pusat diaktifkan.' : 'Sinkronisasi dimatikan.');
      } else {
        pushToast('error', 'Gagal', 'Tidak dapat menyimpan konfigurasi pairing.');
      }
    } catch {
      pushToast('error', 'Gagal', 'Endpoint pairing tidak tersedia.');
    } finally {
      setIsSavingPairing(false);
    }
  };

  // Toast & Custom Confirm Modal states
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [isConfirmBusy, setIsConfirmBusy] = useState<boolean>(false);

  // Filter profil & hari pada menu jadwal
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('SEMUA');

  // Form tambah jadwal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newBellTime, setNewBellTime] = useState('07:00');
  const [newEventName, setNewEventName] = useState('');
  const [newAudioId, setNewAudioId] = useState<number>(1);
  const [newDayOfWeek, setNewDayOfWeek] = useState('SEMUA_HARI');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Form custom soundboard & audio upload
  const [showAddButtonModal, setShowAddButtonModal] = useState<boolean>(false);
  const [newButtonLabel, setNewButtonLabel] = useState('');
  const [newButtonAudioId, setNewButtonAudioId] = useState<number>(1);
  const [newButtonColor, setNewButtonColor] = useState('lime');
  const [isSavingButton, setIsSavingButton] = useState(false);

  const [showUploadAudioModal, setShowUploadAudioModal] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('CUSTOM');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Accessible IDs
  const eventNameId = useId();
  const bellTimeId = useId();
  const dayOfWeekId = useId();
  const audioSelectId = useId();
  const btnLabelId = useId();
  const btnAudioId = useId();
  const btnColorId = useId();
  const upTitleId = useId();
  const upCatId = useId();
  const upFileId = useId();

  const pushToast = useCallback((variant: ToastVariant, title: string, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev.slice(-3), { id, variant, title, message }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load status realtime tiap 1 detik (gunakan functional update agar tidak menimpa pilihan profil user!)
  // Jam lokal komputer (untuk mode offline / desktop tanpa koneksi server)
  const [localClock, setLocalClock] = useState<{ time: string; day: string; date: string } | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  useEffect(() => {
    const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const tick = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setLocalClock({
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
        day: DAY_NAMES[now.getDay()],
        date: `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`,
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/status');
      if (res.ok) {
        const data: SystemStatus = await res.json();
        setStatus(data);
        setServerOnline(true);
        setSelectedProfileId(prev => prev ?? (data.active_profile ? data.active_profile.id : null));
        setSchoolNameInput(prev => prev === '' ? data.settings.school_name : prev);
      }
    } catch {
      // noop on transient polling error
    }
  }, []);

  const fetchFullData = useCallback(async () => {
    try {
      const [resProfiles, resSchedules, resSb, resLogs, resAudios] = await Promise.all([
        apiFetch('/api/profiles'),
        apiFetch('/api/schedules'),
        apiFetch('/api/soundboard'),
        apiFetch('/api/logs'),
        apiFetch('/api/audios'),
      ]);

      if (resProfiles.ok) {
        const p: Profile[] = await resProfiles.json();
        setProfiles(p);
        setSelectedProfileId(prev => prev ?? (p.find(x => x.is_active === 1)?.id ?? p[0]?.id ?? null));
      }
      if (resSchedules.ok) setSchedules(await resSchedules.json());
      if (resSb.ok) setSoundboard(await resSb.json());
      if (resLogs.ok) setLogs(await resLogs.json());
      if (resAudios.ok) setAudios(await resAudios.json());
    } catch {
      setServerOnline(false);
      pushToast('error', 'Gagal Memuat Data', 'Tidak dapat terhubung ke server bel sekolah.');
    } finally {
      setIsInitialLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchStatus();
    fetchFullData();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchFullData]);

  const refreshSchedules = async () => {
    const res = await apiFetch('/api/schedules');
    if (res.ok) setSchedules(await res.json());
  };

  const refreshSoundboard = async () => {
    const res = await apiFetch('/api/soundboard');
    if (res.ok) setSoundboard(await res.json());
  };

  const refreshAudios = async () => {
    const res = await apiFetch('/api/audios');
    if (res.ok) setAudios(await res.json());
  };

  const handleActivateProfile = async (profileId: number, profileName?: string) => {
    setIsActivatingProfile(true);
    try {
      const res = await apiFetch(`/api/profiles/${profileId}/activate`, { method: 'POST' });
      if (res.ok) {
        await Promise.all([fetchStatus(), fetchFullData()]);
        pushToast(
          'success',
          'Profil Jadwal Diaktifkan',
          `${profileName || 'Profil terpilih'} sekarang menjadi jadwal bel aktif sekolah.`
        );
      } else {
        const err = await res.json().catch(() => ({}));
        pushToast('error', 'Gagal Mengaktifkan Profil', err.error || 'Terjadi kesalahan pada server.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat mengaktifkan profil jadwal saat ini.');
    } finally {
      setIsActivatingProfile(false);
    }
  };

  const handleTriggerBell = async (audioId: number, labelTitle: string, filename: string) => {
    try {
      const res = await apiFetch(`/api/trigger-bell/${audioId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.muted) {
          pushToast('warning', 'Mode Senyap Aktif', `"${labelTitle}" dicatat ke riwayat tanpa membunyikan speaker.`);
        } else {
          if (audioPlayerRef.current) {
            audioPlayerRef.current.src = `${API_BASE}/audio/${filename}`;
            audioPlayerRef.current.volume = (status?.settings.master_volume || 90) / 100;
            audioPlayerRef.current.play().catch(() => {
              pushToast('warning', 'Izin Audio Browser', 'Browser memblokir autoplay audio. Pastikan tab tidak di-mute.');
            });
          }
          setPlayingTrack({ title: data.title });
          pushToast('info', 'Audio Diputar', `Memutar "${data.title}" ke pengeras suara.`);
        }
        fetchStatus();
        apiFetch('/api/logs').then(r => r.json()).then(setLogs).catch(() => {});
      } else {
        pushToast('error', 'Gagal Memutar Audio', 'File suara tidak ditemukan di server.');
      }
    } catch {
      pushToast('error', 'Koneksi Terputus', 'Gagal mengirim perintah pemutaran suara.');
    }
  };

  const handleToggleSchedule = async (item: ScheduleItem) => {
    try {
      const res = await apiFetch(`/api/schedules/${item.id}/toggle`, { method: 'POST' });
      if (res.ok) {
        await refreshSchedules();
        fetchStatus();
        const nextState = item.is_enabled === 1 ? 'dinonaktifkan' : 'diaktifkan';
        pushToast('success', 'Status Jadwal Diperbarui', `Jam ${item.bell_time} (${item.event_name}) berhasil ${nextState}.`);
      } else {
        pushToast('error', 'Gagal Mengubah Status', 'Item jadwal tidak dapat diperbarui.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat mengubah status jadwal.');
    }
  };

  const requestDeleteSchedule = (item: ScheduleItem) => {
    setConfirmDialog({
      title: 'Hapus Jam Bel',
      message: `Hapus jadwal "${item.event_name}" pada jam ${item.bell_time}? Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: 'Ya, Hapus Jadwal',
      variant: 'danger',
      onConfirm: async () => {
        const res = await apiFetch(`/api/schedules/${item.id}`, { method: 'DELETE' });
        if (res.ok) {
          await Promise.all([refreshSchedules(), fetchFullData()]);
          fetchStatus();
          pushToast('success', 'Jadwal Dihapus', `Jam ${item.bell_time} (${item.event_name}) telah dihapus.`);
        } else {
          pushToast('error', 'Gagal Menghapus', 'Item jadwal gagal dihapus.');
        }
      },
    });
  };

  const handleToggleMute = async () => {
    if (!status) return;
    const newMute = !status.settings.mute_mode;
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mute_mode: newMute }),
      });
      if (res.ok) {
        await fetchStatus();
        pushToast(
          newMute ? 'warning' : 'success',
          newMute ? 'Mode Senyap Diaktifkan' : 'Audio Diaktifkan Kembali',
          newMute ? 'Bel terjadwal akan dicatat tanpa bersuara.' : 'Pengeras suara siap membunyikan jadwal.'
        );
      }
    } catch {
      pushToast('error', 'Gagal Mengubah Mode', 'Tidak dapat memperbarui mode senyap.');
    }
  };

  const handleSaveSchoolName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolNameInput.trim()) {
      pushToast('warning', 'Nama Sekolah Kosong', 'Nama sekolah tidak boleh kosong.');
      return;
    }
    setIsSavingSchoolName(true);
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_name: schoolNameInput.trim() }),
      });
      if (res.ok) {
        await fetchStatus();
        pushToast('success', 'Nama Sekolah Disimpan', `Nama sekolah diperbarui menjadi "${schoolNameInput.trim()}".`);
      } else {
        pushToast('error', 'Gagal Menyimpan', 'Server menolak perubahan nama sekolah.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat memperbarui nama sekolah.');
    } finally {
      setIsSavingSchoolName(false);
    }
  };

  const handleUploadLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile) {
      pushToast('warning', 'Pilih File Logo', 'Pilih file gambar logo sekolah terlebih dahulu.');
      return;
    }
    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile);
    try {
      const res = await apiFetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setLogoFile(null);
        await fetchStatus();
        pushToast('success', 'Logo Sekolah Diperbarui', 'Logo sekolah baru berhasil diunggah.');
      } else {
        const err = await res.json().catch(() => ({}));
        pushToast('error', 'Gagal Upload Logo', err.error || 'Pastikan file gambar valid (PNG/JPG/WEBP).');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat mengunggah logo sekolah.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    setConfirmDialog({
      title: 'Kembalikan Logo Default',
      message: 'Reset logo sekolah kembali ke logo default sistem?',
      confirmLabel: 'Reset Logo',
      variant: 'primary',
      onConfirm: async () => {
        const res = await apiFetch('/api/settings/logo', { method: 'DELETE' });
        if (res.ok) {
          await fetchStatus();
          pushToast('success', 'Logo Direset', 'Logo sekolah dikembalikan ke default.');
        } else {
          pushToast('error', 'Gagal Reset Logo', 'Tidak dapat mereset logo saat ini.');
        }
      },
    });
  };

  const handleSaveSettings = async (payload: Record<string, unknown>, feedbackMessage?: string) => {
    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchStatus();
        if (feedbackMessage) {
          pushToast('success', 'Pengaturan Disimpan', feedbackMessage);
        }
      } else {
        pushToast('error', 'Gagal Menyimpan', 'Server menolak perubahan pengaturan.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat menyimpan pengaturan sistem.');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfileId) {
      pushToast('warning', 'Pilih Profil Dulu', 'Pilih profil jadwal sebelum menambahkan jam bel.');
      return;
    }
    if (!newEventName.trim()) {
      pushToast('warning', 'Nama Kegiatan Kosong', 'Isi nama kegiatan bel terlebih dahulu.');
      return;
    }

    setIsSavingSchedule(true);
    try {
      const res = await apiFetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: selectedProfileId,
          day_of_week: newDayOfWeek,
          bell_time: newBellTime,
          event_name: newEventName.trim(),
          audio_id: newAudioId,
          volume: 100,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewEventName('');
        await Promise.all([refreshSchedules(), fetchFullData()]);
        fetchStatus();
        pushToast('success', 'Jadwal Ditambahkan', `Jam ${newBellTime} berhasil ditambahkan ke ${currentProfileObj?.name || 'profil'}.`);
      } else {
        const err = await res.json().catch(() => ({}));
        pushToast('error', 'Gagal Menambah Jadwal', err.error || 'Periksa kembali isian formulir.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat menyimpan jadwal baru.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleCreateButton = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newButtonLabel.trim()) {
      pushToast('warning', 'Label Kosong', 'Masukkan label teks untuk tombol baru.');
      return;
    }

    setIsSavingButton(true);
    try {
      const res = await apiFetch('/api/soundboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newButtonLabel.trim(),
          audio_id: newButtonAudioId,
          button_color: newButtonColor,
        }),
      });

      if (res.ok) {
        setShowAddButtonModal(false);
        const createdLabel = newButtonLabel.trim();
        setNewButtonLabel('');
        await refreshSoundboard();
        pushToast('success', 'Tombol Ditambahkan', `Tombol cepat "${createdLabel}" siap digunakan.`);
      } else {
        const err = await res.json().catch(() => ({}));
        pushToast('error', 'Gagal Membuat Tombol', err.error || 'Terjadi kesalahan saat menyimpan.');
      }
    } catch {
      pushToast('error', 'Koneksi Gagal', 'Tidak dapat menambahkan tombol soundboard.');
    } finally {
      setIsSavingButton(false);
    }
  };

  const requestDeleteButton = (btn: SoundboardButton) => {
    setConfirmDialog({
      title: 'Hapus Tombol Soundboard',
      message: `Hapus tombol cepat "${btn.label}" dari papan soundboard? File audio aslinya tetap aman di Pustaka Suara.`,
      confirmLabel: 'Hapus Tombol',
      variant: 'danger',
      onConfirm: async () => {
        const res = await apiFetch(`/api/soundboard/${btn.id}`, { method: 'DELETE' });
        if (res.ok) {
          await refreshSoundboard();
          pushToast('success', 'Tombol Dihapus', `Tombol "${btn.label}" berhasil dihapus.`);
        } else {
          pushToast('error', 'Gagal Menghapus', 'Tombol soundboard tidak ditemukan.');
        }
      },
    });
  };

  const handleUploadAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      pushToast('warning', 'File Belum Dipilih', 'Pilih file audio (.mp3 atau .wav) terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('title', uploadTitle.trim() || uploadFile.name);
    formData.append('category', uploadCategory);
    formData.append('file', uploadFile);

    try {
      const res = await apiFetch('/api/audios/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const savedTitle = uploadTitle.trim() || uploadFile.name;
        setShowUploadAudioModal(false);
        setUploadTitle('');
        setUploadFile(null);
        await refreshAudios();
        pushToast('success', 'Audio Berhasil Diunggah', `"${savedTitle}" telah masuk ke Pustaka Suara.`);
      } else {
        const err = await res.json().catch(() => ({}));
        pushToast('error', 'Upload Gagal', err.error || 'Pastikan file berformat MP3 atau WAV.');
      }
    } catch {
      pushToast('error', 'Upload Terputus', 'Terjadi kesalahan jaringan saat mengunggah file audio.');
    } finally {
      setIsUploading(false);
    }
  };

  const requestDeleteAudio = (audio: AudioItem) => {
    setConfirmDialog({
      title: 'Hapus File Suara',
      message: `Hapus audio "${audio.title}" (${audio.filename}) secara permanen dari Pustaka Suara?`,
      confirmLabel: 'Ya, Hapus Permanen',
      variant: 'danger',
      onConfirm: async () => {
        const res = await apiFetch(`/api/audios/${audio.id}`, { method: 'DELETE' });
        if (res.ok) {
          await Promise.all([refreshAudios(), refreshSoundboard(), refreshSchedules()]);
          pushToast('success', 'Audio Dihapus', `"${audio.title}" telah dihapus dari server.`);
        } else {
          pushToast('error', 'Gagal Menghapus', 'File suara gagal dihapus.');
        }
      },
    });
  };

  const executeConfirmDialog = async () => {
    if (!confirmDialog) return;
    setIsConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setIsConfirmBusy(false);
    }
  };

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filter jadwal berdasarkan profil terpilih dan hari
  const filteredSchedules = schedules.filter(s => {
    if (selectedProfileId !== null && s.profile_id !== selectedProfileId) return false;
    if (selectedDayFilter !== 'SEMUA') {
      return s.day_of_week === selectedDayFilter || s.day_of_week === 'SEMUA_HARI';
    }
    return true;
  });

  const currentProfileObj = profiles.find(p => p.id === selectedProfileId) || status?.active_profile || null;
  const isSelectedProfileActive = currentProfileObj ? currentProfileObj.is_active === 1 : false;

  if (currentView === 'landing') {
    return (
      <LandingPage
        onOpenApp={() => {
          setCurrentView('app');
          window.history.pushState({}, '', '/app');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0E100D] text-[#F4F6F0] p-3 sm:p-6 lg:p-8 flex flex-col justify-between selection:bg-[#D4FA3C] selection:text-[#0E100D]">
      <audio
        ref={audioPlayerRef}
        onEnded={() => setPlayingTrack(null)}
        onError={() => setPlayingTrack(null)}
      />

      {/* CUSTOM TOAST NOTIFICATION STACK */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2.5 w-[calc(100%-2rem)] sm:w-96 pointer-events-none"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto animate-toast-in rounded-2xl border p-4 shadow-2xl backdrop-blur-md flex items-start gap-3 ${
              toast.variant === 'success'
                ? 'bg-[#151D13]/95 border-[#3A5326] text-[#F4F6F0]'
                : toast.variant === 'error'
                ? 'bg-[#261313]/95 border-[#6E2626] text-[#F4F6F0]'
                : toast.variant === 'warning'
                ? 'bg-[#251D11]/95 border-[#694B1A] text-[#F4F6F0]'
                : 'bg-[#171C16]/95 border-[#313B2A] text-[#F4F6F0]'
            }`}
          >
            <div
              className={`mt-0.5 shrink-0 ${
                toast.variant === 'success'
                  ? 'text-[#D4FA3C]'
                  : toast.variant === 'error'
                  ? 'text-[#FCA5A5]'
                  : toast.variant === 'warning'
                  ? 'text-[#FCD34D]'
                  : 'text-[#D4FA3C]'
              }`}
            >
              {toast.variant === 'success' && <IconCheckCircle className="w-5 h-5" />}
              {(toast.variant === 'error' || toast.variant === 'warning') && <IconAlertTriangle className="w-5 h-5" />}
              {toast.variant === 'info' && <IconInfo className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-tight text-[#F4F6F0]">{toast.title}</p>
              <p className="text-xs text-[#A9B2A3] mt-0.5 leading-relaxed">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Tutup notifikasi"
              className="text-[#9CA695] hover:text-[#F4F6F0] p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="max-w-7xl w-full mx-auto space-y-6">
        {/* HEADER TOP BAR */}
        <header className="space-y-4 border-b border-[#22281E] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {!IS_DESKTOP ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('landing');
                  window.history.pushState({}, '', '/');
                }}
                title="Kembali ke Landing Page"
                className="flex items-center gap-3 min-w-0 text-left group cursor-pointer focus:outline-none"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-[#272E22] bg-[#141414] group-hover:border-[#D4FA3C] transition-colors">
                  {status?.settings.school_logo ? (
                    <img
                      src={status.settings.school_logo}
                      alt={status?.settings.school_name || 'Logo Sekolah'}
                      className="w-full h-full object-contain p-1 bg-white"
                    />
                  ) : (
                    <img
                      src="/logo-aplikasi.png"
                      alt="Logo Bel Sekolah"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA695] group-hover:text-[#D4FA3C] transition-colors">Sistem Bel Otomatis</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#D4FA3C]" title="Server Aktif"></span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F6F0] truncate group-hover:text-white transition-colors">
                    Bel Sekolah{status?.settings.school_name ? ` — ${status.settings.school_name}` : ''}
                  </h1>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-[#272E22] bg-[#141414]">
                  {status?.settings.school_logo ? (
                    <img
                      src={status.settings.school_logo}
                      alt={status?.settings.school_name || 'Logo Sekolah'}
                      className="w-full h-full object-contain p-1 bg-white"
                    />
                  ) : (
                    <img
                      src="/logo-aplikasi.png"
                      alt="Logo Bel Sekolah"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA695]">Sistem Bel Otomatis</span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#D4FA3C]" title="Server Aktif"></span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F4F6F0] truncate">
                    Bel Sekolah{status?.settings.school_name ? ` — ${status.settings.school_name}` : ''}
                  </h1>
                </div>
              </div>
            )}

            {/* Master Controls: Theme Toggle, Mute & Time Display */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
              {!IS_DESKTOP && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('landing');
                    window.history.pushState({}, '', '/');
                  }}
                  title="Kembali ke Landing Page Beranda"
                  className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all bg-[#171A15] text-[#A9B2A3] border-[#272E22] hover:bg-[#20251D] hover:text-[#F4F6F0] hover:border-[#384232]"
                >
                  <IconArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span className="hidden sm:inline">Landing Page</span>
                </button>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                title={themeMode === 'dark' ? 'Ganti ke Mode Terang (Light)' : 'Ganti ke Mode Gelap (Dark)'}
                aria-label={themeMode === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
                className="p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all bg-[#171A15] text-[#A9B2A3] border-[#272E22] hover:bg-[#20251D] hover:text-[#F4F6F0]"
              >
                {themeMode === 'dark' ? (
                  <>
                    <IconSun className="w-4 h-4 text-[#D4FA3C]" />
                    <span className="hidden sm:inline text-xs">Light</span>
                  </>
                ) : (
                  <>
                    <IconMoon className="w-4 h-4 text-[#2D6A12]" />
                    <span className="hidden sm:inline text-xs">Dark</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors ${
                  status?.settings.mute_mode
                    ? 'bg-[#3D1414] text-[#FCA5A5] border-[#662020]'
                    : 'bg-[#171A15] text-[#A9B2A3] border-[#272E22] hover:bg-[#20251D]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status?.settings.mute_mode ? 'bg-[#EF4444]' : 'bg-[#D4FA3C]'}`}></span>
                <span className="hidden sm:inline">{status?.settings.mute_mode ? 'Mode Senyap: ON' : 'Audio Aktif'}</span>
                <span className="sm:hidden">{status?.settings.mute_mode ? 'Senyap' : 'Aktif'}</span>
              </button>

              <div className="bg-[#171A15] border border-[#272E22] px-3.5 py-1.5 rounded-xl text-right min-w-[148px]">
                {status && serverOnline ? (
                  <>
                    <div className="text-sm font-mono font-bold text-[#D4FA3C] tracking-wide">
                      {status.current_time}
                    </div>
                    <div className="text-[10px] text-[#9CA695] font-medium">
                      {status.current_day}, {status.current_date} ({status.settings.timezone_name.split(' ')[0]})
                    </div>
                  </>
                ) : localClock ? (
                  <>
                    <div className="text-sm font-mono font-bold text-[#F4F6F0] tracking-wide">
                      {localClock.time}
                    </div>
                    <div className="text-[10px] text-[#9CA695] font-medium">
                      {localClock.day}, {localClock.date} (Offline · Jam PC)
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 py-0.5">
                    <div className="h-4 w-24 ml-auto rounded skeleton-shimmer" />
                    <div className="h-2.5 w-28 ml-auto rounded skeleton-shimmer" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pill Navigation Bar (Clean full row on desktop, smooth scroll + wheel + arrows on narrow screens) */}
          <HorizontalScrollStrip
            asNav
            ariaLabel="Menu Navigasi"
            className="w-fit max-w-full"
            innerClassName="gap-1.5 bg-[#171A15] p-1.5 rounded-full border border-[#272E22]"
          >
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-[#D4FA3C] text-[#0E100D] shadow-sm'
                  : 'text-[#A9B2A3] hover:text-[#F4F6F0] hover:bg-[#20251D]'
              }`}
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'schedules'
                  ? 'bg-[#D4FA3C] text-[#0E100D] shadow-sm'
                  : 'text-[#A9B2A3] hover:text-[#F4F6F0] hover:bg-[#20251D]'
              }`}
            >
              Jadwal Bel ({schedules.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('soundboard')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'soundboard'
                  ? 'bg-[#D4FA3C] text-[#0E100D] shadow-sm'
                  : 'text-[#A9B2A3] hover:text-[#F4F6F0] hover:bg-[#20251D]'
              }`}
            >
              Soundboard Cepat ({soundboard.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audios')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'audios'
                  ? 'bg-[#D4FA3C] text-[#0E100D] shadow-sm'
                  : 'text-[#A9B2A3] hover:text-[#F4F6F0] hover:bg-[#20251D]'
              }`}
            >
              Pustaka Suara ({audios.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-[#D4FA3C] text-[#0E100D] shadow-sm'
                  : 'text-[#A9B2A3] hover:text-[#F4F6F0] hover:bg-[#20251D]'
              }`}
            >
              Zona Jam & Pengaturan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'logs'
                  ? 'bg-[#D4FA3C] text-[#0E100D] shadow-sm'
                  : 'text-[#A9B2A3] hover:text-[#F4F6F0] hover:bg-[#20251D]'
              }`}
            >
              Riwayat
            </button>
          </HorizontalScrollStrip>
        </header>

        {/* FEEDBACK AUDIO SEDANG MEMUTAR */}
        {playingTrack && (
          <div className="bg-[#1D221A] border-2 border-[#D4FA3C] p-4 rounded-2xl flex items-center justify-between animate-toast-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#D4FA3C] text-[#0E100D] flex items-center justify-center">
                <IconPlay className="w-4 h-4 ml-0.5" />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-[#D4FA3C] font-semibold">Sedang Mengudara ke Speaker</span>
                <p className="text-sm font-bold text-[#F4F6F0]">{playingTrack.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (audioPlayerRef.current) {
                  audioPlayerRef.current.pause();
                  audioPlayerRef.current.currentTime = 0;
                }
                setPlayingTrack(null);
                pushToast('info', 'Pemutaran Dihentikan', 'Audio telah dihentikan dari speaker.');
              }}
              className="px-3.5 py-2 bg-[#2A3324] hover:bg-[#35422D] text-xs font-semibold text-[#D4FA3C] rounded-xl border border-[#445430] flex items-center gap-1.5"
            >
              <IconStop className="w-3.5 h-3.5" />
              <span>Hentikan Suara</span>
            </button>
          </div>
        )}

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {isInitialLoading ? (
              <OverviewSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Highlight Card: Next Bell (Citron Neon Card) */}
                <div className="lg:col-span-5 bg-[#D4FA3C] text-[#0E100D] p-6 sm:p-7 rounded-3xl flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold uppercase tracking-wider bg-[#0E100D]/10 px-3 py-1 rounded-full">
                        Jadwal Bel Berikutnya
                      </span>
                      <span className="font-mono text-xs font-bold bg-[#0E100D] text-[#D4FA3C] px-2.5 py-1 rounded-full">
                        {status?.next_bell ? `T-${formatCountdown(status.next_bell.remaining_seconds)}` : 'Selesai'}
                      </span>
                    </div>

                    {status?.next_bell ? (
                      <div>
                        <div className="text-4xl sm:text-5xl font-black tracking-tight font-mono mb-1">
                          {status.next_bell.bell_time}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold leading-tight mb-2">
                          {status.next_bell.event_name}
                        </h2>
                        <p className="text-xs font-medium text-[#0E100D]/75 flex items-center gap-1.5">
                          <IconMusic className="w-3.5 h-3.5 shrink-0" />
                          <span>Pilihan Suara:</span>
                          <strong className="text-[#0E100D]">{status.next_bell.audio_title}</strong>
                        </p>
                      </div>
                    ) : (
                      <div className="py-6">
                        <div className="text-3xl font-black mb-1">Semua Selesai</div>
                        <p className="text-sm font-medium text-[#0E100D]/75">
                          Tidak ada lagi agenda bel yang terjadwal untuk hari ini.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-[#0E100D]/15 flex items-center justify-between mt-4">
                    <div className="text-xs">
                      <span className="block text-[#0E100D]/70 font-medium">Profil Bel Aktif:</span>
                      <strong className="text-sm font-bold text-[#0E100D]">
                        {status?.active_profile?.name || 'Reguler'}
                      </strong>
                    </div>
                    {status?.next_bell && (
                      <button
                        type="button"
                        onClick={() => handleTriggerBell(status.next_bell!.audio_id, status.next_bell!.event_name, status.next_bell!.filename)}
                        className="px-4 py-2 rounded-xl bg-[#0E100D] text-[#D4FA3C] hover:bg-[#1A2016] text-xs font-bold tracking-tight shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <IconPlay className="w-3.5 h-3.5" />
                        <span>Uji Sekarang</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Side Cards */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Metric Card: Today Progress */}
                  <div className="bg-[#171A15] border border-[#272E22] p-5 rounded-3xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase text-[#9CA695] tracking-wide block mb-1">
                        Ketercapaian Jam Hari Ini
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-[#F4F6F0]">
                          {status?.stats.completed_today || 0}
                        </span>
                        <span className="text-sm font-semibold text-[#9CA695]">
                          dari {status?.stats.total_today || 0} Jam Bel
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-[#20251D] h-2.5 rounded-full overflow-hidden border border-[#2D3527]">
                        <div
                          className="bg-[#D4FA3C] h-full rounded-full transition-all duration-300"
                          style={{ width: `${status?.stats.progress_percent || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[#9CA695] mt-2 font-medium">
                        <span>{status?.stats.progress_percent || 0}% terlaksana</span>
                        <span>{status?.stats.remaining_today || 0} tersisa</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Mode Switcher */}
                  <div className="bg-[#171A15] border border-[#272E22] p-5 rounded-3xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase text-[#9CA695] tracking-wide block mb-2">
                        Mode Profil Aktif
                      </span>
                      <div className="space-y-1.5">
                        {profiles.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isActivatingProfile}
                            onClick={() => handleActivateProfile(p.id, p.name)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                              p.is_active === 1
                                ? 'bg-[#22281E] border-[#D4FA3C] text-[#F4F6F0]'
                                : 'bg-[#141712] border-[#22281E] text-[#9CA695] hover:bg-[#1B2018] hover:text-[#F4F6F0]'
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            {p.is_active === 1 && (
                              <span className="text-[10px] font-bold bg-[#D4FA3C] text-[#0E100D] px-1.5 py-0.5 rounded-md shrink-0">
                                Aktif
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-[11px] text-[#9CA695] pt-2 border-t border-[#22281E]">
                      Klik untuk berpindah ke jam Bel Normal, Ujian, atau Ramadhan.
                    </div>
                  </div>

                  {/* Quick Soundboard Banner */}
                  <div className="sm:col-span-2 bg-[#171A15] border border-[#272E22] p-5 rounded-3xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase text-[#9CA695] tracking-wide">
                        Akses Cepat Pengeras Suara
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab('soundboard')}
                        className="text-xs text-[#D4FA3C] hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Buka Soundboard Lengkap</span>
                        <IconArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {soundboard.slice(0, 6).map(btn => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => handleTriggerBell(btn.audio_id, btn.label, btn.filename)}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between min-h-[68px] transition-all hover:scale-[1.01] active:scale-[0.99] ${
                            btn.button_color === 'red'
                              ? 'bg-[#2E1414] border-[#662020] text-[#FCA5A5]'
                              : btn.button_color === 'amber'
                              ? 'bg-[#2A200E] border-[#5E481D] text-[#FCD34D]'
                              : 'bg-[#1F251C] border-[#313B2A] text-[#F4F6F0]'
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight line-clamp-1">{btn.label}</span>
                          <span className="text-[10px] text-[#9CA695] font-mono">ID #{btn.audio_id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION BAWAH DASHBOARD: AGENDA HARI INI & STATUS SISTEM AUDIO */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                {/* WIDGET 1: TIMELINE AGENDA BEL HARI INI */}
                <div className="lg:col-span-8 bg-[#171A15] border border-[#272E22] p-5 sm:p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#D4FA3C]"></span>
                        <h3 className="text-base font-bold text-[#F4F6F0]">Agenda Bel Hari Ini ({status?.current_day || 'Hari Ini'})</h3>
                      </div>
                      <p className="text-xs text-[#9CA695] mt-0.5">
                        Daftar urutan jam bunyi terjadwal pada profil aktif &ldquo;{status?.active_profile?.name || 'Reguler'}&rdquo;.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('schedules')}
                      className="text-xs text-[#D4FA3C] hover:underline font-semibold flex items-center gap-1 shrink-0"
                    >
                      <span>Lihat Semua Jadwal</span>
                      <IconArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {schedules
                      .filter(s => {
                        const activeProfile = status?.active_profile?.id;
                        if (activeProfile && s.profile_id !== activeProfile) return false;
                        const todayCode = status?.day_code || 'SEMUA_HARI';
                        return s.day_of_week === todayCode || s.day_of_week === 'SEMUA_HARI';
                      })
                      .sort((a, b) => a.bell_time.localeCompare(b.bell_time))
                      .length === 0 ? (
                      <div className="p-8 text-center text-xs text-[#9CA695] bg-[#141712] rounded-2xl border border-[#22281E]">
                        Tidak ada jam bel terjadwal untuk hari ini pada profil aktif.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {schedules
                          .filter(s => {
                            const activeProfile = status?.active_profile?.id;
                            if (activeProfile && s.profile_id !== activeProfile) return false;
                            const todayCode = status?.day_code || 'SEMUA_HARI';
                            return s.day_of_week === todayCode || s.day_of_week === 'SEMUA_HARI';
                          })
                          .sort((a, b) => a.bell_time.localeCompare(b.bell_time))
                          .slice(0, 8)
                          .map(item => (
                            <div
                              key={item.id}
                              className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                                item.is_enabled === 1
                                  ? 'bg-[#141712] border-[#242C20]'
                                  : 'bg-[#141712]/50 border-[#20241E] opacity-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#1F251C] border border-[#2C3627] text-[#D4FA3C] shrink-0">
                                  {item.bell_time}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[#F4F6F0] truncate">{item.event_name}</p>
                                  <p className="text-[10px] text-[#9CA695] truncate">{item.audio_title}</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleTriggerBell(item.audio_id, item.event_name, item.audio_file)}
                                title="Bunyikan di speaker"
                                aria-label={`Uji nada ${item.event_name}`}
                                className="p-1.5 rounded-lg bg-[#20251D] hover:bg-[#2C3627] text-[#D4FA3C] border border-[#2F3928] transition-colors shrink-0"
                              >
                                <IconPlay className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* WIDGET 2: RINGKASAN SISTEM & KONTROL CEPAT */}
                <div className="lg:col-span-4 bg-[#171A15] border border-[#272E22] p-5 sm:p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#F4F6F0]">Status Pengeras Suara</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#20251D] text-[#D4FA3C] border border-[#2D3627]">
                        WIB (UTC+7)
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 rounded-2xl bg-[#141712] border border-[#22281E] flex items-center justify-between">
                        <span className="text-[#9CA695]">Sekolah Terdaftar</span>
                        <strong className="text-[#F4F6F0] text-right truncate max-w-[150px]">
                          {status?.settings.school_name || '-'}
                        </strong>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#141712] border border-[#22281E] flex items-center justify-between">
                        <span className="text-[#9CA695]">Output Speaker</span>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={`w-2 h-2 rounded-full ${status?.settings.mute_mode ? 'bg-[#EF4444]' : 'bg-[#D4FA3C]'}`}></span>
                          <span className={status?.settings.mute_mode ? 'text-[#FCA5A5]' : 'text-[#D4FA3C]'}>
                            {status?.settings.mute_mode ? 'Mode Senyap' : 'Aktif (Siap Bunyi)'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#141712] border border-[#22281E] flex items-center justify-between">
                        <span className="text-[#9CA695]">Volume Master</span>
                        <span className="font-mono font-bold text-[#D4FA3C]">
                          {status?.settings.master_volume || 90}%
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#141712] border border-[#22281E] flex items-center justify-between">
                        <span className="text-[#9CA695]">Total Nada Suara</span>
                        <span className="font-mono font-bold text-[#F4F6F0]">
                          {audios.length} File Tersimpan
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#22281E] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="flex-1 py-2 rounded-xl bg-[#20251D] hover:bg-[#2A3325] text-[#F4F6F0] text-xs font-semibold border border-[#2C3627] text-center transition-colors"
                    >
                      Buka Pengaturan
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('logs')}
                      className="py-2 px-3 rounded-xl bg-[#20251D] hover:bg-[#2A3325] text-[#D4FA3C] text-xs font-semibold border border-[#2C3627] text-center transition-colors"
                    >
                      Riwayat
                    </button>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: JADWAL BEL (REDESIGNED TIMELINE CARD + ACTIVE PROFILE SWITCH) */}
        {activeTab === 'schedules' && (
          <div className="space-y-5">
            {/* Top Toolbar */}
            <div className="bg-[#171A15] border border-[#272E22] p-5 rounded-3xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#F4F6F0]">Kelola Jadwal Bel</h2>
                <p className="text-xs text-[#9CA695]">
                  Pilih profil di bawah untuk melihat, mengonfigurasi, menambah jam bel, atau mengaktifkannya sebagai jadwal berjalan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {currentProfileObj && !isSelectedProfileActive && (
                  <button
                    type="button"
                    disabled={isActivatingProfile}
                    onClick={() => handleActivateProfile(currentProfileObj.id, currentProfileObj.name)}
                    className="px-4 py-2.5 bg-[#202A19] hover:bg-[#2A3821] text-[#D4FA3C] border border-[#3E532D] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <IconPower className="w-4 h-4" />
                    <span>{isActivatingProfile ? 'Mengaktifkan...' : 'Aktifkan Jadwal Ini'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <IconPlus className="w-4 h-4" />
                  <span>Tambah Jam Bel</span>
                </button>
              </div>
            </div>

            {/* Profile Selection Badges */}
            <HorizontalScrollStrip innerClassName="gap-2 pb-1">
              {profiles.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfileId(p.id);
                    setSelectedDayFilter('SEMUA');
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 flex items-center gap-2 ${
                    selectedProfileId === p.id
                      ? 'bg-[#D4FA3C] text-[#0E100D] border-[#D4FA3C]'
                      : 'bg-[#171A15] text-[#A9B2A3] border-[#272E22] hover:bg-[#20251D] hover:text-[#F4F6F0]'
                  }`}
                >
                  <span>{p.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      selectedProfileId === p.id
                        ? 'bg-[#0E100D]/15 text-[#0E100D]'
                        : 'bg-[#20251D] text-[#9CA695]'
                    }`}
                  >
                    {p.item_count}
                  </span>
                  {p.is_active === 1 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#0E100D] text-[#D4FA3C] font-black tracking-wide">
                      SEDANG AKTIF
                    </span>
                  )}
                </button>
              ))}
            </HorizontalScrollStrip>

            {/* Selected Profile Info & Activation Banner */}
            {currentProfileObj && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isSelectedProfileActive
                    ? 'bg-[#172013] border-[#384B2A]'
                    : 'bg-[#171A15] border-[#272E22]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelectedProfileActive ? 'bg-[#D4FA3C]' : 'bg-[#6F7869]'
                      }`}
                    />
                    <span className="text-xs font-bold text-[#F4F6F0]">
                      {currentProfileObj.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelectedProfileActive
                          ? 'bg-[#D4FA3C]/15 text-[#D4FA3C]'
                          : 'bg-[#20251D] text-[#9CA695]'
                      }`}
                    >
                      {isSelectedProfileActive ? 'Jadwal Berjalan Saat Ini' : 'Belum Aktif'}
                    </span>
                  </div>
                  {currentProfileObj.description && (
                    <p className="text-xs text-[#9CA695] pl-4">{currentProfileObj.description}</p>
                  )}
                </div>

                {!isSelectedProfileActive ? (
                  <button
                    type="button"
                    disabled={isActivatingProfile}
                    onClick={() => handleActivateProfile(currentProfileObj.id, currentProfileObj.name)}
                    className="px-4 py-2 rounded-xl bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shrink-0 transition-colors"
                  >
                    <IconPower className="w-3.5 h-3.5" />
                    <span>{isActivatingProfile ? 'Mengaktifkan...' : 'Jadikan Jadwal Aktif'}</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-[#D4FA3C] flex items-center gap-1.5 pl-4 sm:pl-0">
                    <IconCheckCircle className="w-4 h-4" />
                    <span>Scheduler otomatis mengikuti profil ini</span>
                  </span>
                )}
              </div>
            )}

            {/* Day Filter Bar */}
            <HorizontalScrollStrip innerClassName="gap-1.5 bg-[#171A15] p-2 rounded-2xl border border-[#272E22]">
              <span className="text-xs font-semibold text-[#9CA695] px-2 shrink-0">Filter Hari:</span>
              {['SEMUA', 'SEMUA_HARI', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    selectedDayFilter === day
                      ? 'bg-[#2B3523] text-[#D4FA3C] border border-[#3E4E32]'
                      : 'text-[#9CA695] hover:text-[#F4F6F0]'
                  }`}
                >
                  {day === 'SEMUA' ? 'Semua Jadwal' : day.replace('_', ' ')}
                </button>
              ))}
            </HorizontalScrollStrip>

            {/* Visual Timeline Cards Grid */}
            {isInitialLoading ? (
              <SchedulesSkeleton />
            ) : filteredSchedules.length === 0 ? (
              <div className="bg-[#171A15] border border-[#272E22] p-12 rounded-3xl text-center">
                <div className="text-2xl sm:text-3xl font-black text-[#9CA695] mb-2">Belum Ada Jam Bel</div>
                <p className="text-sm text-[#9CA695] max-w-md mx-auto mb-5">
                  Profil &ldquo;{currentProfileObj?.name}&rdquo; untuk filter hari ini belum memiliki jadwal bel.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2.5 bg-[#D4FA3C] text-[#0E100D] font-bold text-xs rounded-xl inline-flex items-center gap-1.5"
                >
                  <IconPlus className="w-4 h-4" />
                  <span>Tambah Jam Bel Pertama</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredSchedules.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`bg-[#171A15] border p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 transition-all ${
                      item.is_enabled === 1
                        ? 'border-[#2D3627] hover:border-[#3D4C33]'
                        : 'border-[#262A24] opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Big Time Block */}
                      <div className="bg-[#10130E] border border-[#272E22] px-3.5 py-2.5 rounded-xl text-center min-w-[76px] shrink-0">
                        <div className="text-xl sm:text-2xl font-mono font-black text-[#D4FA3C]">
                          {item.bell_time}
                        </div>
                        <span className="text-[10px] font-bold text-[#9CA695] uppercase">
                          {item.day_of_week === 'SEMUA_HARI' ? 'Tiap Hari' : item.day_of_week}
                        </span>
                      </div>

                      {/* Event Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[#9CA695] shrink-0">#{idx + 1}</span>
                          <h3 className="text-base font-bold text-[#F4F6F0] truncate">{item.event_name}</h3>
                        </div>
                        <p className="text-xs text-[#9CA695] mt-1 flex items-center gap-1.5">
                          <IconMusic className="w-3.5 h-3.5 text-[#D4FA3C] shrink-0" />
                          <span className="truncate">{item.audio_title}</span>
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTriggerBell(item.audio_id, item.event_name, item.audio_file)}
                        title="Tes bunyi di speaker"
                        aria-label={`Tes bunyi ${item.event_name}`}
                        className="p-2 bg-[#20251D] hover:bg-[#2B3325] text-[#D4FA3C] rounded-xl border border-[#2E3727] transition-colors"
                      >
                        <IconPlay className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSchedule(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          item.is_enabled === 1
                            ? 'bg-[#202A19] border-[#394B2B] text-[#D4FA3C]'
                            : 'bg-[#242721] border-[#373A33] text-[#9CA695]'
                        }`}
                      >
                        {item.is_enabled === 1 ? 'Aktif' : 'Off'}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteSchedule(item)}
                        title="Hapus jam ini"
                        aria-label={`Hapus ${item.event_name}`}
                        className="p-2 bg-[#2D1414] hover:bg-[#3D1A1A] text-[#FCA5A5] rounded-xl border border-[#522222] transition-colors"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOUNDBOARD CEPAT */}
        {activeTab === 'soundboard' && (
          <div className="bg-[#171A15] border border-[#272E22] p-5 sm:p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#F4F6F0]">Soundboard Pengeras Suara Langsung</h2>
                <p className="text-xs text-[#9CA695]">
                  Picu audio secara instan kapan saja, atau tambahkan tombol suara custom baru sesuai kebutuhan sekolah.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddButtonModal(true)}
                className="px-4 py-2.5 bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] font-bold text-xs sm:text-sm rounded-xl shadow-sm self-start sm:self-auto flex items-center gap-1.5"
              >
                <IconPlus className="w-4 h-4" />
                <span>Tambah Tombol Suara</span>
              </button>
            </div>

            {isInitialLoading ? (
              <GridSkeleton count={6} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {soundboard.map(btn => (
                  <div
                    key={btn.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                      btn.button_color === 'red'
                        ? 'bg-[#241313] border-[#5E2222]'
                        : btn.button_color === 'amber'
                        ? 'bg-[#241B0E] border-[#59421A]'
                        : 'bg-[#1A1F17] border-[#2A3423]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA695]">
                          {btn.category}
                        </span>
                        <h3 className="text-lg font-bold text-[#F4F6F0] mt-1">{btn.label}</h3>
                        <p className="text-xs text-[#9CA695]">{btn.audio_title}</p>
                      </div>
                      {btn.id > 6 && (
                        <button
                          type="button"
                          onClick={() => requestDeleteButton(btn)}
                          className="text-[#FCA5A5] hover:text-[#EF4444] p-1.5 rounded-lg hover:bg-[#3D1A1A] transition-colors"
                          title="Hapus Tombol Ini"
                          aria-label={`Hapus tombol ${btn.label}`}
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTriggerBell(btn.audio_id, btn.label, btn.filename)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        btn.button_color === 'red'
                          ? 'bg-[#EF4444] text-[#FFFFFF] hover:bg-[#DC2626]'
                          : btn.button_color === 'amber'
                          ? 'bg-[#F59E0B] text-[#0E100D] hover:bg-[#D97706]'
                          : 'bg-[#D4FA3C] text-[#0E100D] hover:bg-[#C2E834]'
                      }`}
                    >
                      <span>Bunyikan Sekarang</span>
                      <IconPlay className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PUSTAKA SUARA & UPLOAD MP3/WAV */}
        {activeTab === 'audios' && (
          <div className="bg-[#171A15] border border-[#272E22] p-5 sm:p-6 rounded-3xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[#F4F6F0]">Pustaka File Suara & Nada</h2>
                <p className="text-xs text-[#9CA695]">
                  Daftar seluruh rekaman MP3/WAV yang dapat dipasangkan ke jadwal maupun soundboard pengeras suara.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUploadAudioModal(true)}
                className="px-4 py-2.5 bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] font-bold text-xs sm:text-sm rounded-xl shadow-sm self-start sm:self-auto flex items-center gap-1.5"
              >
                <IconUpload className="w-4 h-4" />
                <span>Upload File Suara (MP3 / WAV)</span>
              </button>
            </div>

            {isInitialLoading ? (
              <SchedulesSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#22281E] text-[#9CA695]">
                      <th className="py-3 px-3 font-semibold">Judul Nada</th>
                      <th className="py-3 px-3 font-semibold">Kategori</th>
                      <th className="py-3 px-3 font-semibold">Nama File</th>
                      <th className="py-3 px-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D221A]">
                    {audios.map(audio => (
                      <tr key={audio.id} className="hover:bg-[#1B2018] transition-colors">
                        <td className="py-3 px-3 font-bold text-[#F4F6F0]">
                          {audio.title}
                        </td>
                        <td className="py-3 px-3 text-[#9CA695]">
                          <span className="px-2 py-0.5 rounded bg-[#20251D] border border-[#2D3627] text-[10px] font-mono">
                            {audio.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-[#9CA695]">
                          {audio.filename}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTriggerBell(audio.id, audio.title, audio.filename)}
                              className="px-3 py-1.5 bg-[#20251D] hover:bg-[#2A3325] text-[#D4FA3C] font-semibold text-xs rounded-xl border border-[#2E3727] inline-flex items-center gap-1"
                            >
                              <IconPlay className="w-3 h-3" />
                              <span>Putar</span>
                            </button>
                            {audio.id > 7 && (
                              <button
                                type="button"
                                onClick={() => requestDeleteAudio(audio)}
                                className="px-3 py-1.5 bg-[#2D1414] hover:bg-[#3D1A1A] text-[#FCA5A5] font-semibold text-xs rounded-xl border border-[#522222] inline-flex items-center gap-1"
                              >
                                <IconTrash className="w-3 h-3" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ZONA JAM & PENGATURAN */}
        {activeTab === 'settings' && (
          <div className="bg-[#171A15] border border-[#272E22] p-5 sm:p-7 rounded-3xl space-y-6 max-w-3xl">
            <div>
              <h2 className="text-xl font-bold text-[#F4F6F0]">Pengaturan Identitas & Sistem</h2>
              <p className="text-xs text-[#9CA695]">
                Atur nama sekolah, logo resmi, zona waktu (WIB / WITA / WIT), dan volume pengeras suara.
              </p>
            </div>

            <div className="space-y-5">
              {/* Kustomisasi Nama Sekolah & Logo */}
              <div className="bg-[#141712] border border-[#22281E] p-5 rounded-2xl space-y-4">
                <label className="block text-xs font-bold text-[#A9B2A3] uppercase tracking-wider">
                  Identitas & Logo Sekolah
                </label>

                {/* Form Nama Sekolah */}
                <form onSubmit={handleSaveSchoolName} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama sekolah, misal: SIT Al-Mubarak"
                      value={schoolNameInput}
                      onChange={e => setSchoolNameInput(e.target.value)}
                      className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3.5 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingSchoolName}
                    className="px-4 py-2 bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] font-bold text-xs rounded-xl shrink-0 transition-colors disabled:opacity-50"
                  >
                    {isSavingSchoolName ? 'Menyimpan...' : 'Simpan Nama'}
                  </button>
                </form>

                {/* Upload & Preview Logo Sekolah */}
                <div className="pt-3 border-t border-[#22281E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl border border-[#272E22] flex items-center justify-center shrink-0 overflow-hidden shadow-sm bg-[#141414]">
                      {status?.settings.school_logo ? (
                        <img
                          src={status.settings.school_logo}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain p-1 bg-white"
                        />
                      ) : (
                        <img
                          src="/logo-aplikasi.png"
                          alt="Logo Default Bel Sekolah"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F4F6F0]">Logo Sekolah Saat Ini</h4>
                      <p className="text-[11px] text-[#9CA695]">Format disarankan: PNG atau JPG transparan (maks. 5MB).</p>
                    </div>
                  </div>

                  <form onSubmit={handleUploadLogo} className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setLogoFile(e.target.files[0]);
                        }
                      }}
                      className="text-xs text-[#9CA695] file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#20251D] file:text-[#D4FA3C] hover:file:bg-[#2C3627] file:cursor-pointer max-w-[200px]"
                    />
                    {logoFile && (
                      <button
                        type="submit"
                        disabled={isUploadingLogo}
                        className="px-3.5 py-1.5 bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] text-xs font-bold rounded-xl transition-colors shrink-0 disabled:opacity-50"
                      >
                        {isUploadingLogo ? 'Mengunggah...' : 'Upload Logo'}
                      </button>
                    )}
                    {status?.settings.school_logo && (
                      <button
                        type="button"
                        onClick={handleResetLogo}
                        className="px-3 py-1.5 bg-[#2E1818] hover:bg-[#3D1A1A] text-[#FCA5A5] border border-[#522222] text-xs font-bold rounded-xl transition-colors shrink-0"
                      >
                        Reset Default
                      </button>
                    )}
                  </form>
                </div>
              </div>
              {/* Opsi Zona Waktu */}
              <div className="bg-[#141712] border border-[#22281E] p-4 rounded-2xl">
                <label className="block text-xs font-bold text-[#A9B2A3] mb-2 uppercase tracking-wider">
                  Pilihan Zona Waktu Operasional
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { name: 'Asia/Jakarta (WIB)', offset: 7, label: 'WIB (Jakarta UTC+7)' },
                    { name: 'Asia/Makassar (WITA)', offset: 8, label: 'WITA (Makassar UTC+8)' },
                    { name: 'Asia/Jayapura (WIT)', offset: 9, label: 'WIT (Jayapura UTC+9)' },
                  ].map(tz => (
                    <button
                      key={tz.name}
                      type="button"
                      onClick={() =>
                        handleSaveSettings(
                          { timezone_name: tz.name, timezone_offset_hours: tz.offset },
                          `Zona waktu diubah ke ${tz.label}`
                        )
                      }
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        status?.settings.timezone_offset_hours === tz.offset
                          ? 'bg-[#D4FA3C] text-[#0E100D] border-[#D4FA3C]'
                          : 'bg-[#1D221A] text-[#9CA695] border-[#293223] hover:text-[#F4F6F0]'
                      }`}
                    >
                      {tz.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opsi Format Tampilan Jam */}
              <div className="bg-[#141712] border border-[#22281E] p-4 rounded-2xl">
                <label className="block text-xs font-bold text-[#A9B2A3] mb-2 uppercase tracking-wider">
                  Format Jam Digital
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { fmt: '24H', label: 'Format 24 Jam (Contoh: 14:30:00)' },
                    { fmt: '12H', label: 'Format 12 Jam AM/PM (Contoh: 02:30:00 PM)' },
                  ].map(f => (
                    <button
                      key={f.fmt}
                      type="button"
                      onClick={() =>
                        handleSaveSettings(
                          { time_format: f.fmt },
                          `Format jam diubah ke mode ${f.fmt}`
                        )
                      }
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        status?.settings.time_format === f.fmt
                          ? 'bg-[#D4FA3C] text-[#0E100D] border-[#D4FA3C]'
                          : 'bg-[#1D221A] text-[#9CA695] border-[#293223] hover:text-[#F4F6F0]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Master Slider */}
              <div className="bg-[#141712] border border-[#22281E] p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#A9B2A3] uppercase tracking-wider">
                    Volume Master Output Suara
                  </label>
                  <span className="text-sm font-mono font-bold text-[#D4FA3C]">
                    {status?.settings.master_volume || 90}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={status?.settings.master_volume || 90}
                  onChange={e => handleSaveSettings({ master_volume: Number(e.target.value) })}
                  onMouseUp={e =>
                    handleSaveSettings(
                      { master_volume: Number((e.target as HTMLInputElement).value) },
                      `Volume master diatur ke ${(e.target as HTMLInputElement).value}%`
                    )
                  }
                  className="w-full accent-[#D4FA3C]"
                />
              </div>

              {/* Pairing Server Pusat (desktop) */}
              <div className="bg-[#141712] border border-[#22281E] p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#A9B2A3] uppercase tracking-wider">
                    Pairing Server Pusat
                  </label>
                  {pairing && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        pairing.enabled
                          ? pairing.last_sync_ok
                            ? 'bg-[#1F2918] text-[#D4FA3C] border-[#354627]'
                            : 'bg-[#2E1818] text-[#FCA5A5] border-[#5E2B2B]'
                          : 'bg-[#20251D] text-[#9CA695] border-[#2D3627]'
                      }`}
                    >
                      {!pairing.enabled
                        ? 'NONAKTIF'
                        : pairing.last_sync_ok
                          ? 'TERSINKRON'
                          : 'GAGAL SYNC'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#9CA695]">
                  Hubungkan aplikasi desktop ini ke server pusat (bell.sitalmubarak.com) agar jadwal,
                  audio, dan pengaturan tersinkron otomatis tiap 60 detik. Kode pairing dibuat admin
                  di server pusat.
                </p>
                {pairing?.last_sync_at && (
                  <p className="text-[11px] text-[#9CA695]">
                    Sinkronisasi terakhir: <span className="font-mono text-[#D4FA3C]">{pairing.last_sync_at}</span>
                    {pairing.error ? ` — ${pairing.error}` : ''}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="url"
                    placeholder="URL server pusat, misal: https://bell.sitalmubarak.com"
                    value={pairingUrl}
                    onChange={e => setPairingUrl(e.target.value)}
                    className="bg-[#1F241C] border border-[#313B2A] rounded-xl px-3.5 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Kode pairing 6 digit"
                    value={pairingCode}
                    onChange={e => setPairingCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="bg-[#1F241C] border border-[#313B2A] rounded-xl px-3.5 py-2 text-sm font-mono tracking-widest text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPairingEnabled(prev => !prev)}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                      pairingEnabled ? 'bg-[#D4FA3C]' : 'bg-[#313B2A]'
                    }`}
                    aria-label="Aktifkan sinkronisasi pairing"
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                        pairingEnabled ? 'left-6 bg-[#0E100D]' : 'left-0.5 bg-[#9CA695]'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    disabled={isSavingPairing}
                    onClick={() => handleSavePairing(pairingEnabled)}
                    className="px-4 py-2 bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSavingPairing ? 'Menyimpan...' : 'Simpan Pairing'}
                  </button>
                </div>
              </div>

              {/* AKSES REMOTE (QR Code via Cloudflare Quick Tunnel) */}
              <div className="bg-[#141712] border border-[#22281E] p-5 rounded-2xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#A9B2A3] uppercase tracking-wider">
                      Akses Remote dari HP / Laptop Lain
                    </label>
                    <p className="text-[11px] text-[#9CA695] mt-1">
                      Nyalakan untuk membuat QR Code. Scan dari HP untuk mengendalikan bel tanpa menyentuh server mana pun — koneksi langsung ke komputer ini, terenkripsi HTTPS.
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      tunnel?.running
                        ? 'bg-[#D4FA3C]/10 text-[#D4FA3C] border-[#D4FA3C]/40'
                        : 'bg-[#20251D] text-[#9CA695] border-[#2D3627]'
                    }`}
                  >
                    {tunnel?.running ? 'AKTIF' : 'MATI'}
                  </span>
                </div>

                {tunnel?.running && tunnel.public_url ? (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="bg-[#F4F6F0] p-2.5 rounded-2xl shrink-0">
                      {tunnelQrDataUrl ? (
                        <img src={tunnelQrDataUrl} alt="QR Code Akses Remote" className="w-[200px] h-[200px]" />
                      ) : (
                        <div className="w-[200px] h-[200px] rounded skeleton-shimmer" />
                      )}
                    </div>
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="text-xs text-[#9CA695]">
                        Berlaku sampai:
                        <strong className="text-[#F4F6F0] font-mono ml-1.5">{tunnel.expires_at || '-'}</strong>
                        <span className="block mt-0.5 text-[10px]">Setelah itu sesi HP hangus otomatis dan harus scan ulang.</span>
                      </div>
                      <code className="block truncate text-[10px] font-mono text-[#D4FA3C] bg-[#0E100D] border border-[#272E22] rounded-lg px-2.5 py-2">
                        {tunnel.public_url}
                      </code>
                      <button
                        type="button"
                        disabled={isTunnelLoading}
                        onClick={handleStopTunnel}
                        className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-[#3A201C] hover:bg-[#4A2A24] text-[#F87171] border border-[#5A2E28] font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                      >
                        Matikan Remote (Putus Semua Sesi)
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isTunnelLoading}
                    onClick={handleStartTunnel}
                    className="w-full px-4 py-3 min-h-[44px] bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D] font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isTunnelLoading ? 'Menyalakan Akses Remote...' : 'Aktifkan Akses Remote'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: RIWAYAT BUNYI */}
        {activeTab === 'logs' && (
          <div className="bg-[#171A15] border border-[#272E22] p-5 sm:p-6 rounded-3xl space-y-4">
            <div>
              <h2 className="text-xl font-bold text-[#F4F6F0]">Riwayat Pemutaran Bel & Suara</h2>
              <p className="text-xs text-[#9CA695]">
                Log pencatatan otomatis waktu pemutaran bel terjadwal maupun pemicuan manual di speaker.
              </p>
            </div>

            {isInitialLoading ? (
              <SchedulesSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-[#22281E] text-[#9CA695]">
                      <th className="py-2.5 px-3 font-semibold">Waktu Pemutaran</th>
                      <th className="py-2.5 px-3 font-semibold">Peristiwa / Nada</th>
                      <th className="py-2.5 px-3 font-semibold">Sumber</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D221A]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[#9CA695]">
                          Belum ada riwayat bunyi tercatat hari ini.
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-[#1B2018] transition-colors">
                          <td className="py-3 px-3 font-mono text-[#D4FA3C]">
                            {log.played_at}
                          </td>
                          <td className="py-3 px-3 font-semibold text-[#F4F6F0]">
                            {log.event_title}
                          </td>
                          <td className="py-3 px-3 text-[#9CA695]">
                            <span className="px-2 py-0.5 rounded bg-[#20251D] border border-[#2D3627] text-[10px] font-mono">
                              {log.trigger_source}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === 'PLAYED'
                                  ? 'bg-[#1F2918] text-[#D4FA3C] border border-[#354627]'
                                  : 'bg-[#2E1818] text-[#FCA5A5] border-[#5E2B2B]'
                              }`}
                            >
                              {log.status === 'PLAYED' ? 'BERHASIL' : 'SENYAP / OFF'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="max-w-7xl w-full mx-auto mt-8 pt-4 border-t border-[#22281E] flex flex-col sm:flex-row items-center justify-between text-xs text-[#9CA695] gap-2">
        <p>Sistem Bel Sekolah Otomatis</p>
        <p className="font-mono">Domain: bell.sitalmubarak.com</p>
      </footer>

      {/* CUSTOM CONFIRM DIALOG MODAL (PENGGANTI BROWSER ALERT/CONFIRM) */}
      {confirmDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
        >
          <div className="bg-[#171A15] border border-[#2C3526] max-w-md w-full p-6 rounded-3xl shadow-2xl animate-modal-in space-y-5">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-[#3A1717] text-[#FCA5A5] border border-[#612323]'
                    : 'bg-[#25311B] text-[#D4FA3C] border border-[#3E532D]'
                }`}
              >
                <IconAlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F4F6F0]">{confirmDialog.title}</h3>
                <p className="text-xs text-[#A9B2A3] mt-1 leading-relaxed">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#22281E]">
              <button
                type="button"
                disabled={isConfirmBusy}
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B2A3] hover:bg-[#20251D] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isConfirmBusy}
                onClick={executeConfirmDialog}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                    : 'bg-[#D4FA3C] hover:bg-[#C2E834] text-[#0E100D]'
                } disabled:opacity-60`}
              >
                {isConfirmBusy ? 'Memproses...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: TAMBAH JADWAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#171A15] border border-[#272E22] max-w-md w-full p-6 rounded-3xl shadow-2xl animate-modal-in">
            <h3 className="text-lg font-bold text-[#F4F6F0] mb-1">Tambah Jam Bel Baru</h3>
            <p className="text-xs text-[#9CA695] mb-4">
              Jadwal akan dimasukkan ke: <strong>{currentProfileObj?.name}</strong>
            </p>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label htmlFor={eventNameId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Nama Kegiatan Bel
                </label>
                <input
                  id={eventNameId}
                  type="text"
                  required
                  placeholder="Misal: Bel Masuk Pagi, Istirahat Sholat"
                  value={newEventName}
                  onChange={e => setNewEventName(e.target.value)}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={bellTimeId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                    Jam (HH:MM)
                  </label>
                  <input
                    id={bellTimeId}
                    type="time"
                    required
                    value={newBellTime}
                    onChange={e => setNewBellTime(e.target.value)}
                    className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor={dayOfWeekId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                    Hari Berlaku
                  </label>
                  <select
                    id={dayOfWeekId}
                    value={newDayOfWeek}
                    onChange={e => setNewDayOfWeek(e.target.value)}
                    className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                  >
                    <option value="SEMUA_HARI">Setiap Hari</option>
                    <option value="SENIN">Senin Saja</option>
                    <option value="SELASA">Selasa Saja</option>
                    <option value="RABU">Rabu Saja</option>
                    <option value="KAMIS">Kamis Saja</option>
                    <option value="JUMAT">Jumat Saja</option>
                    <option value="SABTU">Sabtu Saja</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={audioSelectId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Pilihan Nada Suara
                </label>
                <select
                  id={audioSelectId}
                  value={newAudioId}
                  onChange={e => setNewAudioId(Number(e.target.value))}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                >
                  {audios.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B2A3] hover:bg-[#20251D]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchedule}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4FA3C] text-[#0E100D] hover:bg-[#C2E834] disabled:opacity-50"
                >
                  {isSavingSchedule ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH TOMBOL SOUNDBOARD */}
      {showAddButtonModal && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#171A15] border border-[#272E22] max-w-md w-full p-6 rounded-3xl shadow-2xl animate-modal-in">
            <h3 className="text-lg font-bold text-[#F4F6F0] mb-1">Tambah Tombol Soundboard Baru</h3>
            <p className="text-xs text-[#9CA695] mb-4">
              Buat tombol cepat khusus untuk dipencet sewaktu-waktu di speaker.
            </p>

            <form onSubmit={handleCreateButton} className="space-y-4">
              <div>
                <label htmlFor={btnLabelId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Label Teks Tombol
                </label>
                <input
                  id={btnLabelId}
                  type="text"
                  required
                  placeholder="Misal: Senam Pagi, Literasi, Doa Pulang"
                  value={newButtonLabel}
                  onChange={e => setNewButtonLabel(e.target.value)}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor={btnAudioId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  File Suara yang Diputar
                </label>
                <select
                  id={btnAudioId}
                  value={newButtonAudioId}
                  onChange={e => setNewButtonAudioId(Number(e.target.value))}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                >
                  {audios.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={btnColorId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Aksen Warna Tombol
                </label>
                <select
                  id={btnColorId}
                  value={newButtonColor}
                  onChange={e => setNewButtonColor(e.target.value)}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                >
                  <option value="lime">Lime Neon (Umum)</option>
                  <option value="amber">Amber / Kuning (Peringatan / Ujian)</option>
                  <option value="red">Merah (Darurat / Evakuasi)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddButtonModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B2A3] hover:bg-[#20251D]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingButton}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4FA3C] text-[#0E100D] hover:bg-[#C2E834] disabled:opacity-50"
                >
                  {isSavingButton ? 'Menyimpan...' : 'Buat Tombol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD FILE AUDIO */}
      {showUploadAudioModal && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#171A15] border border-[#272E22] max-w-md w-full p-6 rounded-3xl shadow-2xl animate-modal-in">
            <h3 className="text-lg font-bold text-[#F4F6F0] mb-1">Upload File Suara Baru</h3>
            <p className="text-xs text-[#9CA695] mb-4">
              Unggah rekaman bel, suara pengumuman, atau mars sekolah (.mp3 / .wav).
            </p>

            <form onSubmit={handleUploadAudio} className="space-y-4">
              <div>
                <label htmlFor={upTitleId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Nama Suara / Judul Nada
                </label>
                <input
                  id={upTitleId}
                  type="text"
                  required
                  placeholder="Misal: Bel Musik Angklung, Suara Bu Guru"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor={upCatId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Kategori
                </label>
                <select
                  id={upCatId}
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl px-3 py-2 text-sm text-[#F4F6F0] focus:border-[#D4FA3C] focus:outline-none"
                >
                  <option value="CUSTOM">Custom / Nada Khusus</option>
                  <option value="BELL">Bel Kelas</option>
                  <option value="ANNOUNCEMENT">Pengumuman</option>
                  <option value="NATIONAL_ANTHEM">Lagu Wajib / Mars</option>
                  <option value="PRAYER">Doa / Religi</option>
                  <option value="EMERGENCY">Darurat</option>
                </select>
              </div>

              <div>
                <label htmlFor={upFileId} className="block text-xs font-semibold text-[#A9B2A3] mb-1">
                  Pilih File Audio (.mp3 / .wav)
                </label>
                <input
                  id={upFileId}
                  type="file"
                  accept="audio/mp3,audio/wav,audio/mpeg,.mp3,.wav"
                  required
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full bg-[#1F241C] border border-[#313B2A] rounded-xl p-2 text-xs text-[#F4F6F0] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#D4FA3C] file:text-[#0E100D] hover:file:bg-[#C2E834]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadAudioModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A9B2A3] hover:bg-[#20251D]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D4FA3C] text-[#0E100D] hover:bg-[#C2E834] disabled:opacity-50"
                >
                  {isUploading ? 'Mengunggah...' : 'Upload & Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
