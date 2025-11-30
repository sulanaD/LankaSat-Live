import LayerSelector from './LayerSelector';
import DateSlider from './DateSlider';
import Legend from './Legend';

function Sidebar({ 
  isOpen, 
  layers, 
  selectedLayer, 
  onLayerChange, 
  selectedDate, 
  onDateChange,
  currentLayerConfig 
}) {
  return (
    <aside 
      className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0'}
        w-80 lg:w-80 bg-dark border-r border-gray-700 flex flex-col
        transition-all duration-300 ease-in-out absolute lg:relative
        h-full z-[1000] lg:z-auto
      `}
    >
      <div className={`${isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-0'} transition-opacity duration-200 flex flex-col h-full overflow-hidden`}>
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🎛️</span>
            <span>Controls</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Select layer and date to view
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Layer selector */}
          <LayerSelector 
            layers={layers}
            selectedLayer={selectedLayer}
            onLayerChange={onLayerChange}
          />

          {/* Date selector */}
          <DateSlider 
            selectedDate={selectedDate}
            onDateChange={onDateChange}
          />

          {/* Legend */}
          <Legend layerConfig={currentLayerConfig} />
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
          <p>Data source: Copernicus Sentinel Hub</p>
          <p className="mt-1">© {new Date().getFullYear()} LankaSat Live</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
