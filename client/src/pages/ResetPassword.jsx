import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Auth.css";

const API = "http://localhost:5000/api";

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!formData.password || !formData.confirmPassword) {
            setError("Please fill in both fields");
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.put(`${API}/auth/reset-password/${token}`, {
                password: formData.password,
            });
            setSuccess(data.message);

            // Redirect to login after 2 seconds
            setTimeout(() => navigate("/login"), 2000);
        } catch (err) {
            setError(
                err.response?.data?.message || "Something went wrong. Please try again."
            );
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
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">Enter your new password below</p>
                </div>

                {/* Error / Success */}
                {error && <div className="auth-error">{error}</div>}
                {success && (
                    <div className="auth-success">{success}</div>
                )}

                {/* Form */}
                {!success && (
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="rpPassword">New Password</label>
                            <input
                                id="rpPassword"
                                name="password"
                                type="password"
                                className="form-input"
                                placeholder="Min 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="rpConfirm">Confirm New Password</label>
                            <input
                                id="rpConfirm"
                                name="confirmPassword"
                                type="password"
                                className="form-input"
                                placeholder="Re-enter new password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="auth-btn auth-btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Resetting…" : "Set New Password"}
                        </button>
                    </form>
                )}

                {/* Back to login */}
                <div className="auth-footer">
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
