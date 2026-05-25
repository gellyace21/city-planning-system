"use client";
import { getSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";

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
        await signOut({ redirect: false });
        setError(
          "System administrator accounts must use the System Administrator login.",
        );
        return;
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
      <main className="fp2-main overlay">
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
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-label">
                  <IconLoader2 size={14} className="spin" /> Signing in...
                </span>
              ) : (
                "Login"
              )}
            </button>
          </form>
          {error !== "" ? <p className="text-red-400">{error}</p> : null}

          <p className="register-link">
            <a href="/superadmin-login"> System Administrator</a>
          </p>
        </div>

        <div className="panel-right panel-overlay">
          {/* <div className="panel-overlay" /> */}
          {/* <img
            className="building-bg"
            src="images/city-hall.jpg"
            alt="City Hall"
          /> */}
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

          min-height: 100%;
          display: flex;
          width: 100%;
          flex-direction: column;
          background: var(--green-bg);
          font-family: "Lato", sans-serif;
        }

        .seal-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .fp2-main {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100%;
          // padding: 0 20px;
          position: relative;
          background: url("images/city-hall.jpg");
          background-position: center;
          background-size: cover;
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
          // padding: 44px 40px 36px;
          display: flex;
          flex-direction: column;
          height: 40rem;
          border-radius: 1rem;
          min-width: 30rem;
          align-items: center;
          justify-content: center;
          justify-self: flex-end;
          z-index: 1;
          // background: #eaffee;
          background: #e3fff2;
          background: linear-gradient(
            180deg,
            rgba(227, 255, 242, 0.5) 5%,
            rgba(255, 255, 255, 1) 30%
          );
          box-shadow: 0 0 12px rgba(118, 156, 138, 0.2);
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
          width: 70%;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 70%;
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

        .btn-login:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .btn-label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .spin {
          animation: spin 0.9s linear infinite;
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
          position: absolute;
          top: 0;
          left: 0;
          height: 100vh;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          // background: #eefpan;
          background: url("images/city-hall.jpg");
          background-position: center;
          background-size: cover;
          // backdrop-filter: blur(5px);s
          z-index: 1000;
        }

        // .panel-right::before {
        //   content: "";
        //   position: absolute;
        //   width: 50%;
        //   background: rgba(234, 255, 238, 0.45);
        //   z-index: 1;
        //   height: 100%;
        // }

        .building-bg {
          position: absolute;
          top: 0;
          left: 0;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          filter: saturate(1.1) contrast(1.02);
          z-index: 10000;
        }

        .overlay {
          // border-image: fill 0
          //   linear-gradient(
          //     rgba(234, 255, 238, 0.45),
          //     rgba(234, 255, 238, 0.45)
          //   );
          border-image: fill 0
            linear-gradient(rgba(220, 255, 238, 0.8), rgba(220, 255, 238, 0.8));
          // z-index: 2;
          //
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

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
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
