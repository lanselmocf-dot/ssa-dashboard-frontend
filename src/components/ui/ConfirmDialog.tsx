import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, loading, danger, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} title={title} onClose={loading ? () => {} : onCancel}
      footer={<>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="text-sm text-slate-600">{children}</div>
    </Modal>
  );
}
