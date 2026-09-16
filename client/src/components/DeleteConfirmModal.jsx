import { useEffect, useRef, useState } from "react";

function DeleteConfirmModal({
  title = "Confirm Delete",
  label,
  warning,
  actionVerb = "delete",
  irreversible = true,
  confirmLabel = "Delete",
  confirmingLabel = "Deleting...",
  onClose,
  onConfirm,
}) {
  // Focus lands on Cancel, not the destructive action, so a stray Enter
  // keypress on open can't trigger the delete.
  const cancelRef = useRef(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-small"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <p>
          Are you sure you want to {actionVerb} <strong>{label}</strong>?
          {irreversible ? " This action cannot be undone." : ""}
        </p>

        {warning && <p className="form-warning">{warning}</p>}
        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" ref={cancelRef} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={handleConfirm} disabled={deleting}>
            {deleting ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
