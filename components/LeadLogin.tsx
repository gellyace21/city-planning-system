"use client";

export default function LeadLogin(): React.JSX.Element {
  return (
    <div className="fp2-root">
      <main className="fp2-main">
        <div className="panel-left">
          <div className="seal-wrap">
            <img
              src="/logos/logoplanning.webp"
              alt="Office Seal"
              className="seal-img"
            />
          </div>

          <h2 className="welcome-title">Welcome!</h2>
          <p className="welcome-sub">
            Use your secure lead access link to continue.
          </p>

          <div className="login-form">
            <p className="welcome-sub">
              Use your secure lead access link to enter the portal. This page no
              longer accepts passwords.
            </p>
            <a className="btn-login" href="/login">
              Go to Admin Login
            </a>
          </div>
        </div>

        <div className="panel-right panel-overlay">
          {/* <div className="panel-overlay" /> */}
          {/* <img
            className="building-bg"
            src="images/city-hall.jpg"
            alt="City Hall"
          /> */}
          <img className="map-svg" src="images/pq-map.png" alt="Map" />
        </div>
      </main>

      <style jsx>{`
        .fp2-root {
          min-height: calc(100vh - 84px);
          display: flex;
          width: 100%;
          flex-direction: column;
          background: var(--background);
          color: var(--foreground);
          font-family: "Lato", sans-serif;
        }

        .header-logo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .seal-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .fp2-header h1 {
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--foreground);
        }

        .fp2-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }

        .card {
          background: var(--card);
          border-radius: 16px;
          box-shadow:
            0 8px 40px rgba(46, 125, 98, 0.15),
            0 2px 8px rgba(0, 0, 0, 0.06);
          width: 80%;
          max-width: 90%;
          min-height: 90%;
          height: calc(100vh - 17rem);
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }

        .panel-left {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 50%;
          align-items: center;
          justify-content: center;
          justify-self: flex-end;
          z-index: 1;
          background: var(--card);
        }

        .seal-wrap {
          width: 12rem;
          height: 12rem;
          border-radius: 50%;
          border: 3px solid var(--border);
          margin-bottom: 16px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(76, 175, 138, 0.2);
        }

        .welcome-title {
          font-family: "Playfair Display", serif;
          font-size: 30px;
          color: var(--foreground);
          margin-bottom: 4px;
        }

        .welcome-sub {
          font-size: 13px;
          color: var(--muted-foreground);
          margin-bottom: 28px;
        }

        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .form-group {
          width: 100%;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-group input {
          width: 50%;
          padding: 11px 14px;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          font-size: 13px;
          color: var(--foreground);
          background: var(--background);
          outline: none;
        }

        .form-group input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px
            color-mix(in srgb, var(--primary) 18%, transparent);
          background: var(--card);
        }

        .btn-login {
          width: 50%;
          padding: 11px;
          margin-top: 6px;
          justify-self: center;
          background: var(--primary);
          color: var(--primary-foreground);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 0 4px 12px
            color-mix(in srgb, var(--primary) 28%, transparent);
        }

        .register-link {
          margin-top: 14px;
          font-size: 12px;
          color: var(--muted-foreground);
        }

        .register-link a {
          color: var(--primary);
          font-weight: 700;
          text-decoration: none;
        }

        .panel-right {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          flex: 1;
          justify-content: center;
          overflow: hidden;
          background: var(--background);
          background-position: center;
          background-size: cover;
        }

        .building-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: saturate(1.1) contrast(1.02);
          z-index: 0;
        }

        .panel-overlay {
          border-image: fill 0
            linear-gradient(rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.08));
        }

        .map-svg {
          position: relative;
          z-index: 2;
          width: min(90%, 380px);
          filter: brightness(1.04) saturate(1.2)
            drop-shadow(0 12px 28px rgba(0, 0, 0, 0.18));
          opacity: 90%;
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @media (max-width: 900px) {
          .card {
            grid-template-columns: 1fr;
          }

          .panel-right {
            min-height: 280px;
          }
        }
      `}</style>
    </div>
  );
}
