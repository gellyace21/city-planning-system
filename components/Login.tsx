"use client";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
useRouter;

export default function Login(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError("Invalid credentials");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      if (role === "superadmin") {
        router.replace("/dashboard/superadmin");
      } else if (role === "admin") {
        router.replace("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <p className="welcome-sub">Please login to continue</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                onChange={(e) => setEmail(e.target.value)}
                type="text"
                name="email"
                placeholder="Email"
                required
              />
            </div>
            <div className="form-group">
              <input
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                name="password"
                placeholder="Password"
                required
              />
            </div>
            <button className="btn-login" type="submit">
              Login
            </button>
          </form>
          {error !== "" ? <p className="text-red-400">{error}</p> : null}
          <p className="register-link">
            No account yet? <a href="/register">Register</a>
          </p>
        </div>

        <div className="panel-right panel-overlay">
          {/* <div className="panel-overlay" /> */}
          <img
            className="building-bg"
            src="https://scontent.fmnl45-1.fna.fbcdn.net/v/t1.15752-9/377284142_2389733254543841_7288138596334112928_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeEmwxZ_lMI53AbFy4ThEV6v3BFRIKcXfzPcEVEgpxd_M4qPVYO7cSSNgLz9vKkAcbhMXS4bdnui0g8nzkN3CHhU&_nc_ohc=azlHAcvLd-EQ7kNvwGnPDl0&_nc_oc=AdlUB1tmlhylNraxR7Gqw3Py6y0bS6rjcrGaXgA77n09o_D3dpzACzkbTkR2z766ZgYNRQEQbDH87ebq9jtPQd98&_nc_zt=23&_nc_ht=scontent.fmnl45-1.fna&_nc_ss=8&oh=03_Q7cD4wFSDtK99cvzHiUVqFArwcw8o6yjZ14eqc-F3w5qJ5X2TA&oe=69DED7DE"
            alt="City Hall"
          />
          <img
            className="map-svg"
            src="https://scontent.fmnl45-2.fna.fbcdn.net/v/t1.15752-9/649303634_936146618812411_5783272993715675569_n.png?stp=dst-png_s2048x2048&_nc_cat=107&ccb=1-7&_nc_sid=9f807c&_nc_eui2=AeGL1pGb7oHV4L9yUsQUaRMPBjmZT4KlbD4GOZlPgqVsPhCDUtO8uZ-czIs9Gi-3jlDBBkPxaH6wAc821rvIR9eS&_nc_ohc=fFx7xLJ_SGQQ7kNvwEnDpW1&_nc_oc=AdkqTpVRpTKOl5ZV6z0CF7_gOeJey5frrO3_WWwkJ7dWKGG-dIuWW7m_lsKqMParPyP8J1GkwJw1NqfpsFFGOtih&_nc_zt=23&_nc_ht=scontent.fmnl45-2.fna&_nc_ss=8&oh=03_Q7cD4wGF0nAFWCOTCndxBmAW4Kbz3iPOO4xD0Gu5cuxdlpUGCg&oe=69DED14D"
            alt="Map"
          />
        </div>
      </main>

      <style jsx>{`
        .fp2-root {
          --green-dark: #2e7d62;
          --green-mid: #4caf8a;
          --green-light: #b2dfcf;
          --green-bg: #d4ede3;
          --green-pale: #e8f5ee;
          --white: #ffffff;
          --text-dark: #1a3d2e;
          --text-muted: #5a8070;
          --input-border: #a8d0bf;

          min-height: calc(100vh - 84px);
          display: flex;
          flex-direction: column;
          background: var(--green-bg);
          font-family: "Lato", sans-serif;
        }

        // .fp2-header {
        //   background: var(--green-dark);
        //   display: flex;
        //   align-items: center;
        //   gap: 12px;
        //   padding: 0 24px;
        //   // height: 52px;
        //   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
        // }

        .header-logo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--white);
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
          color: var(--white);
        }

        .fp2-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          // padding: 0 20px;
        }

        .card {
          background: var(--white);
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
          padding: 44px 40px 36px;
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 50%;
          align-items: center;
          justify-content: center;
          justify-self: flex-end;
          z-index: 1;
          background: #eaffee;
        }

        .seal-wrap {
          width: 12rem;
          height: 12rem;
          border-radius: 50%;
          border: 3px solid var(--green-light);
          margin-bottom: 16px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(76, 175, 138, 0.2);
        }

        .welcome-title {
          font-family: "Playfair Display", serif;
          font-size: 30px;
          color: var(--text-dark);
          margin-bottom: 4px;
        }

        .welcome-sub {
          font-size: 13px;
          color: var(--text-muted);
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
          border: 1.5px solid var(--input-border);
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-dark);
          background: var(--green-pale);
          outline: none;
        }

        .form-group input:focus {
          border-color: var(--green-mid);
          box-shadow: 0 0 0 3px rgba(76, 175, 138, 0.15);
          background: var(--white);
        }

        .btn-login {
          width: 50%;
          padding: 11px;
          margin-top: 6px;
          justify-self: center;
          background: var(--green-dark);
          color: var(--white);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(46, 125, 98, 0.3);
        }

        .register-link {
          margin-top: 14px;
          font-size: 12px;
          color: var(--text-muted);
        }

        .register-link a {
          color: var(--green-dark);
          font-weight: 700;
          text-decoration: none;
        }

        .panel-right {
          position: relative;
          height 100%;
          display: flex;
          align-items: center;
          flex: 1;
          justify-content: center;
          overflow: hidden;
          background: #eefpan;
        }

        .panel-right::before {
          content: "";
          position: absolute;
          width: 50%;
          background: rgba(234, 255, 238, 0.45);
          z-index: 1;
        }


        .building-bg {
          position: absolute;
          // inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: saturate(1.1) contrast(1.02);
          z-index: 0;
        }

        .panel-overlay {
          border-image: fill 0 linear-gradient(
          rgba(234, 255, 238, .45),
            rgba(234, 255, 238, .45)); 
          // z-index: 2;
        }

        .map-svg {
          position: relative;
          z-index: 2;
          width: min(90%, 380px);
          filter: brightness(1.07) saturate(1.8)
            drop-shadow(0 12px 28px rgba(0, 70, 70, 0.35)) invert(85%)
            sepia(10%) saturate(2027%) hue-rotate(137deg) brightness(83%)
            contrast(81%);
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
