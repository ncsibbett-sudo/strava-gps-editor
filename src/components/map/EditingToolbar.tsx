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
    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-3">
      <h3 className="text-xs font-semibold text-gray-300 mb-2">Editing Tools</h3>

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
    </div>
  );
}
