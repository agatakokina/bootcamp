import { useState } from "react";

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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

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
      <div className="modal modal-small" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>
          Are you sure you want to {actionVerb} <strong>{label}</strong>?
          {irreversible ? " This action cannot be undone." : ""}
        </p>

        {warning && <p className="form-warning">{warning}</p>}
        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={deleting}>
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
