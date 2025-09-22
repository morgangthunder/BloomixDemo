import React, { useState, useRef, useCallback, useEffect } from 'react';
import ContentProcessingNav from './ContentProcessingNav';
import { PaperAirplaneIcon, GripVerticalIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, MenuIcon, ChevronDownIcon, ChevronRightIcon, ExpandIcon, MinimizeIcon } from './Icon';

interface InteractionBuilderPageProps {
  onExit: () => void;
}

const InteractionBuilderPage: React.FC<InteractionBuilderPageProps> = ({ onExit }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [navWidth, setNavWidth] = useState(384);
  const navWidthBeforeCollapse = useRef(384);
  const isResizing = useRef(false);
  const minNavWidth = 280;
  const maxNavWidth = 600;

  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [code, setCode] = useState(`// This is a mock code editor.
// Define your interaction logic here.

function onClick(elementId) {
  console.log(\`Element \${elementId} clicked.\`);
  // Trigger custom event
  triggerEvent('elementClicked', { id: elementId });
}

function onComplete() {
  console.log('Interaction completed.');
  // Trigger system event
  triggerEvent('completed');
}
`);
  const mockEvents = ['onLoad', 'onClick', 'onComplete', 'elementClicked'];
  const [isEventsCollapsed, setIsEventsCollapsed] = useState(true);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  
  // Snackbar State
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const snackbarTimeoutRef = useRef<number | null>(null);

  const showSnackbar = (message: string) => {
      if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
      }
      setSnackbar({ message, visible: true });
      snackbarTimeoutRef.current = window.setTimeout(() => {
          setSnackbar({ message: '', visible: false });
      }, 3000);
  };

  const handleTogglePreviewFullscreen = () => setIsPreviewFullscreen(p => !p);

  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
  };

  const handleMouseUp = useCallback(() => {
      isResizing.current = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (isResizing.current) {
          const newWidth = e.clientX;
          if (newWidth >= minNavWidth && newWidth <= maxNavWidth) {
              setNavWidth(newWidth);
          }
      }
  }, [minNavWidth, maxNavWidth]);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [handleMouseMove, handleMouseUp]);
  
  const toggleNavCollapse = () => {
    setNavWidth(currentWidth => {
      if (currentWidth > 0) {
        navWidthBeforeCollapse.current = currentWidth;
        return 0;
      } else {
        return navWidthBeforeCollapse.current;
      }
    });
  };

  const isNavCollapsed = navWidth === 0;

  return (
    <div className="h-screen bg-brand-dark text-white font-sans overflow-hidden md:flex">
       {isMobileNavOpen && (
            <div onClick={() => setIsMobileNavOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden" />
        )}
      {/* Snackbar */}
        <div 
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand-red text-white py-2 px-6 rounded-lg shadow-lg transition-transform duration-300 z-50 ${snackbar.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            role="alert"
            aria-live="assertive"
        >
            {snackbar.message}
        </div>

      <aside 
        style={{ width: `${navWidth}px` }}
        className={`h-screen flex-col bg-brand-black transition-transform duration-300 ease-in-out z-40 
                   fixed w-80 top-0 left-0 transform ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} 
                   md:relative md:w-auto md:transform-none md:flex md:flex-shrink-0`}
      >
        { !isNavCollapsed && (
             <ContentProcessingNav 
                onExit={onExit}
                onToggleCollapse={toggleNavCollapse}
                onCloseMobileNav={() => setIsMobileNavOpen(false)}
                onProcessedContentChange={() => {}} // Mock prop
                selectedItem={null} // Mock prop
                onShowScript={() => {}} // Mock prop
                showSnackbar={showSnackbar}
            />
        )}
      </aside>

      <div 
          onMouseDown={handleMouseDown}
          className="w-2 h-full bg-gray-900 hover:bg-brand-red cursor-col-resize items-center justify-center relative group hidden md:flex"
      >
          <GripVerticalIcon className="w-5 h-5 text-gray-600" />
          <button 
            onClick={toggleNavCollapse}
            className="absolute z-10 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-brand-red text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title={isNavCollapsed ? "Expand" : "Collapse"}
          >
            {isNavCollapsed ? <ChevronDoubleRightIcon className="w-4 h-4" /> : <ChevronDoubleLeftIcon className="w-4 h-4" />}
          </button>
      </div>
      
      <div className="flex-1 flex flex-col h-screen relative">
        {isNavCollapsed && (
            <button
                onClick={toggleNavCollapse}
                className="absolute hidden md:block z-20 top-6 left-4 bg-gray-800 hover:bg-brand-red text-white p-2 rounded-full transition-opacity"
                title="Expand Navigation"
            >
                <ChevronDoubleRightIcon className="w-5 h-5" />
            </button>
        )}
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-brand-black border-b border-gray-700 flex-shrink-0">
            <button onClick={() => setIsMobileNavOpen(true)} className="text-white p-1">
                <MenuIcon className="w-6 h-6" />
            </button>
            <span className="font-semibold text-lg">Interaction Builder</span>
            <div className="w-7"></div>
        </header>

        <main className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto flex flex-col gap-8">
            {/* Events Area (collapsible) */}
            <div className="bg-brand-black rounded-lg border border-gray-700 flex-shrink-0">
                <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setIsEventsCollapsed(!isEventsCollapsed)}>
                    <h3 className="text-xl font-bold">Interaction Events</h3>
                    <button className="p-1 text-brand-gray hover:text-white">
                        {isEventsCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                    </button>
                </div>
                {!isEventsCollapsed && (
                    <div className="px-4 pb-4">
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                            {mockEvents.map(event => (
                                <li key={event} className="bg-brand-dark p-2 rounded-md text-sm font-mono text-brand-light-gray">{event}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Code & Preview Area (takes remaining space) */}
            <div className={`flex-1 flex flex-col bg-brand-black rounded-lg border border-gray-700 overflow-hidden relative ${isPreviewFullscreen ? 'fixed inset-0 z-50 bg-brand-dark p-4 md:p-8' : 'min-h-[50vh]'}`}>
                
                {/* Tabs - only show if not fullscreen */}
                {!isPreviewFullscreen && (
                    <div className="flex border-b border-gray-700 flex-shrink-0">
                        <button onClick={() => setActiveTab('code')} className={`flex-1 p-3 font-semibold transition-colors ${activeTab === 'code' ? 'bg-brand-dark text-white' : 'bg-brand-black text-brand-gray hover:bg-gray-800'}`}>
                            Code
                        </button>
                        <button onClick={() => setActiveTab('preview')} className={`flex-1 p-3 font-semibold transition-colors ${activeTab === 'preview' ? 'bg-brand-dark text-white' : 'bg-brand-black text-brand-gray hover:bg-gray-800'}`}>
                            Preview
                        </button>
                    </div>
                )}
                
                {/* Editor/Viewer */}
                <div className="flex-1 relative">
                    {(activeTab === 'code' && !isPreviewFullscreen) ? (
                        <textarea 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="absolute inset-0 w-full h-full bg-transparent text-white font-mono p-4 resize-none focus:outline-none"
                            spellCheck="false"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-brand-gray p-4">
                            <p>Live preview of the interaction will be displayed here.</p>
                        </div>
                    )}
                </div>

                {/* Fullscreen buttons - only show on preview tab OR if already fullscreen */}
                {(activeTab === 'preview' || isPreviewFullscreen) && (
                     <>
                        {isPreviewFullscreen ? (
                            <button onClick={handleTogglePreviewFullscreen} className="absolute bottom-4 left-4 p-2 bg-black/50 rounded-full text-white hover:bg-brand-red transition-colors" title="Minimize">
                                <MinimizeIcon className="w-6 h-6" />
                            </button>
                        ) : (
                            <button onClick={handleTogglePreviewFullscreen} className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-brand-red transition-colors" title="Expand">
                                <ExpandIcon className="w-6 h-6" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </main>
        
        <footer className="p-4 md:p-6 bg-brand-black border-t border-gray-700">
          <div className="flex items-center space-x-4">
             <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Ask AI to help write code..."
                className="w-full bg-brand-dark border border-gray-600 rounded-lg py-2 pl-4 pr-12 text-white placeholder-brand-gray focus:outline-none focus:ring-0"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-gray hover:text-white transition-colors">
                 <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default InteractionBuilderPage;