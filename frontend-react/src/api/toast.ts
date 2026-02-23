/**
 * Toast placeholder: replace later with react-hot-toast / sonner / custom component.
 * Currently console + optional global handler for unified error handling.
 */

export type ToastType = 'success' | 'error' | 'info' | 'loading';

let toastHandler: ((type: ToastType, message: string) => void) | null = null;

export function setToastHandler(handler: (type: ToastType, message: string) => void): void {
  toastHandler = handler;
}

export function toast(type: ToastType, message: string): void {
  if (toastHandler) {
    toastHandler(type, message);
  } else {
    const prefix = type === 'error' ? '[Error]' : type === 'success' ? '[OK]' : '[Info]';
    console.warn(`${prefix} ${message}`);
  }
}

export const showError = (message: string) => toast('error', message);
export const showSuccess = (message: string) => toast('success', message);
export const showInfo = (message: string) => toast('info', message);
