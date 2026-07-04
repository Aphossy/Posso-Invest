const OrbitingSpinner = () => {
  const tickCount = 30

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
        gap: "2rem",
      }}>
      {/* Main Spinner */}
      <div
        style={{
          position: "relative",
          perspective: "300px",
          transformStyle: "preserve-3d",
        }}>
        <div
          className="main-spinner"
          style={{
            position: "relative",
            width: "140px",
            height: "140px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 8px 32px rgba(34, 197, 94, 0.15)",
          }}>
          {Array.from({ length: tickCount }).map((_, i) => (
            <div
              key={i}
              className="tick-element"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "4px",
                height: "14px",
                background: "#004225",
                borderRadius: "2px",
                transform: `translate(-50%, -50%) rotate(${(360 / tickCount) * i}deg) translateY(-53px)`,
              }}
            />
          ))}
        </div>

        <svg
          width="70"
          height="70"
          viewBox="0 0 70 70"
          xmlns="http://www.w3.org/2000/svg"
          className="rotate-orbit"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 4px 12px rgba(34, 197, 94, 0.2)",
          }}>
          <circle
            cx="35"
            cy="35"
            r="22"
            className="orbit-circle"
            strokeWidth="6"
            fill="none"
          />
        </svg>
      </div>

      {/* Loading Text */}
      <div
        style={{
          textAlign: "center",
        }}>
        <div
          className="loading-text"
          style={{
            fontSize: "1.2rem",
            fontWeight: "600",
            color: "#004225",
            marginBottom: "0.5rem",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>
          Loading<span className="dots">...</span>
        </div>
        <div
          style={{
            fontSize: "1.8rem",
            color: "#004225",
            fontWeight: "500",
            letterSpacing: "0.5px",
          }}>
          POSSO VENTURES
        </div>
        <div
          style={{
            fontSize: "1rem",
            color: "#4b5563",
            marginTop: "0.1rem",
          }}>
          Save together. Build together.
        </div>
      </div>

      <style>{`
        @keyframes main-spinner {
          0% {
            transform: translateZ(45px) rotate(0turn);
            background-color: white;
          }
          90% {
            transform: translateZ(45px) rotate(3turn);
            background-color: white;
          }
          100% {
            transform: translateZ(45px) rotate(3turn);
            background-color: #004225;
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.2), 0 8px 32px rgba(34, 197, 94, 0.3);
          }
        }

        @keyframes tick-fade-out {
          0%, 90% {
            opacity: 1;
            background-color: #004225;
          }
          100% {
            opacity: 0;
            background-color: #004225;
          }
        }

        @keyframes rotate-orbit {
          0% {
            transform: translate(-50%, -50%) rotateZ(-45deg) rotateY(0deg) translateZ(120px);
          }
          30% {
            transform: translate(-50%, -50%) rotateZ(-45deg) rotateY(-1turn) translateZ(120px) rotateY(1turn);
          }
          60% {
            transform: translate(-50%, -50%) rotateZ(-45deg) rotateY(-2turn) translateZ(120px) rotateY(2turn);
          }
          100% {
            transform: translate(-50%, -50%) rotateZ(-45deg) translate(55%, 0%) rotateY(-3turn) translateZ(90px) rotateY(3turn);
          }
        }

        @keyframes fill-circle {
          0%, 90% {
            stroke: #004225;
            fill: none;
            fill-opacity: 0;
          }
          100% {
            stroke: #004225;
            fill: #004225;
            fill-opacity: 1;
          }
        }

        @keyframes dot-pulse {
          0%, 20% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        .main-spinner {
          animation: main-spinner 4s cubic-bezier(0.455, 0.03, 0.515, 0.955) forwards;
        }

        .tick-element {
          animation: tick-fade-out 4s cubic-bezier(0.455, 0.03, 0.515, 0.955) forwards;
        }

        .rotate-orbit {
          animation: rotate-orbit 4s cubic-bezier(0.455, 0.03, 0.515, 0.955) forwards;
        }

        .orbit-circle {
          animation: fill-circle 4s cubic-bezier(0.455, 0.03, 0.515, 0.955) forwards;
        }

        .dots {
          display: inline-block;
          animation: dot-pulse 1.5s ease-in-out infinite;
        }

        .loading-text {
          animation: fade-in 0.6s ease-in;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export { OrbitingSpinner }
