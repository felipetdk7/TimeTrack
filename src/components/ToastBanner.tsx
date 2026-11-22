import { X } from 'lucide-react';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

export const ToastBanner = ({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) => (
  <div className="fixed bottom-16 md:bottom-5 right-4 z-50 max-w-sm">
    <div
      className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between gap-3 ${
        toast.type === 'error'
          ? 'bg-red-50 border-red-200 text-red-800'
          : toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-slate-900 border-slate-800 text-white'
      }`}
    >
      <span>{toast.text}</span>
      <button
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);