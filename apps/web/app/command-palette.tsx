"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getIncidents } from "@/lib/api";
import type { Incident } from "@/types/api";

const pages = [
  { label: "Command Center", path: "/", hint: "Overview" },
  { label: "Submit evidence", path: "/evidence", hint: "Intake" },
  { label: "Audit log", path: "/audit", hint: "Traceability" },
];

export default function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isOpen) {
          setIsOpen(false);
          window.requestAnimationFrame(() => returnFocusRef.current?.focus());
        } else {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setQuery("");
          setIsOpen(true);
        }
      }
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    getIncidents().then(setIncidents).catch(() => setIncidents([]));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    const pageResults = pages
      .filter((page) => !search || `${page.label} ${page.hint}`.toLowerCase().includes(search))
      .map((page) => ({ label: page.label, path: page.path, hint: page.hint }));
    const roomResults = incidents
      .filter((incident) => !search || `${incident.zone} ${incident.id}`.toLowerCase().includes(search))
      .map((incident) => ({
        label: incident.zone.replaceAll("-", " "),
        path: `/incidents/${encodeURIComponent(incident.id)}`,
        hint: incident.id,
      }));
    return [...pageResults, ...roomResults];
  }, [incidents, query]);

  function navigate(path: string) {
    setIsOpen(false);
    router.push(path);
  }

  function closePalette() {
    setIsOpen(false);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  return (
    <>
      <button
        className="palette-trigger"
        ref={triggerRef}
        type="button"
        aria-label="Open command palette"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={() => {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
          setQuery("");
          setIsOpen(true);
        }}
      >
        <span aria-hidden="true">⌕</span>
        <span>Jump to</span>
        <kbd>⌘ K</kbd>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closePalette();
            }}
          >
            <motion.section
              className="command-palette"
              role="dialog"
              aria-modal="true"
              aria-labelledby="command-palette-title"
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ duration: 0.16 }}
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const controls = event.currentTarget.querySelectorAll<HTMLElement>("input, button");
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
            >
              <h2 id="command-palette-title" className="visually-hidden">Navigate NIRBHAR</h2>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages and rooms…"
                aria-label="Search pages and rooms"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results[0]) {
                    event.preventDefault();
                    navigate(results[0].path);
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".palette-result")?.focus();
                  }
                }}
              />
              <div className="palette-results" role="group" aria-label="Navigation results">
                {results.length ? results.map((result) => (
                  <button
                    className="palette-result"
                    type="button"
                    key={result.path}
                    onClick={() => navigate(result.path)}
                  >
                    <span>{result.label}</span>
                    <small>{result.hint}</small>
                  </button>
                )) : <p className="palette-empty">No matching pages or rooms.</p>}
              </div>
              <footer><kbd>ESC</kbd><span>Close</span><kbd>↵</kbd><span>Open selection</span></footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}