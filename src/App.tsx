import React, { useEffect, useState, useRef } from 'react';
import ControlPanel from './components/ControlPanel';
import ViewSwitcher from './components/ViewSwitcher';
import AuthPage from './components/AuthPage';
import { ConfigState, ViewConfig } from './types';
import { SketchfabService } from './services/sketchfabService';
import { generateTexture } from './services/canvasService';
import { supabase } from './services/supabaseClient';
import { logAction } from './services/logger';
import { Loader2 } from 'lucide-react';

const DEFAULT_VIEW_STATE: ViewConfig = {
  text: {
    content: '',
    color: '#000000',
    fontFamily: 'Arial',
    fontSize: 5,
    transform: { x: 50, y: 30, scale: 1, rotation: 0 }
  },
  image: {
    src: null,
    transform: { x: 50, y: 50, scale: 1, rotation: 0 }
  }
};

const INITIAL_STATE: ConfigState = {
  baseColor: '#ffffff',
  front: {
    ...DEFAULT_VIEW_STATE,
    text: { ...DEFAULT_VIEW_STATE.text, content: 'ZHEIDE' }
  },
  back: {
    ...DEFAULT_VIEW_STATE,
    text: { ...DEFAULT_VIEW_STATE.text, content: '' }
  }
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [config, setConfig] = useState<ConfigState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingTexture, setIsUpdatingTexture] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sketchfabService = useRef<SketchfabService | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check Authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        logAction(session.user.id, session.user.email, 'login', 'User logged into the app');
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Track auth state transitions (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
      try {
        if (event === 'SIGNED_IN' && session?.user) {
          logAction(session.user.id, session.user.email, 'login_success', 'User signed in via auth state change');
        } else if (event === 'SIGNED_OUT') {
          // session will be null on sign out; we log with unknown user id/email when not available
          logAction(session?.user?.id || 'unknown', session?.user?.email || undefined, 'logout', 'User signed out');
        }
      } catch (err) {
        // Non-fatal — don't block auth handling for logging errors
        console.warn('Auth logging failed', err);
      }

      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize Viewer on Mount (Only if logged in)
  useEffect(() => {
    if (!session) return;

    // Small delay to ensure DOM is ready if we just logged in
    const timer = setTimeout(() => {
      sketchfabService.current = new SketchfabService('api-frame');

      sketchfabService.current.initialize()
        .then(() => {
          setIsLoading(false);
          triggerTextureUpdate();
        })
        .catch((err) => {
          console.error("Viewer init failed", err);
          setError("3D көріністі жүктеу мүмкін болмады. Интернет байланысын тексеріңіз.");
          setIsLoading(false);
        });
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Debounced Texture Update
  useEffect(() => {
    if (isLoading || !session) return;

    const timeoutId = setTimeout(() => {
      triggerTextureUpdate();
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, isLoading, session]);

  const triggerTextureUpdate = async () => {
    if (!sketchfabService.current) return;

    setIsUpdatingTexture(true);
    try {
      const textureBase64 = await generateTexture(config);
      await sketchfabService.current.updateTexture(textureBase64);
    } catch (err) {
      console.error("Texture update failed", err);
    } finally {
      setIsUpdatingTexture(false);
    }
  };

  const handleDownload = async () => {
    const textureBase64 = await generateTexture(config);
    const link = document.createElement('a');
    link.href = textureBase64;
    link.download = 'mening-zheidem.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (session) {
      logAction(session.user.id, session.user.email, 'download_design', 'User downloaded texture');
    }
  };

  const handleViewChange = (view: 'front' | 'back' | 'left' | 'right') => {
    sketchfabService.current?.setCameraView(view);
  };

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen w-full bg-white overflow-hidden font-sans text-slate-800">

      {/* Sidebar Controls */}
      <ControlPanel
        config={config}
        setConfig={setConfig}
        onDownloadPreview={handleDownload}
        isUpdating={isUpdatingTexture}
        onViewChangeRequest={handleViewChange}
        user={session.user}
      />

      {/* 3D Viewer Area */}
      <main className="flex-1 relative bg-gray-100">

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-800">Дизайн Студиясы іске қосылуда...</h2>
            <p className="text-gray-500 mt-2 text-sm">3D қозғалтқыш пен модельдер жүктелуде</p>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-8 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Байланыс қатесі</h3>
            <p className="text-gray-600 max-w-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              Қайта көру
            </button>
          </div>
        )}

        {/* Right Side View Switcher */}
        <ViewSwitcher onViewChange={handleViewChange} />

        {/* Iframe for Sketchfab */}
        <iframe
          ref={iframeRef}
          title="Sketchfab Viewer"
          id="api-frame"
          allow="autoplay; fullscreen; vr"
          className="w-full h-full border-none outline-none block"
        />

        {/* Floating Watermark */}
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-[10px] font-medium text-gray-500 pointer-events-none z-20 shadow-sm border border-gray-100">
          Sketchfab API ұсынған
        </div>

      </main>
    </div>
  );
}

export default App;
