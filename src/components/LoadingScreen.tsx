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
    ? "fixed inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 flex items-center justify-center z-50"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClass}>
      {/* Background decoration for fullscreen */}
      {fullScreen && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full animate-pulse"></div>
        </div>
      )}

      <div className="relative z-10 text-center">
        {/* Connect 4 inspired loading animation */}
        <div className="flex justify-center mb-6">
          <div className="grid grid-cols-4 gap-2">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full ${
                  fullScreen ? 'bg-white/30' : 'bg-blue-500/30'
                }`}
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading text */}
        <div className={`text-xl font-semibold ${
          fullScreen ? 'text-white' : 'text-gray-700'
        }`}>
          {message}
        </div>

        {/* Animated dots */}
        <div className="flex justify-center mt-2 space-x-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                fullScreen ? 'bg-white/60' : 'bg-blue-500/60'
              }`}
              style={{
                animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
