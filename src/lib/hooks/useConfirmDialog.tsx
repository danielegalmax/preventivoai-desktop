import { useCallback, useState } from "react";
import ConfirmDialog from "../../components/ConfirmDialog";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  zClass?: string;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  const dialog = pending ? (
    <ConfirmDialog
      title={pending.title ?? "Conferma"}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      destructive={pending.destructive ?? true}
      zClass={pending.zClass}
      onConfirm={() => handleClose(true)}
      onCancel={() => handleClose(false)}
    />
  ) : null;

  return { confirm, dialog };
}
