import { useEffect, useState } from 'react';
import { useMap } from '../../hooks/useMap';
import { HelpModal } from '../HelpModal';

export type EditingTool = 'trim' | 'smooth' | 'removeSpikes' | 'fillGap' | 'redraw' | 'deletePoints' | 'fixElevation' | null;

/**
 * Editing toolbar component with GPS editing tools, undo/redo, and reset
 */
export function EditingToolbar() {
  const { selectedTool, setSelectedTool, originalTrack, undo, redo, reset, canUndo, canRedo } = useMap();
  const [showHelp, setShowHelp] = useState(false);

  // Keyboard shortcuts: Ctrl+Z/Y = undo/redo, Escape = deselect, 1–7 = select tool
  useEffect(() => {
    const toolKeys: Record<string, EditingTool> = {
      '1': 'trim', '2': 'removeSpikes', '3': 'smooth',
      '4': 'fillGap', '5': 'redraw', '6': 'deletePoints', '7': 'fixElevation',
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') { setSelectedTool(null); return; }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
        return;
      }

      const tool = toolKeys[e.key];
      if (tool) {
        e.preventDefault();
        setSelectedTool(selectedTool === tool ? null : tool);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setSelectedTool, selectedTool]);

  if (!originalTrack) {
    return null;
  }

  const tools = [
    { id: 'trim' as EditingTool,         name: 'Trim',          icon: '✂️',  description: 'Trim start/end points (key: 1)' },
    { id: 'removeSpikes' as EditingTool, name: 'Remove Spikes', icon: '🎯',  description: 'Remove GPS spikes (key: 2)' },
    { id: 'smooth' as EditingTool,       name: 'Smooth',        icon: '〰️', description: 'Smooth GPS track (key: 3)' },
    { id: 'fillGap' as EditingTool,      name: 'Fill Gap',      icon: '🔗',  description: 'Fill GPS gaps (key: 4)' },
    { id: 'redraw' as EditingTool,       name: 'Redraw',        icon: '✏️',  description: 'Redraw section with waypoints (key: 5)' },
    { id: 'deletePoints' as EditingTool, name: 'Delete Points', icon: '🗑️', description: 'Click points to delete them (key: 6)' },
    { id: 'fixElevation' as EditingTool, name: 'Fix Elevation', icon: '⛰️', description: 'Fix elevation from terrain data (key: 7)' },
  ];

  const handleToolClick = (toolId: EditingTool) => {
    setSelectedTool(selectedTool === toolId ? null : toolId);
  };

  return (
    <>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* ── Desktop layout: vertical grid panel ───────────────────────── */}
      <div className="hidden md:block bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-300">Editing Tools</h3>
          <button
            onClick={() => setShowHelp(true)}
            className="text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-gray-700 transition-colors"
            title="Help & keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={`p-2 rounded-lg text-left transition-colors ${
                selectedTool === tool.id
                  ? 'bg-strava-orange text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title={tool.description}
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">{tool.icon}</span>
                <span className="text-xs font-medium whitespace-nowrap">{tool.name}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo()}
            title="Undo (Ctrl+Z)"
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↩ Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            title="Redo (Ctrl+Y)"
            className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Redo ↪
          </button>
        </div>

        <button
          onClick={reset}
          className="w-full px-3 py-2 bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white rounded text-xs font-medium transition-colors"
          title="Reset all edits to the original track"
        >
          Reset to Original
        </button>
      </div>

      {/* ── Mobile layout: horizontal scrollable strip ─────────────────── */}
      <div className="md:hidden flex items-center gap-1 px-2 py-1 overflow-x-auto">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[56px] min-h-[56px] px-2 py-1 rounded-lg transition-colors ${
              selectedTool === tool.id
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 active:bg-gray-600'
            }`}
            title={tool.description}
          >
            <span className="text-xl leading-none">{tool.icon}</span>
            <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap leading-tight">
              {tool.name}
            </span>
          </button>
        ))}

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-10 bg-gray-600 mx-1" />

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          title="Undo"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] min-h-[56px] px-2 py-1 rounded-lg bg-gray-700 text-gray-300 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-lg leading-none">↩</span>
          <span className="text-[10px] mt-0.5">Undo</span>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo()}
          title="Redo"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] min-h-[56px] px-2 py-1 rounded-lg bg-gray-700 text-gray-300 active:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-lg leading-none">↪</span>
          <span className="text-[10px] mt-0.5">Redo</span>
        </button>

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-10 bg-gray-600 mx-1" />

        {/* Reset */}
        <button
          onClick={reset}
          title="Reset to original"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] min-h-[56px] px-2 py-1 rounded-lg bg-gray-700 text-gray-300 active:bg-gray-600 hover:bg-red-800 hover:text-white transition-colors"
        >
          <span className="text-lg leading-none">↺</span>
          <span className="text-[10px] mt-0.5">Reset</span>
        </button>

        {/* Divider */}
        <div className="flex-shrink-0 w-px h-10 bg-gray-600 mx-1" />

        {/* Help */}
        <button
          onClick={() => setShowHelp(true)}
          title="Help & shortcuts"
          className="flex-shrink-0 flex flex-col items-center justify-center min-w-[48px] min-h-[56px] px-2 py-1 rounded-lg bg-gray-700 text-gray-300 active:bg-gray-600 hover:bg-gray-600 hover:text-white transition-colors"
        >
          <span className="text-lg leading-none font-bold">?</span>
          <span className="text-[10px] mt-0.5">Help</span>
        </button>
      </div>
    </>
  );
}
