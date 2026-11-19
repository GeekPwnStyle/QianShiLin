import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmDeleteItem {
  id: string;
  label: string;
  meta?: string;
}

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  description: React.ReactNode;
  note?: React.ReactNode;
  items?: ConfirmDeleteItem[];
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  title,
  subtitle = '危险操作二次确认：删除后将无法恢复',
  description,
  note,
  items,
  confirmLabel = '确认删除',
  cancelLabel = '取消',
  loading = false,
  error,
  onClose,
  onConfirm,
}) => {
  const handleClose = () => {
    if (!loading) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      maxWidthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" disabled={loading} onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            loading={loading}
            icon={<Trash2 className="w-4 h-4" />}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2]/80 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-[#171916]">
            <div>{description}</div>
            {note && <p className="mt-1.5 text-[12px] text-[#991B1B]/85">{note}</p>}
          </div>
        </div>

        {items && items.length > 0 && (
          <div className="max-h-40 overflow-y-auto qsl-scroll space-y-1.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#E5E8E0] bg-[#FAFBF8] px-3 py-2 text-[13px]"
              >
                <span className="min-w-0 truncate font-semibold text-[#171916]">{item.label}</span>
                {item.meta && (
                  <span className="shrink-0 font-mono text-[12px] text-[#5F645D]">{item.meta}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#B91C1C]"
          >
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
};
