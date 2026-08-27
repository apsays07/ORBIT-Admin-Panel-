"use client";

import { useEffect, useRef } from "react";

export interface ModalKeyboardOptions {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  isSubmitting?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  disableEnterConfirm?: boolean;
}

/**
 * Reusable keyboard shortcut and focus management hook for modals, dialogs, and drawers.
 * - Handles ESC to dismiss/close safely.
 * - Handles ENTER to confirm or submit (respecting textareas & loading state).
 * - Restores focus to the triggering element upon closing.
 * - Automatically focuses initialFocusRef or first input when opened.
 */
export function useModalKeyboardShortcuts({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  initialFocusRef,
  disableEnterConfirm = false,
}: ModalKeyboardOptions) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element to restore focus upon close
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    // Auto-focus designated input or first interactive element
    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    }, 50);

    function handleKeyDown(e: KeyboardEvent) {
      // 1. ESC KEY -> Dismiss/Close
      if (e.key === "Escape" || e.key === "Esc") {
        if (!isSubmitting) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
        return;
      }

      // 2. ENTER KEY -> Primary confirmation if not handled by a native form
      if (e.key === "Enter" && onConfirm && !disableEnterConfirm) {
        const target = e.target as HTMLElement | null;
        const isTextarea = target?.tagName === "TEXTAREA" || target?.isContentEditable;

        // If in textarea, standard Enter creates a newline. Ctrl/Cmd+Enter triggers submit.
        if (isTextarea && !(e.ctrlKey || e.metaKey)) {
          return;
        }

        // If target is a standard button or link, let native click trigger
        if (target?.tagName === "BUTTON" && target?.getAttribute("type") !== "submit") {
          return;
        }

        if (!isSubmitting) {
          e.preventDefault();
          onConfirm();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown, true);

      // Restore focus
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // Ignore if unmounted
        }
      }
    };
  }, [isOpen, onClose, onConfirm, isSubmitting, initialFocusRef, disableEnterConfirm]);
}

import { useState } from "react";

export interface DropdownKeyboardOptions {
  isOpen: boolean;
  itemCount?: number;
  itemsCount?: number;
  selectedIndex?: number;
  setSelectedIndex?: React.Dispatch<React.SetStateAction<number>>;
  onSelect?: (index: number) => void;
  onSelectIndex?: (index: number) => void;
  onClose?: () => void;
  setIsOpen?: (open: boolean) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Reusable keyboard navigation hook for dropdowns and select menus.
 * - ArrowUp / ArrowDown cycles highlighted option.
 * - ENTER selects highlighted option and closes menu.
 * - ESC closes menu without resetting the value.
 */
export function useDropdownKeyboard({
  isOpen,
  itemCount,
  itemsCount,
  selectedIndex,
  setSelectedIndex,
  onSelect,
  onSelectIndex,
  onClose,
  setIsOpen,
}: DropdownKeyboardOptions) {
  const count = itemsCount !== undefined ? itemsCount : (itemCount || 0);
  const [internalIndex, setInternalIndex] = useState(0);

  const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;
  const updateIndex = setSelectedIndex || setInternalIndex;

  const handleSelect = onSelectIndex || onSelect;
  const handleClose = () => {
    if (onClose) onClose();
    if (setIsOpen) setIsOpen(false);
  };

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (setIsOpen) setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
      return;
    }

    if (count === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      updateIndex((prev) => (prev + 1) % count);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      updateIndex((prev) => (prev - 1 + count) % count);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (e.key === "Enter") {
        e.preventDefault();
      }
      if (activeIndex >= 0 && activeIndex < count) {
        if (handleSelect) {
          handleSelect(activeIndex);
        }
        handleClose();
      }
    }
  }

  return {
    highlightedIndex: activeIndex,
    selectedIndex: activeIndex,
    setHighlightedIndex: updateIndex,
    handleKeyDown,
  };
}
