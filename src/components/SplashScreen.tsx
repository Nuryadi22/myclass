'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 1800)

    const removeTimer = setTimeout(() => {
      setVisible(false)
    }, 2400) // 1800 + 600ms fade duration

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      {/* ==================== SPLASH SCREEN CONTAINER ==================== */}
      <div id="splash-screen" className={fadeOut ? 'fade-out' : ''}>
        <div className="splash-content">
          <div className="logo-wrapper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/myclass.png"
              alt="MyClass Logo"
              className="splash-logo"
            />
            <div className="logo-glow" />
          </div>
          <h1 className="splash-title">MyClass <br />
          <span className="splash-subtitle">bykelasbusifa</span>
          </h1>
          <div className="loading-bar">
            <div className="loading-progress" />
          </div>
        </div>
      </div>

      {/* ==================== CSS ANIMASI ==================== */}
      <style>{`
        #splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: #ffffff;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99999;
          transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                      visibility 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .splash-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
          text-align: center;
        }

        .logo-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .splash-logo {
          width: 110px;
          height: 110px;
          object-fit: contain;
          z-index: 2;
          mix-blend-mode: multiply;
          animation: logoEntrance 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .logo-glow {
          position: absolute;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.5) 0%, rgba(0,0,0,0) 70%);
          border-radius: 50%;
          z-index: 1;
          animation: glowPulse 2s infinite ease-in-out;
        }

        .splash-title {
          color: #1e1b4b;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin: 0;
          opacity: 0;
          animation: fadeInText 0.8s ease forwards;
          animation-delay: 0.4s;
        }
          
        .splash-subtitle {
          display: block;                  /* Memaksa teks pindah ke baris bawah */
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1rem;                 /* Ukuran dibuat sedikit lebih kecil dari title (1.5rem) */
          font-weight: 400;                /* Ketebalan normal/standar */
          font-style: italic;              /* Membuat teks menjadi miring (italic) */
          color: #312e81;                  /* Warna senada, sedikit lebih muda dari judul */
          letter-spacing: 0.025em;
          margin-top: 0.25rem;             /* Jarak antara judul utama dan sub-judul */
          opacity: 0;
          animation: fadeInText 0.8s ease forwards;
          animation-delay: 0.6s;           /* Muncul sedikit setelah judul utama (efek bertahap) */
        }

        .loading-bar {
          width: 140px;
          height: 4px;
          background: rgba(79, 70, 229, 0.15);
          border-radius: 999px;
          overflow: hidden;
          opacity: 0;
          animation: fadeInText 0.8s ease forwards;
          animation-delay: 0.6s;
        }

        .loading-progress {
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, #818cf8);
          border-radius: 999px;
          transform: translateX(-100%);
          animation: fillProgress 1.4s ease-in-out infinite;
        }

        #splash-screen.fade-out {
          opacity: 0;
          visibility: hidden;
        }

        @keyframes logoEntrance {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(40px);
          }
          70% {
            opacity: 1;
            transform: scale(1.05) translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(0.9);
            opacity: 0.4;
          }
          50% {
            transform: scale(1.4);
            opacity: 0.8;
          }
        }

        @keyframes fadeInText {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fillProgress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
