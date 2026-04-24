'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Settings,
  Trash2,
  User,
  Pencil,
  Check,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Project } from '@/types';
import { t } from '@/lib/i18n';

// ─── Project item ─────────────────────────────────────────────────────────────

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  isOpen: boolean; // sidebar open/collapsed
  onSwitch: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}

function ProjectItem({ project, isActive, isOpen, onSwitch, onRename, onDelete, onPin }: ProjectItemProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(project.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverOpen]);

  // Auto-focus rename input
  useEffect(() => {
    if (renaming) {
      setRenameVal(project.name);
      setTimeout(() => renameRef.current?.select(), 0);
    }
  }, [renaming, project.name]);

  const commitRename = () => {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== project.name) onRename(project.id, trimmed);
    setRenaming(false);
    setPopoverOpen(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      onDelete(project.id);
    } else {
      setConfirmDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 2500);
    }
  };

  const initials = project.name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  if (!isOpen) {
    // Collapsed: just a dot/initial with tooltip
    return (
      <button
        onClick={() => onSwitch(project.id)}
        title={project.name}
        className={`sidebar-item-collapsed ${isActive ? 'sidebar-item-collapsed--active' : ''}`}
      >
        <span className="text-[10px] font-bold">{initials.slice(0, 2)}</span>
      </button>
    );
  }

  return (
    <div
      className={`sidebar-project-item group ${isActive ? 'sidebar-project-item--active' : ''}`}
    >
      {/* Name / Rename input */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => !renaming && onSwitch(project.id)}
      >
        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setRenaming(false); setPopoverOpen(false); }
            }}
            onBlur={commitRename}
            onClick={e => e.stopPropagation()}
            className="sidebar-rename-input"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className={`sidebar-project-dot ${project.pinned ? 'sidebar-project-dot--pinned' : isActive ? 'sidebar-project-dot--active' : ''}`} />
            <span className="truncate text-xs">{project.name}</span>
          </div>
        )}
      </button>

      {/* Three-dot button */}
      {!renaming && (
        <div className="relative shrink-0" ref={popoverRef}>
          <button
            onClick={e => { e.stopPropagation(); setPopoverOpen(v => !v); }}
            className="sidebar-dots-btn opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreHorizontal size={14} />
          </button>

          {popoverOpen && (
            <div className="sidebar-popover">
              <button
                className="sidebar-popover-item"
                onClick={() => { setRenaming(true); setPopoverOpen(false); }}
              >
                <Pencil size={12} /> Rename
              </button>
              <button
                className="sidebar-popover-item"
                onClick={() => { onPin(project.id); setPopoverOpen(false); }}
              >
                {project.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                {project.pinned ? 'Unpin' : 'Pin'}
              </button>
              <div className="h-px bg-gray-700 my-1" />
              <button
                className={`sidebar-popover-item sidebar-popover-item--danger ${confirmDelete ? 'sidebar-popover-item--confirm' : ''}`}
                onClick={handleDelete}
              >
                <Trash2 size={12} />
                {confirmDelete ? 'Confirm?' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      )}

      {renaming && (
        <button onClick={commitRename} className="shrink-0 text-indigo-400 hover:text-indigo-300 p-1">
          <Check size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function ProjectSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const {
    lang,
    projects,
    currentProjectId,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
    togglePinProject,
  } = useApp();

  const pinned = projects.filter(p => p.pinned);
  const unpinned = projects.filter(p => !p.pinned);

  return (
    <aside
      className="sidebar"
      style={{ width: isOpen ? 220 : 52 }}
    >
      {/* ── Header: logo + collapse ─────────────────────────────────────── */}
      <div className="sidebar-header">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <GitBranch size={13} className="text-white" />
          </div>
          {isOpen && (
            <span className="text-sm font-bold text-white tracking-tight truncate">
              {t(lang, 'title')}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(v => !v)}
          className="sidebar-toggle-btn"
          title={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* ── New Project button ──────────────────────────────────────────── */}
      <div className="px-2 py-2">
        <button
          onClick={createProject}
          title={t(lang, 'newProject')}
          className={`sidebar-new-btn ${isOpen ? 'sidebar-new-btn--open' : 'sidebar-new-btn--collapsed'}`}
        >
          <Plus size={14} />
          {isOpen && <span className="text-xs font-medium">{t(lang, 'newProject')}</span>}
        </button>
      </div>

      {/* ── Project lists ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1 pb-2">
        {/* Pinned */}
        {pinned.length > 0 && (
          <>
            {isOpen && (
              <p className="sidebar-section-label">
                <Pin size={9} className="inline mr-1" />{t(lang, 'pinned')}
              </p>
            )}
            {pinned.map(p => (
              <ProjectItem
                key={p.id}
                project={p}
                isActive={p.id === currentProjectId}
                isOpen={isOpen}
                onSwitch={switchProject}
                onRename={renameProject}
                onDelete={deleteProject}
                onPin={togglePinProject}
              />
            ))}
            {isOpen && <div className="h-px bg-gray-800 my-1" />}
          </>
        )}

        {/* All projects */}
        {isOpen && unpinned.length > 0 && (
          <p className="sidebar-section-label">{t(lang, 'allProjects')}</p>
        )}
        {unpinned.map(p => (
          <ProjectItem
            key={p.id}
            project={p}
            isActive={p.id === currentProjectId}
            isOpen={isOpen}
            onSwitch={switchProject}
            onRename={renameProject}
            onDelete={deleteProject}
            onPin={togglePinProject}
          />
        ))}
      </div>

      {/* ── Bottom bar: avatar + settings + toggle ─────────────────────── */}
      <div className="sidebar-bottom">
        {/* Avatar */}
        <button
          className="sidebar-avatar"
          title="Account"
        >
          <User size={14} />
        </button>

        {isOpen && (
          <>
            {/* Settings link */}
            <Link
              href="/settings"
              className="sidebar-icon-btn"
              title={t(lang, 'settingsTitle')}
            >
              <Settings size={14} />
            </Link>

            {/* Collapse arrow */}
            <button
              onClick={() => setIsOpen(false)}
              className="sidebar-icon-btn ml-auto"
              title="Collapse"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}

        {!isOpen && (
          <>
            <Link href="/settings" className="sidebar-icon-btn" title={t(lang, 'settingsTitle')}>
              <Settings size={14} />
            </Link>
            <button onClick={() => setIsOpen(true)} className="sidebar-icon-btn" title="Expand">
              <ChevronRight size={14} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
