import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="aero-viewport">
      {/* RICH ENVIRONMENTAL BACKDROP */}
      <div className="aero-skyline"></div>
      <div className="aero-sunburst"></div>
      <div className="aero-vector-swoop"></div>

      {/* HIGH-REFLECTION FLOATING SPHERES */}
      <div className="aero-orb orb-alpha"></div>
      <div className="aero-orb orb-beta"></div>
      <div className="aero-orb orb-gamma"></div>

      <div className="aero-desktop-frame">
        {/* PREMIUM LAYERED GLASS WINDOW */}
        <section id="center" className="aero-window-panel">
          {/* Glass Specular Overlay Layers */}
          <div className="window-glass-shine"></div>
          <div className="window-edge-highlight"></div>

          {/* Vista-Style Clear Window Title Bar */}
          <div className="window-title-bar">
            <div className="title-icon"></div>
            <span className="title-text">VITE_ENVIRONMENT_CONSOLE.EXE</span>
            <div className="window-controls-placeholder">
              <span className="win-btn min"></span>
              <span className="win-btn max"></span>
              <span className="win-btn close"></span>
            </div>
          </div>

          <div className="window-interior">
            <div className="hero">
              {/* 3D Glass Pod for the Base Image */}
              <div className="image-pod">
                <img src={heroImg} className="base" width="170" height="179" alt="Vite Landscape" />
                <div className="pod-lens-flare"></div>
              </div>

              {/* Floating Skeuomorphic Tech Rings */}
              <div className="logo-satellite react-ring">
                <img src={reactLogo} className="framework" alt="React logo" />
                <div className="satellite-gloss"></div>
              </div>
              <div className="logo-satellite vite-ring">
                <img src={viteLogo} className="vite" alt="Vite logo" />
                <div className="satellite-gloss"></div>
              </div>
            </div>

            <div className="headline-container">
              <div className="gloss-pill-badge">
                <span className="badge-pulse"></span>
                CORE_MODULE // HYPER_FLUID_HMR
              </div>
              <h1>Get started</h1>
              <p>
                Edit the core template path <code>src/App.tsx</code> and commit changes to experience lightning-fast hot module refreshing instantly.
              </p>
            </div>

            {/* ULTIMATE HIGH-GLOSS GEL BUTTON TRACK */}
            <div className="button-track-cradle">
              <button
                type="button"
                className="counter"
                onClick={() => setCount((prevCount) => prevCount + Math.floor(Math.random() * 100) + 1)}
              >
                <div className="gel-reflection"></div>
                <div className="gel-inner-shadow"></div>
                <span className="gel-text">Click count: {count}</span>
              </button>
            </div>
          </div>
        </section>

        <div className="aero-divider-strip">
          <div className="strip-highlight"></div>
        </div>

        {/* METRIC LINK TILES */}
        <section id="next-steps" className="aero-cards-viewport">

          {/* CARD 1: DOCUMENTATION */}
          <div id="docs" className="aero-glass-card">
            <div className="card-glare"></div>
            <div className="card-top-accent orange-bar"></div>
            <div className="card-heading-block">
              <div className="icon-wrapper glass-orange">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#documentation-icon"></use>
                </svg>
              </div>
              <div>
                <h2>Documentation</h2>
                <p className="card-subtitle">Your system questions, answered</p>
              </div>
            </div>

            <ul className="aero-link-list">
              <li>
                <a href="https://vite.dev" target="_blank" rel="noreferrer" className="aero-hyperlink">
                  <div className="link-icon-container">
                    <img className="logo" src={viteLogo} alt="" />
                  </div>
                  <span>Explore Vite Engine</span>
                  <div className="link-arrow"></div>
                </a>
              </li>
              <li>
                <a href="https://react.dev" target="_blank" rel="noreferrer" className="aero-hyperlink">
                  <div className="link-icon-container">
                    <img className="button-icon" src={reactLogo} alt="" />
                  </div>
                  <span>Learn Architecture</span>
                  <div className="link-arrow"></div>
                </a>
              </li>
            </ul>
          </div>

          {/* CARD 2: CONNECT */}
          <div id="social" className="aero-glass-card">
            <div className="card-glare"></div>
            <div className="card-top-accent amber-bar"></div>
            <div className="card-heading-block">
              <div className="icon-wrapper glass-amber">
                <svg className="icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#social-icon"></use>
                </svg>
              </div>
              <div>
                <h2>Connect with us</h2>
                <p className="card-subtitle">Join the worldwide matrix</p>
              </div>
            </div>

            <ul className="aero-link-list grid-links">
              <li>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="aero-hyperlink compact">
                  <svg className="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#github-icon"></use></svg>
                  <span>GitHub</span>
                </a>
              </li>
              <li>
                <a href="https://vite.dev" target="_blank" rel="noreferrer" className="aero-hyperlink compact">
                  <svg className="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#discord-icon"></use></svg>
                  <span>Discord</span>
                </a>
              </li>
              <li>
                <a href="https://x.com" target="_blank" rel="noreferrer" className="aero-hyperlink compact">
                  <svg className="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#x-icon"></use></svg>
                  <span>X.com</span>
                </a>
              </li>
              <li>
                <a href="https://bsky.app" target="_blank" rel="noreferrer" className="aero-hyperlink compact">
                  <svg className="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#bluesky-icon"></use></svg>
                  <span>Bluesky</span>
                </a>
              </li>
            </ul>
          </div>
        </section>

        <div className="aero-divider-strip">
          <div className="strip-highlight"></div>
        </div>
        <section id="spacer"></section>
      </div>
    </div>
  )
}

export default App
