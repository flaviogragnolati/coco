'use client';

/**
 * Clear all cookies by setting their expiration date to the past
 *
 * This function attempts to clear cookies for:
 * - Current domain
 * - Parent domain with leading dot
 * - All possible domain variations to ensure complete cleanup
 */
export function clearAllCookies(): void {
  if (typeof window === 'undefined') return;

  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

    if (name) {
      // Clear cookie for current domain
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
      // Clear cookie for parent domain (with leading dot)
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
      // Clear cookie for parent domain with leading dot
      const domainParts = window.location.hostname.split('.');
      if (domainParts.length > 1) {
        const parentDomain = `.${domainParts.slice(-2).join('.')}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${parentDomain};`;
      }
    }
  }
}

export function clearLocalStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.clear();
  } catch (error) {
    console.warn('Failed to clear localStorage:', error);
  }
}

export function clearSessionStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.clear();
  } catch (error) {
    console.warn('Failed to clear sessionStorage:', error);
  }
}

export function clearAllBrowserStorage(): void {
  if (typeof window === 'undefined') return;

  clearAllCookies();
  clearLocalStorage();
  clearSessionStorage();

  console.debug('All browser storage cleared');
}

export function clearLocalStorageItems(keys: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Failed to clear localStorage items:', error);
  }
}

export function clearSessionStorageItems(keys: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    for (const key of keys) {
      sessionStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('Failed to clear sessionStorage items:', error);
  }
}
