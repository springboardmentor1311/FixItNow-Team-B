import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ─── Fix default Leaflet marker icons (broken by bundlers) ─── */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

/* ─── Colored marker factory ─── */
const PIN_COLORS = ["#06b6d4", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ec4899"];

const createColoredIcon = (color, isUser = false) => {
    const size = isUser ? 20 : 14;
    const svgIcon = isUser
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 40 40">
             <circle cx="20" cy="20" r="18" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2"/>
             <circle cx="20" cy="20" r="8" fill="${color}"/>
           </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
             <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.268 21.732 0 14 0z" fill="${color}"/>
             <circle cx="14" cy="14" r="6" fill="#fff" fill-opacity="0.9"/>
           </svg>`;
    return L.divIcon({
        html: svgIcon,
        className: "",
        iconSize: isUser ? [size * 2, size * 2] : [28, 40],
        iconAnchor: isUser ? [size, size] : [14, 40],
        popupAnchor: isUser ? [0, -size] : [0, -40]
    });
};

const userIcon = createColoredIcon("#3b82f6", true);

/* ─── Geocoding cache & helper ─── */
const geocodeCache = {};

const geocodeAddress = async (address) => {
    if (!address || typeof address !== "string") return null;
    const key = address.trim().toLowerCase();
    if (geocodeCache[key]) return geocodeCache[key];

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
            { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (data.length > 0) {
            const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            geocodeCache[key] = result;
            return result;
        }
    } catch {
        /* ignore */
    }
    return null;
};

/* ─── Haversine distance (km) ─── */
const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ─── Component to fly to a location ─── */
const FlyToLocation = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) map.flyTo(position, 13, { duration: 1.2 });
    }, [position, map]);
    return null;
};

/* ─── Fit to bounds helper ─── */
const FitBounds = ({ positions }) => {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (fitted.current || !positions.length) return;
        const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
            fitted.current = true;
        }
    }, [positions, map]);
    return null;
};

/* ═══════════════════════════════════════════════════════════════
   STATUS HELPERS
   ═══════════════════════════════════════════════════════════════ */

const STATUS_TONE = {
    Pending: "warn",
    Confirmed: "ok",
    Completed: "ok",
    Cancelled: "danger"
};

const statusLabel = (status) => {
    const labels = {
        Pending: "⏳ Pending",
        Confirmed: "✅ Confirmed",
        Completed: "✔ Completed",
        Cancelled: "✖ Cancelled"
    };
    return labels[status] || status;
};

/* ═══════════════════════════════════════════════════════════════
   MapBookingSearch — Main Component (Provider Side)
   ═══════════════════════════════════════════════════════════════ */

const MapBookingSearch = ({
    bookings = [],
    onChatCustomer,
    onMarkCompleted,
    onAcceptBooking,
    onCancelBooking
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    /* Geolocation */
    const [userLocation, setUserLocation] = useState(null);
    const [geoStatus, setGeoStatus] = useState("");
    const [isLocating, setIsLocating] = useState(false);

    /* Geocoded customer positions: { [bookingId]: { lat, lng } } */
    const [bookingPositions, setBookingPositions] = useState({});
    const geocodingRef = useRef(false);

    const categories = useMemo(() => {
        const set = new Set(["All"]);
        bookings.forEach((b) => set.add(b.category));
        return Array.from(set);
    }, [bookings]);

    const statusOptions = useMemo(() => {
        const set = new Set(["All"]);
        bookings.forEach((b) => set.add(b.status));
        return Array.from(set);
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        return bookings.filter((b) => {
            const catMatch = selectedCategory === "All" || b.category === selectedCategory;
            const statusMatch = statusFilter === "All" || b.status === statusFilter;
            const locMatch = !searchQuery.trim()
                ? true
                : String(b.customerLocation || "")
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase()) ||
                String(b.customerName || "")
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase());
            return catMatch && statusMatch && locMatch;
        });
    }, [bookings, selectedCategory, statusFilter, searchQuery]);

    /* ─── Geocode all customer booking addresses ─── */
    useEffect(() => {
        if (geocodingRef.current) return;
        geocodingRef.current = true;

        const allLocations = new Map();
        bookings.forEach((b) => {
            if (b.id && b.customerLocation) {
                allLocations.set(b.id, b.customerLocation);
            }
        });

        const run = async () => {
            const results = {};
            for (const [id, loc] of allLocations.entries()) {
                const coords = await geocodeAddress(loc);
                if (coords) results[id] = coords;
                /* Nominatim rate limit: 1 req/sec */
                await new Promise((r) => setTimeout(r, 1100));
            }
            setBookingPositions((prev) => ({ ...prev, ...results }));
        };

        run();
    }, [bookings]);

    /* ─── Sort bookings by proximity when user location is available ─── */
    const sortedBookings = useMemo(() => {
        if (!userLocation) return filteredBookings;
        return [...filteredBookings].sort((a, b) => {
            const posA = bookingPositions[a.id];
            const posB = bookingPositions[b.id];
            if (!posA && !posB) return 0;
            if (!posA) return 1;
            if (!posB) return -1;
            const distA = haversineKm(userLocation.lat, userLocation.lng, posA.lat, posA.lng);
            const distB = haversineKm(userLocation.lat, userLocation.lng, posB.lat, posB.lng);
            return distA - distB;
        });
    }, [filteredBookings, userLocation, bookingPositions]);

    /* ─── Detect user (provider) location ─── */
    const detectLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setGeoStatus("Geolocation is not supported by your browser.");
            return;
        }
        setIsLocating(true);
        setGeoStatus("Detecting your location…");

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setUserLocation(loc);

                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${loc.lat}&lon=${loc.lng}&addressdetails=1&zoom=16`,
                        { headers: { Accept: "application/json" } }
                    );
                    if (res.ok) {
                        const data = await res.json();
                        const addr = data.address || {};
                        const place = [
                            addr.suburb || addr.neighbourhood,
                            addr.city || addr.town || addr.village,
                            addr.state
                        ].filter(Boolean).join(", ");
                        setGeoStatus(place ? `📍 ${place}` : `📍 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
                    } else {
                        setGeoStatus(`📍 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
                    }
                } catch {
                    setGeoStatus(`📍 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
                }
                setIsLocating(false);
            },
            () => {
                setGeoStatus("Location access denied. Please allow location access.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
        );
    }, []);

    /* ─── Map center: user location → first geocoded booking → India default ─── */
    const geocodedPositions = useMemo(
        () => Object.values(bookingPositions).filter(Boolean),
        [bookingPositions]
    );

    const mapCenter = useMemo(() => {
        if (userLocation) return [userLocation.lat, userLocation.lng];
        if (geocodedPositions.length) return [geocodedPositions[0].lat, geocodedPositions[0].lng];
        return [19.076, 72.8777]; // Mumbai default
    }, [userLocation, geocodedPositions]);

    const getBookingDistance = (bookingId) => {
        if (!userLocation || !bookingPositions[bookingId]) return null;
        return haversineKm(
            userLocation.lat,
            userLocation.lng,
            bookingPositions[bookingId].lat,
            bookingPositions[bookingId].lng
        );
    };

    return (
        <section className="portal-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* ─── Top bar ─── */}
            <div style={styles.topBar}>
                <div style={styles.topBarLeft}>
                    <h3 style={{ margin: 0, fontSize: 21 }}>Booking Map View</h3>
                    <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13 }}>
                        {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""} shown
                    </p>
                </div>
                <div style={styles.filterRow}>
                    <input
                        type="text"
                        placeholder="Search by customer or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={styles.categorySelect}
                    >
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={styles.categorySelect}
                    >
                        {statusOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        style={styles.locationBtn}
                        onClick={detectLocation}
                        disabled={isLocating}
                    >
                        {isLocating ? "Detecting…" : "📍 My Location"}
                    </button>
                </div>
            </div>

            {/* ─── Geo status ─── */}
            {geoStatus && (
                <div style={styles.geoStatusBar}>
                    <span style={{ fontSize: 13, color: "#bae6fd" }}>{geoStatus}</span>
                </div>
            )}

            {/* ─── Map container ─── */}
            <div style={styles.mapContainer}>
                <div style={styles.mapWrapper}>
                    <MapContainer
                        center={mapCenter}
                        zoom={12}
                        style={{ width: "100%", height: "100%" }}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Fit bounds on initial load */}
                        {!userLocation && geocodedPositions.length > 0 && (
                            <FitBounds positions={geocodedPositions} />
                        )}

                        {/* Fly to user location when detected */}
                        {userLocation && <FlyToLocation position={[userLocation.lat, userLocation.lng]} />}

                        {/* Provider (user) location marker */}
                        {userLocation && (
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                                <Popup>
                                    <div style={styles.userPopup}>
                                        <strong>📍 Your Location</strong>
                                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
                                            {geoStatus.replace("📍 ", "")}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}

                        {/* Customer booking markers */}
                        {filteredBookings.map((booking, idx) => {
                            const pos = bookingPositions[booking.id];
                            if (!pos) return null;
                            const color = PIN_COLORS[idx % PIN_COLORS.length];
                            const dist = getBookingDistance(booking.id);

                            return (
                                <Marker
                                    key={booking.id}
                                    position={[pos.lat, pos.lng]}
                                    icon={createColoredIcon(color)}
                                >
                                    <Popup maxWidth={300}>
                                        <div style={styles.popupContent}>
                                            <div style={styles.popupHeader}>
                                                <div style={{ ...styles.popupAvatar, background: color }}>
                                                    {(booking.customerName || "C").charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: 15, color: "#1e293b" }}>
                                                        {booking.customerName}
                                                    </h4>
                                                    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
                                                        📍 {booking.customerLocation || "Unknown"}
                                                        {dist != null && ` · ${dist.toFixed(1)} km away`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={styles.popupStats}>
                                                <span style={styles.popupStat}>
                                                    {booking.category}
                                                </span>
                                                <span style={styles.popupStat}>
                                                    {booking.subcategory}
                                                </span>
                                                <span style={styles.popupStat}>
                                                    Rs.{booking.price}
                                                </span>
                                            </div>
                                            <div style={styles.popupServices}>
                                                <span style={{
                                                    ...styles.popupServiceChip,
                                                    background: STATUS_TONE[booking.status] === "ok"
                                                        ? "#dcfce7"
                                                        : STATUS_TONE[booking.status] === "warn"
                                                            ? "#fef3c7"
                                                            : "#fee2e2",
                                                    color: STATUS_TONE[booking.status] === "ok"
                                                        ? "#166534"
                                                        : STATUS_TONE[booking.status] === "warn"
                                                            ? "#92400e"
                                                            : "#991b1b"
                                                }}>
                                                    {statusLabel(booking.status)}
                                                </span>
                                                {booking.selectedSlot && (
                                                    <span style={styles.popupServiceChip}>
                                                        🕐 {booking.selectedSlot}
                                                    </span>
                                                )}
                                            </div>
                                            {booking.status === "Confirmed" && onChatCustomer && (
                                                <button
                                                    style={styles.popupBtn}
                                                    onClick={() => onChatCustomer(booking)}
                                                >
                                                    Chat Customer
                                                </button>
                                            )}
                                            {booking.status === "Pending" && onAcceptBooking && (
                                                <button
                                                    style={styles.popupBtn}
                                                    onClick={() => onAcceptBooking(booking)}
                                                >
                                                    Accept Booking
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Legend sidebar */}
                <div style={styles.legend}>
                    <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                        Bookings
                    </span>
                    {sortedBookings.slice(0, 8).map((b, i) => {
                        const dist = getBookingDistance(b.id);
                        const hasPin = !!bookingPositions[b.id];
                        return (
                            <div key={b.id} style={styles.legendItem}>
                                <div style={{
                                    ...styles.legendDot,
                                    background: PIN_COLORS[filteredBookings.indexOf(b) % PIN_COLORS.length],
                                    opacity: hasPin ? 1 : 0.3
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 12, color: "#e2e8f0", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {b.customerName}
                                    </span>
                                    <span style={{ fontSize: 10, color: "#94a3b8", display: "block" }}>
                                        {b.subcategory}
                                    </span>
                                    {dist != null && (
                                        <span style={{ fontSize: 10, color: "#67e8f9" }}>
                                            {dist.toFixed(1)} km
                                        </span>
                                    )}
                                    {!hasPin && (
                                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                                            Locating…
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {sortedBookings.length > 8 && (
                        <span style={{ fontSize: 11, color: "#64748b" }}>+{sortedBookings.length - 8} more</span>
                    )}
                </div>
            </div>

            {/* ─── Booking list below map ─── */}
            <div style={styles.providerListSection}>
                <h4 style={{ margin: "0 0 12px", fontSize: 17 }}>All Bookings</h4>
                <div className="portal-list-grid">
                    {sortedBookings.length === 0 && (
                        <article className="portal-list-card">
                            <h4>No bookings found</h4>
                            <p className="portal-list-sub">Adjust your filters or wait for customer bookings.</p>
                        </article>
                    )}
                    {sortedBookings.map((booking, idx) => {
                        const dist = getBookingDistance(booking.id);
                        const originalIdx = filteredBookings.indexOf(booking);
                        return (
                            <article
                                className="portal-list-card"
                                key={booking.id}
                                style={{
                                    borderLeftColor: PIN_COLORS[originalIdx % PIN_COLORS.length],
                                    borderLeftWidth: 3
                                }}
                            >
                                <h4>{booking.subcategory}</h4>
                                <p className="portal-list-sub">
                                    👤 {booking.customerName}
                                </p>
                                <p className="portal-list-sub">
                                    📍 {booking.customerLocation || "N/A"}
                                    {dist != null && (
                                        <span style={{ color: "#67e8f9", fontWeight: 600 }}> · {dist.toFixed(1)} km away</span>
                                    )}
                                </p>
                                <p className="portal-list-sub">
                                    {booking.category} | Rs.{booking.price}
                                    {booking.selectedSlot ? ` | 🕐 ${booking.selectedSlot}` : ""}
                                </p>
                                <span className={`portal-status ${STATUS_TONE[booking.status] || ""}`}>
                                    {statusLabel(booking.status)}
                                </span>

                                <div className="portal-button-row">
                                    {booking.status === "Pending" && onAcceptBooking && (
                                        <button className="portal-button" onClick={() => onAcceptBooking(booking)}>
                                            Accept
                                        </button>
                                    )}
                                    {booking.status === "Pending" && onCancelBooking && (
                                        <button
                                            className="portal-button secondary"
                                            onClick={() => onCancelBooking(booking)}
                                        >
                                            Reject
                                        </button>
                                    )}
                                    {booking.status === "Confirmed" && onChatCustomer && (
                                        <button className="portal-button" onClick={() => onChatCustomer(booking)}>
                                            Chat Customer
                                        </button>
                                    )}
                                    {booking.status === "Confirmed" && onMarkCompleted && (
                                        <button
                                            className="portal-button secondary"
                                            onClick={() => onMarkCompleted(booking)}
                                        >
                                            Mark Completed
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default MapBookingSearch;

/* ═══════════════════════════════════════════════════════════════
   Inline Styles
   ═══════════════════════════════════════════════════════════════ */

const styles = {
    topBar: {
        padding: "16px 18px",
        borderBottom: "1px solid rgba(148,163,184,0.28)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12
    },
    topBarLeft: {
        display: "flex",
        flexDirection: "column",
        gap: 4
    },
    filterRow: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
    },
    searchInput: {
        border: "1px solid rgba(148,163,184,0.3)",
        borderRadius: 10,
        background: "rgba(15,23,42,0.95)",
        color: "#eff9ff",
        padding: "9px 14px",
        fontSize: 14,
        minWidth: 200
    },
    categorySelect: {
        border: "1px solid rgba(148,163,184,0.3)",
        borderRadius: 10,
        background: "rgba(15,23,42,0.95)",
        color: "#eff9ff",
        padding: "9px 14px",
        fontSize: 14
    },
    locationBtn: {
        border: "1px solid rgba(6,182,212,0.55)",
        borderRadius: 10,
        background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(56,189,248,0.15))",
        color: "#cffafe",
        padding: "9px 16px",
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.2s"
    },
    geoStatusBar: {
        padding: "6px 18px",
        borderBottom: "1px solid rgba(148,163,184,0.15)",
        background: "rgba(6,182,212,0.08)"
    },
    mapContainer: {
        position: "relative",
        height: 480,
        display: "flex"
    },
    mapWrapper: {
        flex: 1,
        position: "relative",
        overflow: "hidden"
    },
    legend: {
        width: 180,
        padding: "14px 12px",
        borderLeft: "1px solid rgba(148,163,184,0.15)",
        background: "rgba(15,23,42,0.6)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        overflowY: "auto"
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "3px 0"
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        flexShrink: 0
    },
    providerListSection: {
        padding: "18px",
        borderTop: "1px solid rgba(148,163,184,0.2)"
    },
    /* Popup styles */
    popupContent: {
        minWidth: 220,
        fontFamily: "inherit"
    },
    popupHeader: {
        display: "flex",
        gap: 10,
        alignItems: "center",
        marginBottom: 8
    },
    popupAvatar: {
        width: 38,
        height: 38,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: 16,
        color: "#fff",
        flexShrink: 0
    },
    popupStats: {
        display: "flex",
        gap: 12,
        marginBottom: 8
    },
    popupStat: {
        fontSize: 12,
        color: "#64748b"
    },
    popupServices: {
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        marginBottom: 10
    },
    popupServiceChip: {
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        background: "#e0f2fe",
        color: "#0284c7",
        whiteSpace: "nowrap"
    },
    popupBtn: {
        width: "100%",
        border: "none",
        borderRadius: 8,
        padding: "8px 0",
        background: "linear-gradient(135deg, #06b6d4, #0284c7)",
        color: "#fff",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer"
    },
    userPopup: {
        fontFamily: "inherit",
        minWidth: 160
    }
};
