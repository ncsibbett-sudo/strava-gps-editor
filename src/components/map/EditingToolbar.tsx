import { useEffect } from 'react';
import { useMap } from '../../hooks/useMap';

export type EditingTool = 'trim' | 'smooth' | 'removeSpikes' | 'fillGap' | 'redraw' | 'deletePoints' | 'fixElevation' | null;

/**
 * Editing toolbar component with GPS editing tools, undo/redo, and reset
 */
export function EditingToolbar() {
  const { selectedTool, setSelectedTool, originalTrack, undo, redo, reset, canUndo, canRedo } = useMap();

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo, Escape = deselect tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTool(null);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setSelectedTool]);

  if (!originalTrack) {
    return null;
  }

  const tools = [
    {
      id: 'trim' as EditingTool,
      name: 'Trim',
      icon: '✂️',
      description: 'Trim start/end points',
    },
    {
      id: 'removeSpikes' as EditingTool,
      name: 'Remove Spikes',
      icon: '🎯',
      description: 'Remove GPS spikes',
    },
    {
      id: 'smooth' as EditingTool,
      name: 'Smooth',
      icon: '〰️',
      description: 'Smooth GPS track',
    },
    {
      id: 'fillGap' as EditingTool,
      name: 'Fill Gap',
      icon: '🔗',
      description: 'Fill GPS gaps',
    },
    {
      id: 'redraw' as EditingTool,
      name: 'Redraw',
      icon: '✏️',
      description: 'Redraw section with waypoints',
    },
    {
      id: 'deletePoints' as EditingTool,
      name: 'Delete Points',
      icon: '🗑️',
      description: 'Click points to delete them',
    },
    {
      id: 'fixElevation' as EditingTool,
      name: 'Fix Elevation',
      icon: '⛰️',
      description: 'Fix elevation from terrain data',
    },
  ];

  const handleToolClick = (toolId: EditingTool) => {
    setSelectedTool(selectedTool === toolId ? null : toolId);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3 space-y-3">
      <h3 className="text-xs font-semibold text-gray-300">Editing Tools</h3>

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

      {/* Undo / Redo */}
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

      {/* Reset to Original */}
      <button
        onClick={reset}
        className="w-full px-3 py-2 bg-gray-700 hover:bg-red-700 text-gray-300 hover:text-white rounded text-xs font-medium transition-colors"
        title="Reset all edits to the original track"
      >
        Reset to Original
      </button>
    </div>
  );
}
