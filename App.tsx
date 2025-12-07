import React, { useState, useEffect, useRef } from 'react';
import { Scene } from './components/Scene';
import { analyzeGesture } from './services/geminiService';
import { TreeState } from './types';

const App = () => {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [treeState, setTreeState] = useState<TreeState>(TreeState.CHAOS);
  const [handPos, setHandPos] = useState({ x: 0.5, y: 0.5 });
  const [geminiStatus, setGeminiStatus] = useState("Waiting for input...");
  const [isRequesting, setIsRequesting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loopRef = useRef<number | null>(null);
  const isAnalyzing = useRef(false);

  // Request Camera
  const startExperience = async () => {
    try {
      setIsRequesting(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        } 
      });
      setStream(mediaStream);
      setHasPermission(true);
      setIsRequesting(false);
    } catch (err) {
      console.error("Camera Error:", err);
      setIsRequesting(false);
      alert("Camera access is required for the interactive experience. Please check your browser settings.");
    }
  };

  // Attach stream to video element reliably
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play failed:", e));
    }
  }, [stream]);

  // Vision Loop
  useEffect(() => {
    if (!hasPermission) return;

    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || isAnalyzing.current) return;
      
      // Check if video is actually playing and has data
      if (videoRef.current.readyState < 2) return;

      const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!context) return;

      // Draw current frame to canvas (downscale to 256x256 for API speed)
      canvasRef.current.width = 256;
      canvasRef.current.height = 256;
      context.drawImage(videoRef.current, 0, 0, 256, 256);

      const base64 = canvasRef.current.toDataURL('image/jpeg', 0.6);
      
      isAnalyzing.current = true;
      setGeminiStatus("Analyzing...");

      try {
        const data = await analyzeGesture(base64);
        
        // Logic: Open Hand -> Chaos (Unleash), Closed/Fist -> Formed (Tree)
        let statusMsg = "NO HAND DETECTED";
        
        if (data.gesture === 'OPEN') {
           setTreeState(TreeState.CHAOS);
           statusMsg = "OPEN HAND - CHAOS UNLEASHED";
        } else if (data.gesture === 'CLOSED') {
           setTreeState(TreeState.FORMED);
           statusMsg = "CLOSED HAND - TREE FORMED";
        } 

        setGeminiStatus(statusMsg);
        
        // Update hand position for parallax
        setHandPos(prev => ({
            x: prev.x * 0.7 + data.x * 0.3,
            y: prev.y * 0.7 + data.y * 0.3
        }));
      } catch (e) {
        console.error("Analysis loop error:", e);
      } finally {
        isAnalyzing.current = false;
      }
    };

    // Run loop every 800ms
    loopRef.current = window.setInterval(processFrame, 800);

    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [hasPermission]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050a05] text-white">
      {/* 
         CRITICAL FIX: 
         Do not use display:none (hidden). 
         Use opacity-0 and pointer-events-none to keep the video element in the render tree 
         so it buffers frames correctly for canvas.drawImage.
      */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute top-0 left-0 opacity-0 pointer-events-none w-1 h-1" 
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
         <Scene treeState={treeState} handX={handPos.x} handY={handPos.y} />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="bg-black/60 backdrop-blur-md p-6 gold-border rounded-sm max-w-md pointer-events-auto">
            <h1 className="text-4xl font-bold mb-2 gold-text tracking-wider uppercase drop-shadow-md" style={{ fontFamily: 'Cinzel, serif' }}>
              The Grand Tree
            </h1>
            <p className="text-sm text-[#f1e5ac] font-serif italic mb-4">
              "The most luxurious interactive Christmas experience ever built."
            </p>
            <div className="text-xs text-yellow-500 font-mono border-t border-yellow-800/50 pt-2 flex flex-col gap-1">
               <span>SYSTEM: {hasPermission ? 'ONLINE' : 'STANDBY'}</span>
               <span className={geminiStatus.includes("CHAOS") ? "text-red-400 font-bold" : (geminiStatus.includes("FORMED") ? "text-emerald-400 font-bold" : "text-white/60")}>
                 {geminiStatus}
               </span>
            </div>
          </div>
        </div>

        {/* Footer / Controls */}
        <div className="flex justify-center items-end pb-8 pointer-events-auto z-50">
          {!hasPermission ? (
             <div className="text-center bg-black/80 p-8 rounded-lg gold-border max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <h2 className="text-2xl gold-text mb-4 font-serif">Authorization Required</h2>
                <p className="mb-6 text-gray-300 font-sans">
                  To unleash the luxury, we require visual confirmation. Please enable your camera to interact with the Grand Tree.
                </p>
                <button 
                  onClick={startExperience}
                  disabled={isRequesting}
                  className="px-8 py-3 bg-gradient-to-r from-[#b39f77] via-[#d4af37] to-[#b39f77] text-black font-bold text-lg tracking-widest hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(255,215,0,0.5)] border border-yellow-200 uppercase"
                >
                  {isRequesting ? "Initializing..." : "Enter Experience"}
                </button>
             </div>
          ) : (
             <div className="flex gap-6 items-center bg-black/40 backdrop-blur-xl px-8 py-4 rounded-full border border-yellow-500/30 shadow-2xl">
                <div className="flex flex-col items-center group">
                  <div className={`w-8 h-8 border-2 rounded-full mb-1 transition-colors duration-300 ${treeState === TreeState.FORMED ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_10px_#10b981]' : 'border-white/50'}`}></div>
                  <span className="text-[10px] tracking-widest text-yellow-100/80 group-hover:text-white">CLOSED = FORM</span>
                </div>
                <div className="h-8 w-px bg-yellow-500/30"></div>
                <div className="flex flex-col items-center group">
                  <div className={`w-8 h-8 border-2 rounded-full mb-1 flex items-center justify-center transition-colors duration-300 ${treeState === TreeState.CHAOS ? 'border-red-400 shadow-[0_0_10px_#f87171]' : 'border-white/50'}`}>
                     <div className="w-1 h-1 bg-white rounded-full mx-0.5"></div>
                     <div className="w-1 h-1 bg-white rounded-full mx-0.5"></div>
                     <div className="w-1 h-1 bg-white rounded-full mx-0.5"></div>
                  </div>
                  <span className="text-[10px] tracking-widest text-yellow-100/80 group-hover:text-white">OPEN = UNLEASH</span>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;