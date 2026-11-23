export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'queuemaster_v3_theme';

class UIStore {
  theme = $state<ThemeMode>('dark');
  toast = $state<{ message: string; onUndo?: () => void } | null>(null);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadTheme();
  }

  private loadTheme() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        this.theme = saved;
      }
    } catch {
      // ignore storage errors
    }
    this.applyTheme();
  }

  setTheme(mode: ThemeMode) {
    this.theme = mode;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // ignore
      }
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  private applyTheme() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', this.theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', this.theme === 'light' ? '#f1f5f9' : '#090d16');
    }
  }

  showToast(message: string, onUndo?: () => void, durationMs = 4500) {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, onUndo };
    this.toastTimer = setTimeout(() => {
      this.toast = null;
      this.toastTimer = null;
    }, durationMs);
  }

  triggerUndo() {
    if (this.toast?.onUndo) {
      this.toast.onUndo();
    }
    this.dismissToast();
  }

  dismissToast() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toast = null;
  }
}

export const uiStore = new UIStore();

