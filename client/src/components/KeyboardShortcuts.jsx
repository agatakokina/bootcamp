import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SHORTCUTS } from "../constants/shortcuts.js";
import QuickSearchModal from "./QuickSearchModal.jsx";
import ShortcutsHelpModal from "./ShortcutsHelpModal.jsx";

const SEQUENCE_TIMEOUT_MS = 1000;

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingSequenceRef = useRef([]);
  const sequenceTimerRef = useRef(null);

  useEffect(() => {
    function resetSequence() {
      pendingSequenceRef.current = [];
      if (sequenceTimerRef.current) {
        clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = null;
      }
    }

    function handleKeyDown(e) {
      // Never hijack typing in a real input/textarea/contenteditable field.
      if (isEditableTarget(e.target)) return;
      // While a shortcut modal is open, let it own the keyboard (arrows, Enter, Escape).
      if (quickSearchOpen || helpOpen) return;

      const mod = e.metaKey || e.ctrlKey;

      const comboMatch = SHORTCUTS.find(
        (s) =>
          s.type === "combo" &&
          s.key.toLowerCase() === e.key.toLowerCase() &&
          Boolean(s.mod) === mod &&
          Boolean(s.shift) === e.shiftKey
      );

      if (comboMatch) {
        e.preventDefault();
        resetSequence();
        if (comboMatch.action === "openQuickSearch") setQuickSearchOpen(true);
        if (comboMatch.action === "openHelp") setHelpOpen(true);
        return;
      }

      // Sequence shortcuts (e.g. "g" then "t") never involve modifier keys.
      if (mod || e.altKey || e.shiftKey) {
        resetSequence();
        return;
      }

      const key = e.key.toLowerCase();
      if (key.length !== 1 || !/[a-z]/.test(key)) {
        resetSequence();
        return;
      }

      const nextSequence = [...pendingSequenceRef.current, key];

      const exactMatch = SHORTCUTS.find(
        (s) =>
          s.type === "sequence" &&
          s.keys.length === nextSequence.length &&
          s.keys.every((k, i) => k === nextSequence[i])
      );
      const isPrefix = SHORTCUTS.some(
        (s) =>
          s.type === "sequence" &&
          s.keys.length > nextSequence.length &&
          s.keys.slice(0, nextSequence.length).every((k, i) => k === nextSequence[i])
      );

      if (exactMatch) {
        e.preventDefault();
        navigate(exactMatch.path);
        resetSequence();
      } else if (isPrefix) {
        pendingSequenceRef.current = nextSequence;
        clearTimeout(sequenceTimerRef.current);
        sequenceTimerRef.current = setTimeout(resetSequence, SEQUENCE_TIMEOUT_MS);
      } else {
        resetSequence();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      resetSequence();
    };
  }, [navigate, quickSearchOpen, helpOpen]);

  return (
    <>
      {quickSearchOpen && <QuickSearchModal onClose={() => setQuickSearchOpen(false)} />}
      {helpOpen && <ShortcutsHelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}

export default KeyboardShortcuts;
