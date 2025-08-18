'use client';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export default function LoadingScreen({ 
  message = "Loading...", 
  fullScreen = true 
}: LoadingScreenProps) {
  const containerClass = fullScreen 
    ? "fixed inset-0 bg-black flex items-center justify-center z-50"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClass}>
      <div className="text-center">
        {/* Connect 4 inspired loading animation */}
        <div className="flex justify-center mb-6">
          <div className="grid grid-cols-4 gap-2">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full ${
                  fullScreen ? 'bg-gray-600' : 'bg-gray-400'
                }`}
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading text */}
        <div className={`text-xl font-semibold font-mono ${
          fullScreen ? 'text-white' : 'text-gray-700'
        }`}>
          {message}
        </div>


      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
