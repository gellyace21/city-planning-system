"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminId?: number;
}

export default function ProfileModal({
  isOpen,
  onClose,
  adminId,
}: ProfileModalProps): React.JSX.Element | null {
  const { data: session } = useSession();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordValues, setShowPasswordValues] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  // Get admin ID from session or props
  const currentAdminId = adminId || (session?.user?.id as number);

  // Fetch admin profile on modal open
  useEffect(() => {
    if (isOpen && currentAdminId) {
      fetchProfile();
    }
  }, [isOpen, currentAdminId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profile?id=${currentAdminId}`);
      if (!response.ok) throw new Error("Failed to fetch profile");

      const data = await response.json();
      setFullName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setProfilePhoto(data.profile_pic || "");
      setError("");
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfilePhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showPassword) {
      if (!currentPassword.trim()) {
        setError("Please enter your current password.");
        return;
      }

      if (!password.trim()) {
        setError("Please enter a new password.");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("New password and confirm password do not match.");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      if (showPassword) {
        const passwordResponse = await fetch("/api/profile/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentAdminId,
            currentPassword,
            newPassword: password,
          }),
        });

        if (!passwordResponse.ok) {
          const passwordError = await passwordResponse.json().catch(() => null);
          throw new Error(passwordError?.error || "Failed to update password");
        }
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentAdminId,
          name: fullName,
          email,
          phone,
          profile_pic: profilePhoto,
        }),
      });

      if (!response.ok) throw new Error("Failed to save profile");

      const data = await response.json();
      console.log("Profile updated:", data);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowPasswordValues(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-backdrop">
      <style jsx>{`
        .profile-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .profile-modal {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          width: 90%;
          max-width: 700px;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 28px;
          color: #5a7a76;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition:
            background 0.2s,
            color 0.2s;
          z-index: 10;
        }

        .modal-close:hover {
          background: #f0f0f0;
          color: #1a2e2b;
        }

        .profile-left {
          flex: 0 0 40%;
          background: #f9f9f9;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          border-right: 1px solid #e0e0e0;
        }

        .photo-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .photo-placeholder {
          position: relative;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #c8efea 0%, #e8f8f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(42, 157, 143, 0.2);
          flex-shrink: 0;
        }

        .photo-placeholder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .edit-icon {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 24px;
          height: 24px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .edit-icon:hover {
          background: rgba(0, 0, 0, 0.6);
        }

        .upload-btn {
          background: #2a9d8f;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .upload-btn:hover {
          background: #238276;
        }

        .profile-right {
          flex: 1;
          padding: 40px 32px;
          width: 50%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .profile-form {
          display: flex;
          flex-direction: column;
          position: relative;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #5a7a76;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .form-group input {
          padding: 10px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 0.95rem;
          font-family: "DM Sans", sans-serif;
          color: #1a2e2b;
          outline: none;
          max-width: 100%;
          transition:
            border 0.2s,
            background 0.2s;
        }

        .form-group input:focus {
          border-color: #2a9d8f;
          background: #f0fffe;
        }

        .password-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .toggle-password-btn {
          border: 1px solid #cfe3df;
          background: #f5fbfa;
          color: #1a2e2b;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition:
            background 0.2s,
            border-color 0.2s,
            color 0.2s;
        }

        .toggle-password-btn:hover {
          background: #ebf7f5;
          border-color: #2a9d8f;
          color: #16433d;
        }

        .password-match {
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 999px;
          padding: 6px 10px;
          line-height: 1;
          white-space: nowrap;
        }

        .password-match.ok {
          color: #116149;
          background: #e7f7ef;
        }

        .password-match.not-ok {
          color: #9d2d2d;
          background: #fdecec;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .btn-cancel,
        .btn-save {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: "DM Sans", sans-serif;
          text-align: center;
        }

        .btn-cancel {
          background: transparent;
          color: #5a7a76;
          border: 1px solid #e0e0e0;
        }

        .btn-cancel:hover {
          background: #f5f5f5;
          color: #1a2e2b;
        }

        .btn-save {
          background: #2a9d8f;
          color: #ffffff;
        }

        .btn-save:hover {
          background: #238276;
        }

        .btn-save:disabled,
        .btn-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .profile-modal {
            flex-direction: column;
            max-width: 90vw;
          }

          .profile-left {
            flex: 1;
            border-right: none;
            border-bottom: 1px solid #e0e0e0;
            padding: 32px 20px;
          }

          .profile-right {
            padding: 32px 20px;
          }
        }
      `}</style>

      <div className="profile-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        {/* LEFT: PHOTO SECTION */}
        <div className="profile-left">
          <div className="photo-upload">
            <div className="photo-placeholder">
              <img
                src={
                  profilePhoto ||
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236b9a8f'%3E%3Cpath d='M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z'/%3E%3C/svg%3E"
                }
                alt="Profile Photo"
              />
              {/* <div
                className="edit-icon"
                onClick={() => document.getElementById("photoInput")?.click()}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="white"
                  style={{ width: "16px", height: "16px" }}
                >
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                  <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </div> */}
            </div>
            <button
              className="upload-btn"
              onClick={() => document.getElementById("photoInput")?.click()}
            >
              Upload a Photo
            </button>
            <input
              type="file"
              id="photoInput"
              style={{ display: "none" }}
              accept="image/*"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>

        {/* RIGHT: INFO SECTION */}
        <div className="profile-right">
          <form className="profile-form" onSubmit={handleSave}>
            {error && (
              <div
                style={{
                  color: "#d32f2f",
                  fontSize: "0.9rem",
                  marginBottom: "8px",
                }}
              >
                {error}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="fullname">Full Name</label>
              <input
                type="text"
                id="fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Contact</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
              />
            </div>
            <div
              className="btn-save"
              role="button"
              tabIndex={0}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Close Change Password" : "Change Password"}
            </div>
            {showPassword ? (
              <>
                <div className="password-controls">
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPasswordValues((prev) => !prev)}
                  >
                    {showPasswordValues ? "Hide Passwords" : "Show Passwords"}
                  </button>

                  {password.length > 0 || confirmPassword.length > 0 ? (
                    <span
                      className={`password-match ${passwordsMatch ? "ok" : "not-ok"}`}
                    >
                      {passwordsMatch
                        ? "Passwords match"
                        : "Passwords do not match"}
                    </span>
                  ) : null}
                </div>

                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type={showPasswordValues ? "text" : "password"}
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current Password"
                  />
                </div>
                <div className="flex w-full gap-2 [&>div]:flex-1 [&>div]:min-w-0">
                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input
                      type={showPasswordValues ? "text" : "password"}
                      id="newPassword"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New Password"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type={showPasswordValues ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
