import { useEffect, useRef } from "react";
import { SHORTCUTS } from "../constants/shortcuts.js";

function groupByCategory(shortcuts) {
  const groups = [];
  shortcuts.forEach((shortcut) => {
    let group = groups.find((g) => g.category === shortcut.category);
    if (!group) {
      group = { category: shortcut.category, items: [] };
      groups.push(group);
    }
    group.items.push(shortcut);
  });
  return groups;
}

function ShortcutsHelpModal({ onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const groups = groupByCategory(SHORTCUTS);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        className="modal modal-small"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">Keyboard Shortcuts</h2>
        {groups.map((group) => (
          <div className="shortcuts-group" key={group.category}>
            <h3>{group.category}</h3>
            <div className="shortcuts-list">
              {group.items.map((shortcut) => (
                <div className="shortcuts-row" key={shortcut.id}>
                  <kbd>{shortcut.label}</kbd>
                  <span>{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShortcutsHelpModal;
