// A generic tabbed, collapsible side pane.
//
// It knows about tabs, collapse and keyboard behaviour, and NOTHING about
// projects, Pulse, or any domain concept. Taylor's stated goal is to reuse it
// across most sections; M12 mounts it in exactly one place (spec section 7.1).
// Wiring eight working screens before the pattern has been lived with would be
// section 6 RED scope expansion, so each later adoption is a few lines instead.
//
// 🛑 The collapse rule that keeps it accessible: collapsing hides the PANEL but
// never the tab rail. No content may be reachable only by expanding, so the
// rail stays visible with accessible names and activating a tab re-expands.

import { useEffect, useId, useRef, useState } from 'react'

// Collapse persistence lives in sidePaneState.js and is driven by the PARENT,
// so this component stays fully controlled and has no storage concern of its
// own. That is also what lets a future adopter persist it differently, or not
// at all, without touching this file.
export default function SidePane({ tabs = [], activeTab, onTabChange, collapsed = false, onToggle, label = 'Details' }) {
  const baseId = useId()
  const tabRefs = useRef(new Map())
  // Tracks which tab the user reached with the keyboard, so focus follows
  // arrow keys without stealing focus on an ordinary re-render.
  const [pendingFocus, setPendingFocus] = useState(null)

  useEffect(() => {
    if (pendingFocus === null) return
    tabRefs.current.get(pendingFocus)?.focus()
    setPendingFocus(null)
  }, [pendingFocus])

  if (tabs.length === 0) return null

  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab))
  const active = tabs[activeIndex]

  function selectAt(index) {
    const next = tabs[(index + tabs.length) % tabs.length]
    if (!next) return
    onTabChange?.(next.id)
    setPendingFocus(next.id)
  }

  // Standard tablist keys. Arrow keys move AND select (an automatic tablist),
  // which is correct here because every panel is already rendered from local
  // state -- there is no fetch to trigger by accident.
  function onKeyDown(event) {
    switch (event.key) {
      case 'ArrowRight': case 'ArrowDown': event.preventDefault(); selectAt(activeIndex + 1); break
      case 'ArrowLeft': case 'ArrowUp': event.preventDefault(); selectAt(activeIndex - 1); break
      case 'Home': event.preventDefault(); selectAt(0); break
      case 'End': event.preventDefault(); selectAt(tabs.length - 1); break
      default: break
    }
  }

  function activate(tabId) {
    onTabChange?.(tabId)
    // Choosing a tab while collapsed is an unambiguous request to see it.
    if (collapsed) onToggle?.(false)
  }

  return <aside className={`side-pane${collapsed ? ' side-pane-collapsed' : ''}`} aria-label={label}>
    <div className="side-pane-head">
      {!collapsed && <span className="side-pane-title">{label}</span>}
      <button
        type="button"
        className="side-pane-toggle"
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        onClick={() => onToggle?.(!collapsed)}
      >{collapsed ? '‹' : '›'}</button>
    </div>

    <div className="side-pane-tabs" role="tablist" aria-label={label} aria-orientation="vertical" onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === active.id
        return <button
          key={tab.id}
          type="button"
          role="tab"
          id={`${baseId}-tab-${tab.id}`}
          className={`side-pane-tab${selected ? ' side-pane-tab-active' : ''}`}
          aria-selected={selected}
          aria-controls={`${baseId}-panel-${tab.id}`}
          // Roving tabindex: one stop for the whole rail, arrows move within it.
          tabIndex={selected ? 0 : -1}
          ref={(node) => { if (node) tabRefs.current.set(tab.id, node); else tabRefs.current.delete(tab.id) }}
          onClick={() => activate(tab.id)}
        >
          {/* Collapsed shows the initial, but the full label stays in the
              accessible name so the rail is never a row of mystery glyphs. */}
          <span className="side-pane-tab-label">{collapsed ? tab.label.slice(0, 1) : tab.label}</span>
          {collapsed && <span className="visually-hidden">{tab.label}</span>}
        </button>
      })}
    </div>

    {!collapsed && <div
      className="side-pane-panel"
      role="tabpanel"
      id={`${baseId}-panel-${active.id}`}
      aria-labelledby={`${baseId}-tab-${active.id}`}
      tabIndex={0}
    >{active.render?.()}</div>}
  </aside>
}
