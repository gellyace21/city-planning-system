"use client";

import { getSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SuperadminLogin(): React.JSX.Element {
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
        return;
      }

      await signOut({ redirect: false });
      setError("This login is for super admin accounts only.");
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

          <h2 className="welcome-title">Super Admin Portal</h2>
          <p className="welcome-sub">Sign in to manage admin accounts</p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <input
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                name="email"
                placeholder="Super admin email"
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
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {error !== "" ? <p className="text-red-400">{error}</p> : null}
          <p className="register-link">
            Back to regular login? <a href="/login">Login</a>
          </p>
        </div>

        <div className="panel-right panel-overlay">
          <img className="map-svg" src="images/pq-map.png" alt="Map" />
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
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }

        .panel-left {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 50%;
          align-items: center;
          justify-content: center;
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

        .btn-login {
          width: 50%;
          padding: 11px;
          margin-top: 6px;
          background: var(--green-dark);
          color: var(--white);
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
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
          height: 100vh;
          display: flex;
          align-items: center;
          flex: 1;
          justify-content: center;
          overflow: hidden;
          background: url("images/city-hall.jpg");
          background-position: center;
          background-size: cover;
        }

        .panel-overlay {
          border-image: fill 0
            linear-gradient(
              rgba(234, 255, 238, 0.45),
              rgba(234, 255, 238, 0.45)
            );
        }

        .map-svg {
          position: relative;
          z-index: 2;
          width: min(90%, 380px);
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
      `}</style>
    </div>
  );
}
