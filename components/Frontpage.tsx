"use client";

import { Cinzel } from "next/font/google";
const merriweather = Cinzel({
  subsets: ["latin"],
});
export default function Frontpage(): React.JSX.Element {
  return (
    <div
      className={`front-page-root ${merriweather.className} ml-2 text-white font-bold text-lg`}
    >
      <div className="main-content">
        <section className="login-panel">
          <div className="login-bg" />
          <div className="teal-overlay" />

          {/* <div className="login-card"> */}
          <img
            src="/logos/logoplanning.webp"
            className="card-seal"
            alt="CPDO Seal"
          />
          <h2 className="card-title">Welcome!</h2>
          <p className="card-sub">Please Login</p>

          <form action="#" method="get">
            <div className="form-group">
              <label htmlFor="username">Username or Email</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Enter username or email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter password"
                required
              />
            </div>

            <button type="submit" className="btn-login">
              Login
            </button>
          </form>

          <p className="register-link">
            No account yet? <a href="#">Register</a>
          </p>
          {/* </div> */}
        </section>

        <section className="map-panel">
          <img
            src="https://scontent.fmnl45-2.fna.fbcdn.net/v/t1.15752-9/649303634_936146618812411_5783272993715675569_n.png?stp=dst-png_s2048x2048&_nc_cat=107&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGL1pGb7oHV4L9yUsQUaRMPBjmZT4KlbD4GOZlPgqVsPhCDUtO8uZ-czIs9Gi-3jlDBBkPxaH6wAc821rvIR9eS&_nc_ohc=fFx7xLJ_SGQQ7kNvwEnDpW1&_nc_oc=AdkqTpVRpTKOl5ZV6z0CF7_gOeJey5frrO3_WWwkJ7dWKGG-dIuWW7m_lsKqMParPyP8J1GkwJw1NqfpsFFGOtih&_nc_zt=23&_nc_ht=scontent.fmnl45-2.fna&_nc_ss=8&oh=03_Q7cD4wGF0nAFWCOTCndxBmAW4Kbz3iPOO4xD0Gu5cuxdlpUGCg&oe=69DED14D"
            className="map-image"
            alt="Paranaque City map"
          />
        </section>
      </div>

      <div className="bottombar" />

      <style jsx>{`
        .front-page-root {
          --teal-dark: #1a5c52;
          --teal-light: #2a9d8f;
          --teal-pale: #e0f5f2;

          min-height: calc(100vh - 84px);
          //   background: var(--teal-pale);
          display: flex;
          flex-direction: column;
        //   font-family: var(--font-sans), sans-serif;
        }

        .main-content {
          flex: 1;
          display: flex;
          min-height: 0;
        }

        .login-panel {
          position: relative;
          flex: 1 0 50%;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background-color: #eaffee;
          color: black;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          //   background-image: url("https://scontent.fmnl45-1.fna.fbcdn.net/v/t1.15752-9/377284142_2389733254543841_7288138596334112928_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEmwxZ_lMI53AbFy4ThEV6v3BFRIKcXfzPcEVEgpxd_M4qPVYO7cSSNgLz9vKkAcbhMXS4bdnui0g8nzkN3CHhU&_nc_ohc=azlHAcvLd-EQ7kNvwGnPDl0&_nc_oc=AdlUB1tmlhylNraxR7Gqw3Py6y0bS6rjcrGaXgA77n09o_D3dpzACzkbTkR2z766ZgYNRQEQbDH87ebq9jtPQd98&_nc_zt=23&_nc_ht=scontent.fmnl45-1.fna&_nc_ss=8&oh=03_Q7cD4wFSDtK99cvzHiUVqFArwcw8o6yjZ14eqc-F3w5qJ5X2TA&oe=69DED7DE");
          //   background-size: cover;
          //   background-position: center;

          filter: brightness(0.35) saturate(3.5);
          z-index: 0;
        }

        .teal-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #eaffee #eaffee);
          z-index: 1;
        }

        .login-card {
          position: relative;
          z-index: 2;
          background: rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(18px) saturate(1.4);
          -webkit-backdrop-filter: blur(18px) saturate(1.4);
          border: 1px solid rgba(255, 255, 255, 0.28);
          border-radius: 18px;
          padding: 38px 36px 32px;
          width: 50%;
          box-shadow:
            0 8px 40px rgba(0, 0, 0, 0.32),
            0 1px 0 rgba(255, 255, 255, 0.12) inset;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .card-seal {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255, 255, 255, 0.55);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          margin-bottom: 12px;
        }

        .card-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #000;
          letter-spacing: 0.04em;
          margin-bottom: 3px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .card-sub {
          font-size: 0.85rem;
          color: rgb(0,0,0);
          letter-spacing: 0.08em;
          margin-bottom: 20px;
        }

        .form-group {
          width: 100%;
          margin-bottom: 14px;
        }

        .form-group label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
color: #000          letter-spacing: 0.07em;
          margin-bottom: 5px;
          text-transform: uppercase;
        }

        .form-group input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          background: rgba(255, 255, 255, 1);
          color: #000;
          font-size: 0.92rem;
          outline: none;
          transition:
            border 0.2s,
            background 0.2s;
        }

        .form-group input::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }

        .form-group input:focus {
          border-color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.22);
        }

        .btn-login {
          width: 100%;
          margin-top: 6px;
          margin-bottom: 14px;
          padding: 11px;
          background: linear-gradient(135deg, #1a5c52 0%, #2a9d8f 100%);
          color: #000;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(26, 92, 82, 0.45);
          transition:
            transform 0.15s,
            box-shadow 0.15s;
        }

        .btn-login:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(26, 92, 82, 0.55);
        }

        .register-link {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.65);
        }

        .register-link a {
          color: #7ee8d8;
          text-decoration: none;
          font-weight: 700;
        }

        .register-link a:hover {
          text-decoration: underline;
        }

        .map-panel {
          flex: 1 0 50%;
          display: flex;
          position: relative;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 40px;
          margin-left: -120px;
          background: linear-gradient(135deg, #eaffee #eaffee);
        }

        .map-panel::before {
          content: "";
          position: absolute;
          flex: 1 0 50%;

          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("https://scontent.fmnl45-1.fna.fbcdn.net/v/t1.15752-9/377284142_2389733254543841_7288138596334112928_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEmwxZ_lMI53AbFy4ThEV6v3BFRIKcXfzPcEVEgpxd_M4qPVYO7cSSNgLz9vKkAcbhMXS4bdnui0g8nzkN3CHhU&_nc_ohc=azlHAcvLd-EQ7kNvwGnPDl0&_nc_oc=AdlUB1tmlhylNraxR7Gqw3Py6y0bS6rjcrGaXgA77n09o_D3dpzACzkbTkR2z766ZgYNRQEQbDH87ebq9jtPQd98&_nc_zt=23&_nc_ht=scontent.fmnl45-1.fna&_nc_ss=8&oh=03_Q7cD4wFSDtK99cvzHiUVqFArwcw8o6yjZ14eqc-F3w5qJ5X2TA&oe=69DED7DE");
          background-size: cover;
          background-position: center;
          filter: blur(8px);
          z-index: -1;
        }

        .map-image {
          max-width: 520px;
          max-height: 80vh;
          width: 100%;
          height: auto;
          object-fit: contain;
          opacity: 0.85;
          filter: brightness(1.1) saturate(2) hue-rotate(180deg)
            drop-shadow(0 8px 32px rgba(96, 189, 197, 0.35)) invert(85%)
            sepia(10%) saturate(2027%) hue-rotate(137deg) brightness(83%)
            contrast(81%);
          animation: floatMap 4s ease-in-out infinite;
        }

        @keyframes floatMap {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        // .bottombar {
        //   height: 8px;
        //   background: linear-gradient(
        //     90deg,
        //     var(--teal-dark),
        //     var(--teal-light),
        //     var(--teal-dark)
        //   );
        // }

        @media (max-width: 720px) {
          .login-panel {
            flex: 1;
            min-height: 74vh;
          }

          .map-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
