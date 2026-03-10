import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../state/AppDataContext";
import { normalizeEmail } from "../auth/localAuth";

const StarRating = ({ rating = 0, size = 18, interactive = false, onChange }) => {
    const [hovered, setHovered] = useState(0);
    const displayRating = interactive && hovered ? hovered : rating;

    return (
        <div style={{ display: "flex", gap: 2, cursor: interactive ? "pointer" : "default" }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    style={{
                        fontSize: size,
                        color: star <= displayRating ? "#fbbf24" : "#475569",
                        transition: "color 0.15s, transform 0.15s",
                        transform: interactive && hovered === star ? "scale(1.2)" : "scale(1)"
                    }}
                    onMouseEnter={() => interactive && setHovered(star)}
                    onMouseLeave={() => interactive && setHovered(0)}
                    onClick={() => interactive && onChange && onChange(star)}
                >
                    ★
                </span>
            ))}
        </div>
    );
};

const ServiceDetail = ({
    services = [],
    reviews = [],
    customerBookings = [],
    onAddReview,
    onCreateBooking,
    slotChoiceByService = {},
    onSlotChange
}) => {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { portalData } = useAppData();
    const customerEmail = normalizeEmail(user?.email || "");

    const service = useMemo(
        () => services.find((s) => s.id === serviceId) || null,
        [services, serviceId]
    );

    const providerServices = useMemo(
        () => (service ? services.filter((s) => s.providerEmail === service.providerEmail) : []),
        [services, service]
    );

    const providerReviews = useMemo(
        () =>
            service
                ? reviews.filter((r) => normalizeEmail(r.providerEmail) === service.providerEmail)
                : [],
        [reviews, service]
    );

    const avgRating = useMemo(() => {
        if (!providerReviews.length) return service?.providerRating || 0;
        const sum = providerReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        return sum / providerReviews.length;
    }, [providerReviews, service]);

    const hasCompletedBooking = useMemo(
        () =>
            service &&
            customerBookings.some(
                (b) =>
                    normalizeEmail(b.providerEmail) === service.providerEmail &&
                    b.status === "Completed"
            ),
        [customerBookings, service]
    );

    const alreadyReviewed = useMemo(
        () =>
            service &&
            providerReviews.some((r) => normalizeEmail(r.customerEmail) === customerEmail),
        [providerReviews, customerEmail, service]
    );

    const [bookingNotes, setBookingNotes] = useState("");
    const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [feedback, setFeedback] = useState("");

    if (!service) {
        return (
            <section className="portal-card" style={{ textAlign: "center", padding: 40 }}>
                <h3>Service Not Found</h3>
                <p style={{ color: "#cbd5e1" }}>The service you're looking for doesn't exist.</p>
                <button className="portal-button" onClick={() => navigate("/customer/services")}>
                    Back to Services
                </button>
            </section>
        );
    }

    const handleBooking = () => {
        if (onCreateBooking) {
            onCreateBooking(service, { bookingDate, problemDescription: bookingNotes });
        }
        setFeedback(`Booking request sent to ${service.providerName} for ${service.subcategory}!`);
        setBookingNotes("");
    };

    const handleReviewSubmit = () => {
        if (!reviewRating) {
            setFeedback("Please select a star rating.");
            return;
        }
        if (!reviewText.trim()) {
            setFeedback("Please write a review.");
            return;
        }
        if (onAddReview) {
            onAddReview({
                providerEmail: service.providerEmail,
                customerEmail,
                customerName:
                    user?.name || portalData.customerProfile.name || customerEmail.split("@")[0],
                rating: reviewRating,
                text: reviewText.trim()
            });
        }
        setFeedback("Review submitted successfully!");
        setReviewRating(0);
        setReviewText("");
    };

    return (
        <>
            {/* Back button */}
            <button
                className="portal-button secondary"
                onClick={() => navigate("/customer/services")}
                style={{ marginBottom: 6, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
                ← Back to Services
            </button>

            {feedback && (
                <section
                    className="portal-card"
                    style={{ borderColor: "rgba(6, 182, 212, 0.6)", padding: "10px 16px" }}
                >
                    <p style={{ margin: 0 }}>{feedback}</p>
                </section>
            )}

            {/* Service Hero */}
            <section className="portal-card portal-hero" style={styles.hero}>
                <div style={{ flex: 1 }}>
                    <div style={styles.badgeRow}>
                        <span style={styles.categoryBadge}>{service.category}</span>
                        <span className="portal-status ok">Approved Provider</span>
                    </div>
                    <h2 style={{ margin: "10px 0 6px", fontSize: 32 }}>{service.subcategory}</h2>
                    <p style={{ margin: 0, color: "rgba(240,249,255,0.9)", fontWeight: 600 }}>
                        By {service.providerName} · 📍 {service.providerLocation || "N/A"}
                    </p>
                </div>
                <div style={styles.priceBlock}>
                    <p style={{ margin: 0, color: "rgba(240,249,255,0.7)", fontSize: 13 }}>Starting at</p>
                    <p style={{ margin: 0, fontSize: 38, fontWeight: 800, color: "#fff" }}>
                        ₹{service.price}
                    </p>
                </div>
            </section>

            {/* Detail Grid: Info + Booking */}
            <div style={styles.detailGrid}>
                {/* Left: Provider info + stats */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Provider Card */}
                    <section className="portal-card">
                        <h3 style={{ margin: "0 0 14px", fontSize: 18 }}>Provider Information</h3>
                        <div style={styles.providerHeader}>
                            <div style={styles.providerAvatar}>
                                {service.providerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 style={{ margin: 0, fontSize: 17 }}>{service.providerName}</h4>
                                <p style={{ margin: "2px 0 0", color: "#cbd5e1", fontSize: 13 }}>
                                    📍 {service.providerLocation || "Location not specified"}
                                </p>
                            </div>
                        </div>
                        <div style={styles.statsGrid}>
                            <div style={styles.statCard}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <StarRating rating={Math.round(avgRating)} size={16} />
                                    <span style={{ fontWeight: 700, fontSize: 18 }}>{avgRating.toFixed(1)}</span>
                                </div>
                                <p style={styles.statLabel}>Average Rating</p>
                            </div>
                            <div style={styles.statCard}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
                                    {providerReviews.length || service.providerReviews}
                                </p>
                                <p style={styles.statLabel}>Reviews</p>
                            </div>
                            <div style={styles.statCard}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 22 }}>
                                    {service.providerCompletedJobs}
                                </p>
                                <p style={styles.statLabel}>Jobs Done</p>
                            </div>
                        </div>
                    </section>

                    {/* Other services by this provider */}
                    {providerServices.length > 1 && (
                        <section className="portal-card">
                            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>
                                More from {service.providerName}
                            </h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {providerServices
                                    .filter((s) => s.id !== service.id)
                                    .slice(0, 4)
                                    .map((s) => (
                                        <div
                                            key={s.id}
                                            style={styles.otherServiceItem}
                                            onClick={() => navigate(`/customer/service/${s.id}`)}
                                        >
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600 }}>{s.subcategory}</p>
                                                <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 12 }}>
                                                    {s.category}
                                                </p>
                                            </div>
                                            <span style={{ color: "#67e8f9", fontWeight: 700 }}>₹{s.price}</span>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Right: Booking form */}
                <section className="portal-card" style={styles.bookingCard}>
                    <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>Book This Service</h3>
                    <p style={{ margin: "0 0 16px", color: "#cbd5e1", fontSize: 13 }}>
                        Fill in the details to send a booking request
                    </p>

                    <div className="portal-field" style={{ marginBottom: 14 }}>
                        <label>Service</label>
                        <input
                            type="text"
                            value={`${service.subcategory} — ₹${service.price}`}
                            disabled
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <div className="portal-field" style={{ marginBottom: 14 }}>
                        <label>Preferred Time Slot</label>
                        <select
                            value={slotChoiceByService[service.id] || service.slots?.[0] || ""}
                            onChange={(e) => onSlotChange && onSlotChange(service.id, e.target.value)}
                        >
                            {(!service.slots || service.slots.length === 0) && (
                                <option value="">Provider slots not configured</option>
                            )}
                            {service.slots &&
                                service.slots.map((slot) => (
                                    <option key={slot} value={slot}>
                                        {slot}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="portal-field" style={{ marginBottom: 14 }}>
                        <label>Booking Date</label>
                        <input
                            type="date"
                            value={bookingDate}
                            onChange={(e) => setBookingDate(e.target.value)}
                        />
                    </div>

                    <div className="portal-field" style={{ marginBottom: 14 }}>
                        <label>Your Location</label>
                        <input
                            type="text"
                            value={portalData.customerProfile.location || ""}
                            disabled
                            placeholder="Set in Settings"
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <div className="portal-field" style={{ marginBottom: 14 }}>
                        <label>Notes for Provider (optional)</label>
                        <textarea
                            placeholder="Describe your issue or requirements..."
                            value={bookingNotes}
                            onChange={(e) => setBookingNotes(e.target.value)}
                            style={{ minHeight: 80 }}
                        />
                    </div>

                    <button className="portal-button" style={{ width: "100%" }} onClick={handleBooking}>
                        Send Booking Request
                    </button>
                    <p style={{ margin: "10px 0 0", color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
                        The provider will accept or reject your request
                    </p>
                </section>
            </div>

            {/* Ratings & Reviews Section */}
            <section className="portal-card">
                <div className="portal-title-row">
                    <div className="portal-title-copy">
                        <h3>Ratings & Reviews</h3>
                        <p>
                            {providerReviews.length} review{providerReviews.length !== 1 ? "s" : ""} · Average{" "}
                            {avgRating.toFixed(1)} out of 5
                        </p>
                    </div>
                </div>

                {/* Rating summary */}
                <div style={styles.ratingSummary}>
                    <div style={styles.ratingBig}>
                        <span style={{ fontSize: 48, fontWeight: 800 }}>{avgRating.toFixed(1)}</span>
                        <StarRating rating={Math.round(avgRating)} size={22} />
                        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
                            {providerReviews.length || service.providerReviews} ratings
                        </p>
                    </div>
                    <div style={styles.ratingBars}>
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = providerReviews.filter(
                                (r) => Math.round(Number(r.rating)) === star
                            ).length;
                            const pct =
                                providerReviews.length > 0 ? (count / providerReviews.length) * 100 : 0;
                            return (
                                <div key={star} style={styles.barRow}>
                                    <span style={{ fontSize: 13, width: 16, color: "#94a3b8" }}>{star}</span>
                                    <span style={{ fontSize: 12, color: "#fbbf24" }}>★</span>
                                    <div style={styles.barTrack}>
                                        <div style={{ ...styles.barFill, width: `${pct}%` }} />
                                    </div>
                                    <span style={{ fontSize: 12, color: "#94a3b8", width: 25, textAlign: "right" }}>
                                        {count}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Review list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                    {providerReviews.length === 0 && (
                        <div style={styles.noReviews}>
                            <p style={{ color: "#64748b", margin: 0 }}>
                                No reviews yet. Be the first to review this provider!
                            </p>
                        </div>
                    )}

                    {providerReviews.map((review) => (
                        <article key={review.id} style={styles.reviewCard}>
                            <div style={styles.reviewHeader}>
                                <div style={styles.reviewAvatar}>
                                    {(review.customerName || "C").charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <h5 style={{ margin: 0, fontSize: 14 }}>{review.customerName || "Customer"}</h5>
                                        <span style={{ fontSize: 11, color: "#64748b" }}>
                                            {review.createdAt
                                                ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                })
                                                : ""}
                                        </span>
                                    </div>
                                    <StarRating rating={review.rating} size={14} />
                                </div>
                            </div>
                            <p style={{ margin: "8px 0 0", color: "#e2e8f0", fontSize: 14, lineHeight: 1.5 }}>
                                {review.text}
                            </p>
                        </article>
                    ))}
                </div>

                {/* Write a review */}
                {hasCompletedBooking && !alreadyReviewed && (
                    <div style={styles.writeReview}>
                        <h4 style={{ margin: "0 0 12px", fontSize: 16 }}>Write a Review</h4>
                        <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6, display: "block" }}>
                                Your Rating
                            </label>
                            <StarRating rating={reviewRating} size={28} interactive onChange={setReviewRating} />
                        </div>
                        <div className="portal-field" style={{ marginBottom: 14 }}>
                            <label>Your Review</label>
                            <textarea
                                placeholder="Share your experience with this service provider..."
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                style={{ minHeight: 80 }}
                            />
                        </div>
                        <button className="portal-button" onClick={handleReviewSubmit}>
                            Submit Review
                        </button>
                    </div>
                )}

                {hasCompletedBooking && alreadyReviewed && (
                    <p style={{ marginTop: 16, color: "#22c55e", fontSize: 13 }}>
                        ✓ You've already reviewed this provider. Thank you!
                    </p>
                )}

                {!hasCompletedBooking && (
                    <p style={{ marginTop: 16, color: "#94a3b8", fontSize: 13 }}>
                        💡 Complete a booking with this provider to leave a review.
                    </p>
                )}
            </section>
        </>
    );
};

export default ServiceDetail;

const styles = {
    hero: {
        background: "linear-gradient(130deg, #0ea5e9 0%, #0284c7 40%, #1e293b 100%)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap"
    },
    badgeRow: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap"
    },
    categoryBadge: {
        padding: "4px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        background: "rgba(255,255,255,0.2)",
        color: "#fff",
        backdropFilter: "blur(4px)"
    },
    priceBlock: {
        textAlign: "right",
        minWidth: 140
    },
    detailGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: 14
    },
    providerHeader: {
        display: "flex",
        gap: 14,
        alignItems: "center",
        marginBottom: 16
    },
    providerAvatar: {
        width: 50,
        height: 50,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(165deg, #67e8f9, #06b6d4)",
        fontWeight: 700,
        fontSize: 22,
        color: "#083344"
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 10
    },
    statCard: {
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(15,23,42,0.6)",
        textAlign: "center"
    },
    statLabel: {
        margin: "4px 0 0",
        color: "#94a3b8",
        fontSize: 12
    },
    otherServiceItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(15,23,42,0.5)",
        cursor: "pointer",
        transition: "border-color 0.2s"
    },
    bookingCard: {
        borderColor: "rgba(6,182,212,0.35)",
        position: "sticky",
        top: 20,
        alignSelf: "start"
    },
    ratingSummary: {
        display: "flex",
        gap: 30,
        alignItems: "center",
        flexWrap: "wrap",
        padding: "16px 0"
    },
    ratingBig: {
        textAlign: "center",
        minWidth: 120
    },
    ratingBars: {
        flex: 1,
        minWidth: 200,
        display: "flex",
        flexDirection: "column",
        gap: 6
    },
    barRow: {
        display: "flex",
        alignItems: "center",
        gap: 6
    },
    barTrack: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        background: "rgba(148,163,184,0.15)",
        overflow: "hidden"
    },
    barFill: {
        height: "100%",
        borderRadius: 4,
        background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
        transition: "width 0.3s"
    },
    noReviews: {
        padding: 20,
        textAlign: "center",
        borderRadius: 12,
        border: "1px dashed rgba(148,163,184,0.25)"
    },
    reviewCard: {
        padding: 14,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(15,23,42,0.5)"
    },
    reviewHeader: {
        display: "flex",
        gap: 10,
        alignItems: "flex-start"
    },
    reviewAvatar: {
        width: 34,
        height: 34,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(165deg, #a78bfa, #7c3aed)",
        fontWeight: 700,
        fontSize: 14,
        color: "#fff",
        flexShrink: 0
    },
    writeReview: {
        marginTop: 20,
        padding: 16,
        borderRadius: 14,
        border: "1px dashed rgba(6,182,212,0.35)",
        background: "rgba(6,182,212,0.05)"
    }
};
