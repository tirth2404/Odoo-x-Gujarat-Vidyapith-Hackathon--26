import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api`;

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const [resetUrl, setResetUrl] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setResetUrl("");

        if (!email) {
            setError("Please enter your email address");
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post(`${API}/auth/forgot-password`, { email });
            setSuccess(data.message);
            setResetUrl(data.resetUrl);
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-circle">
                        <span>FF</span>
                    </div>
                    <h1 className="auth-title">Forgot Password</h1>
                    <p className="auth-subtitle">
                        Enter your registered email and we'll help you reset your password
                    </p>
                </div>

                {/* Error */}
                {error && <div className="auth-error">{error}</div>}

                {/* Success */}
                {success && (
                    <div className="auth-success">
                        <p style={{ margin: 0 }}>{success}</p>
                        {resetUrl && (
                            <a
                                href={resetUrl}
                                style={{
                                    display: "inline-block",
                                    marginTop: "12px",
                                    padding: "10px 28px",
                                    background: "#10b981",
                                    color: "#fff",
                                    borderRadius: "8px",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                }}
                            >
                                Reset Password Now
                            </a>
                        )}
                    </div>
                )}

                {/* Form — hide after success */}
                {!success && (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="fpEmail">Email Address</label>
                            <input
                                id="fpEmail"
                                type="email"
                                className="form-input"
                                placeholder="Enter your registered email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError("");
                                }}
                                autoComplete="email"
                            />
                        </div>

                        <button
                            type="submit"
                            className="auth-btn auth-btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Sending…" : "Send Reset Link"}
                        </button>
                    </form>
                )}

                {/* Back to login */}
                <div className="auth-footer">
                    Remember your password?{" "}
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
