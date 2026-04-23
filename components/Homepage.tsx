"use client";

import React from "react";
import { useRouter } from "next/navigation";
import LeadLinksManager from "@/components/LeadLinksManager";

export default function Homepage(): React.JSX.Element {
  const router = useRouter();

  return (
    <main className="homepage-shell">
      <style jsx>{`
        .homepage-shell {
          min-height: 100vh;
          padding: 0 20px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: auto;
          justify-content: center;
          gap: 4rem;
          background: #eaf7f0;
          width: 100%'
          font-family: "Lato", sans-serif;
        }

        .cards-row {
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          margin: 2rem auto 2rem auto;
          justify-content: center;
        }

        .card {
          width: 22rem;
          aspect-ratio: 1 / 1;
          border-radius: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          cursor: pointer;
          transition:
            transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.22s;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.12);
          opacity: 0;
          transition: opacity 0.2s;
          border-radius: inherit;
        }

        .card:hover {
          transform: translateY(-6px) scale(1.03);
        }

        .card:hover::before {
          opacity: 1;
        }

        .card-1 {
          background: linear-gradient(145deg, #6cc8ad 0%, #4fb598 100%);
          box-shadow: 0 10px 30px rgba(79, 181, 152, 0.35);
        }

        .card-2 {
          background: linear-gradient(145deg, #90d4bb 0%, #6dc5a5 100%);
          box-shadow: 0 10px 30px rgba(109, 197, 165, 0.3);
        }

        // .card:hover.card-1 {
        //   box-shadow: 0 18px 42px rgba(79, 181, 152, 0.45);
        // }

        // .card:hover.card-2 {
        //   box-shadow: 0 18px 42px rgba(109, 197, 165, 0.4);
        // }

        .card-icon {
          width: 13rem;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.12));
        }

        .card-icon img,
        .card-icon svg {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .card-label {
          font-family: "Cinzel", serif;
          font-size: 1rem;
          color: #ffffff;
          letter-spacing: 0.5px;
          text-align: center;
          line-height: 1.5;
          font-weight: 600;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
          position: relative;
          z-index: 1;
        }

        @media (max-width: 640px) {
          .homepage-shell {
            padding: 32px 16px 48px;
          }

          .cards-row {
            gap: 18px;
          }

          .card {
            width: 164px;
            height: 164px;
          }
        }
      `}</style>

      <section className="cards-row" aria-label="Homepage actions">
        <div
          className="card card-1"
          onClick={() => router.push("/dashboard/project-monitoring")}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="10" width="5" height="10" rx="1" />
              <rect x="10" y="6" width="5" height="14" rx="1" />
              <rect x="16" y="13" width="4" height="7" rx="1" />
            </svg>
          </div>
          <div className="card-label">
            Project
            <br />
            Monitoring
          </div>
        </div>

        <div
          className="card card-2"
          onClick={() => router.push("/dashboard/annual-investment-plan")}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
            </svg>
          </div>
          <div className="card-label">
            Annual
            <br />
            Investment Plan
          </div>
        </div>

        {/* <div
          className="card card-3"
          onClick={() => router.push("/dashboard/lead-links")}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13" />
              <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className="card-label">
            Lead Access
            <br />
            Links
          </div>
        </div> */}
      </section>

      <section>
        <LeadLinksManager />
      </section>
    </main>
  );
}
