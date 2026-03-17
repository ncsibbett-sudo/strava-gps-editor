import { useMap } from '../../hooks/useMap';

export type EditingTool = 'trim' | 'smooth' | 'removeSpikes' | 'fillGap' | null;

/**
 * Editing toolbar component with GPS editing tools
 */
export function EditingToolbar() {
  const { selectedTool, setSelectedTool, originalTrack } = useMap();

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
  ];

  const handleToolClick = (toolId: EditingTool) => {
    if (selectedTool === toolId) {
      // Deselect tool if clicking the same one
      setSelectedTool(null);
    } else {
      setSelectedTool(toolId);
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-[1000] max-w-xs">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">Editing Tools</h3>

      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`p-3 rounded-lg text-left transition-colors ${
              selectedTool === tool.id
                ? 'bg-strava-orange text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={tool.description}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{tool.icon}</span>
              <span className="text-sm font-medium">{tool.name}</span>
            </div>
          </button>
        ))}
      </div>

      {selectedTool && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400">
            {tools.find((t) => t.id === selectedTool)?.description}
          </p>
          <button
            onClick={() => setSelectedTool(null)}
            className="mt-2 text-xs text-strava-orange hover:text-orange-400"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
