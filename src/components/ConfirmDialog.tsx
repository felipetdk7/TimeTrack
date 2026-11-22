export interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}

export const ConfirmDialogModal = ({
  dialog,
  onCancel,
}: {
  dialog: ConfirmDialogState;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
      <div className="p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-900">{dialog.title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{dialog.description}</p>
      </div>
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={async () => {
            const fn = dialog.onConfirm;
            onCancel();
            await fn();
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer ${
            dialog.variant === 'danger'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {dialog.confirmLabel}
        </button>
      </div>
    </div>
  </div>
);