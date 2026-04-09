'use client';

type PaymentSuccessToastProps = {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
};

export default function PaymentSuccessToast({
  open,
  title,
  message,
  onClose,
}: PaymentSuccessToastProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 py-6 sm:items-start sm:pt-6">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close payment success popup"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[2.5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}