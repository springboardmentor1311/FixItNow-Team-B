import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import PortalLayout from "../layout/PortalLayout";
import { useAuth } from "../auth/AuthContext";
import { normalizeEmail } from "../auth/localAuth";
import { useAppData } from "../state/AppDataContext";
import MapBookingSearch from "./MapBookingSearch";

const providerMenuBase = [
  { label: "Dashboard", path: "/provider/dashboard" },
  { label: "Service Requests", path: "/provider/requests" },
  { label: "My Services", path: "/provider/services" },
  { label: "Map View", path: "/provider/map" },
  { label: "Earnings", path: "/provider/earnings" },
  { label: "Messages", path: "/provider/messages" },
  { label: "Settings", path: "/provider/settings" }
];

const defaultProviderDraft = {
  displayName: "",
  category: "Home Service",
  radius: "10 km",
  availability: "Mon - Sat, 9 AM - 8 PM",
  location: ""
};

const readSeenTimestamp = (storageKey) => {
  if (!storageKey) return 0;
  const raw = Number(localStorage.getItem(storageKey));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

const saveSeenTimestamp = (storageKey, timestamp) => {
  if (!storageKey) return;
  localStorage.setItem(storageKey, String(timestamp));
};

const toEpochMs = (value) => {
  const parsed = new Date(value || "").getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const readThreadSeenMap = (storageKey) => {
  if (!storageKey) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (!parsed || typeof parsed !== "object") return {};

    return Object.entries(parsed).reduce((acc, [threadId, seenAt]) => {
      const numericSeenAt = Number(seenAt);
      if (Number.isFinite(numericSeenAt) && numericSeenAt > 0) {
        acc[threadId] = numericSeenAt;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const saveThreadSeenMap = (storageKey, seenMap) => {
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify(seenMap));
};

const getMessageEpochMs = (message = {}) => {
  const createdAtMs = toEpochMs(message.createdAt);
  if (createdAtMs > 0) return createdAtMs;

  const idMatch = String(message.id || "").match(/^msg-(\d+)-/);
  if (!idMatch) return 0;

  const idTime = Number(idMatch[1]);
  return Number.isFinite(idTime) && idTime > 0 ? idTime : 0;
};

const ProviderDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const {
    portalData,
    saveProviderProfile,
    setProviderOnline,
    saveProviderSelectedSlots,
    saveProviderServices,
    updateBookingStatus,
    addBookingMessage,
    addAdminProviderMessage,
    bookingStatusLabel
  } = useAppData();

  const providerEmail = normalizeEmail(user?.email || "");
  const [feedback, setFeedback] = useState("");
  const [providerChatText, setProviderChatText] = useState("");
  const [activeChatTarget, setActiveChatTarget] = useState("admin");
  const [lastSeenRequestsAt, setLastSeenRequestsAt] = useState(0);
  const [threadSeenMap, setThreadSeenMap] = useState({});

  const providerEntry = useMemo(
    () =>
      portalData.providerQueue.find(
        (provider) => normalizeEmail(provider.email) === providerEmail
      ) || null,
    [portalData.providerQueue, providerEmail]
  );

  const providerSetting = useMemo(() => {
    if (!providerEmail) return null;
    return portalData.providerSettings?.[providerEmail] || null;
  }, [portalData.providerSettings, providerEmail]);

  const providerServices = useMemo(
    () =>
      portalData.providerServiceCatalog
        .filter((service) => normalizeEmail(service.providerEmail) === providerEmail)
        .sort((a, b) => `${a.category}-${a.subcategory}`.localeCompare(`${b.category}-${b.subcategory}`)),
    [portalData.providerServiceCatalog, providerEmail]
  );

  const providerBookings = useMemo(
    () =>
      portalData.bookings
        .filter((booking) => normalizeEmail(booking.providerEmail) === providerEmail)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [portalData.bookings, providerEmail]
  );

  const pendingBookings = useMemo(
    () => providerBookings.filter((booking) => booking.status === "Pending"),
    [providerBookings]
  );

  const acceptedBookings = useMemo(
    () => providerBookings.filter((booking) => booking.status === "Confirmed"),
    [providerBookings]
  );

  const requestSeenStorageKey = providerEmail
    ? `fixitnow_seen_provider_requests_${providerEmail}`
    : "";
  const threadSeenStorageKey = providerEmail
    ? `fixitnow_seen_provider_thread_messages_${providerEmail}`
    : "";

  useEffect(() => {
    if (!providerEmail) {
      setLastSeenRequestsAt(0);
      setThreadSeenMap({});
      return;
    }

    setLastSeenRequestsAt(readSeenTimestamp(requestSeenStorageKey));
    setThreadSeenMap(readThreadSeenMap(threadSeenStorageKey));
  }, [providerEmail, requestSeenStorageKey, threadSeenStorageKey]);

  useEffect(() => {
    if (!providerEmail) return;
    if (!location.pathname.startsWith("/provider/requests")) return;

    const now = Date.now();
    setLastSeenRequestsAt(now);
    saveSeenTimestamp(requestSeenStorageKey, now);
  }, [location.pathname, providerEmail, requestSeenStorageKey]);

  const isIncomingCustomerMessage = (booking, message) => {
    const role = String(message?.senderRole || "").toUpperCase();
    if (role === "CUSTOMER") return true;
    if (role === "PROVIDER" || role === "SYSTEM" || role === "ADMIN") return false;

    const senderEmail = normalizeEmail(message?.senderEmail || "");
    const bookingCustomerEmail = normalizeEmail(booking?.customerEmail || "");
    if (!senderEmail || !bookingCustomerEmail) {
      return String(message?.from || "").trim().toLowerCase() !== "system";
    }
    return Boolean(senderEmail && bookingCustomerEmail && senderEmail === bookingCustomerEmail);
  };

  useEffect(() => {
    if (!location.pathname.startsWith("/provider/messages")) return;

    const nextSeen = { ...threadSeenMap };
    let changed = false;

    acceptedBookings.forEach((booking) => {
      const latestIncomingAt = (portalData.bookingMessages[booking.id] || []).reduce(
        (latest, message) => {
          if (!isIncomingCustomerMessage(booking, message)) return latest;
          return Math.max(latest, getMessageEpochMs(message));
        },
        0
      );

      if (latestIncomingAt <= 0) return;
      if ((nextSeen[booking.id] || 0) >= latestIncomingAt) return;

      nextSeen[booking.id] = latestIncomingAt;
      changed = true;
    });

    if (!changed) return;

    setThreadSeenMap(nextSeen);
    saveThreadSeenMap(threadSeenStorageKey, nextSeen);
  }, [
    location.pathname,
    acceptedBookings,
    portalData.bookingMessages,
    threadSeenStorageKey,
    threadSeenMap
  ]);

  const providerRequestBadgeCount = useMemo(
    () =>
      pendingBookings.filter((booking) => toEpochMs(booking.createdAt) > lastSeenRequestsAt)
        .length,
    [pendingBookings, lastSeenRequestsAt]
  );

  const providerUnreadMessageByBookingId = useMemo(
    () =>
      acceptedBookings.reduce((map, booking) => {
        const seenAt = threadSeenMap[booking.id] || 0;
        const unreadInThread = (portalData.bookingMessages[booking.id] || []).filter(
          (message) => isIncomingCustomerMessage(booking, message) && getMessageEpochMs(message) > seenAt
        ).length;

        map[booking.id] = unreadInThread;
        return map;
      }, {}),
    [acceptedBookings, portalData.bookingMessages, threadSeenMap]
  );

  const providerUnreadMessageCount = useMemo(
    () =>
      Object.values(providerUnreadMessageByBookingId).reduce((sum, count) => sum + Number(count || 0), 0),
    [providerUnreadMessageByBookingId]
  );

  const providerMessageBadgeCount = providerUnreadMessageCount;

  const providerMenu = useMemo(
    () =>
      providerMenuBase.map((item) => {
        if (item.path === "/provider/requests") {
          return { ...item, badgeCount: providerRequestBadgeCount };
        }
        if (item.path === "/provider/messages") {
          return { ...item, badgeCount: providerMessageBadgeCount };
        }
        return item;
      }),
    [providerRequestBadgeCount, providerMessageBadgeCount]
  );

  const providerPerformance = useMemo(
    () =>
      portalData.providerProfiles.find(
        (profile) => normalizeEmail(profile.providerEmail) === providerEmail
      ) || null,
    [portalData.providerProfiles, providerEmail]
  );

  const categories = useMemo(
    () => Object.keys(portalData.serviceCategories || {}),
    [portalData.serviceCategories]
  );

  const [providerDraft, setProviderDraft] = useState(defaultProviderDraft);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || "Home Service");
  const [serviceDraftBySubcategory, setServiceDraftBySubcategory] = useState({});

  const categorySubservices = useMemo(
    () => portalData.serviceCategories?.[selectedCategory] || [],
    [portalData.serviceCategories, selectedCategory]
  );

  useEffect(() => {
    if (!providerEntry) return;
    const nextDraft = {
      displayName: providerSetting?.displayName || providerEntry.name || "",
      category: providerSetting?.category || providerEntry.serviceType || "Home Service",
      radius: providerSetting?.radius || "10 km",
      availability: providerSetting?.availability || "Mon - Sat, 9 AM - 8 PM",
      location: providerSetting?.location || providerEntry.area || providerEntry.address || ""
    };
    setProviderDraft(nextDraft);
    setSelectedSlots(providerSetting?.selectedSlots || providerEntry.selectedSlots || []);
    setSelectedCategory(nextDraft.category);
  }, [providerEntry, providerSetting]);

  useEffect(() => {
    const nextDrafts = {};
    categorySubservices.forEach((subcategory) => {
      const existingService = providerServices.find(
        (service) => service.category === selectedCategory && service.subcategory === subcategory
      );
      nextDrafts[subcategory] = {
        price: String(existingService?.price ?? ""),
        available: existingService?.available !== false
      };
    });
    setServiceDraftBySubcategory(nextDrafts);
  }, [selectedCategory, categorySubservices, providerServices]);

  useEffect(() => {
    if (activeChatTarget === "admin") return;
    const exists = acceptedBookings.some((booking) => booking.id === activeChatTarget);
    if (!exists) {
      setActiveChatTarget("admin");
    }
  }, [activeChatTarget, acceptedBookings]);

  const weeklyEarnings = useMemo(
    () => acceptedBookings.reduce((sum, booking) => sum + Number(booking.price || 0), 0),
    [acceptedBookings]
  );

  const activeServiceCount = useMemo(
    () => providerServices.filter((service) => service.available && Number(service.price) > 0).length,
    [providerServices]
  );

  const activeThreadMessages =
    activeChatTarget === "admin"
      ? portalData.adminProviderChat
      : portalData.bookingMessages[activeChatTarget] || [];

  const activeChatBooking = useMemo(
    () => providerBookings.find((booking) => booking.id === activeChatTarget) || null,
    [providerBookings, activeChatTarget]
  );
  const visibleChatBookings = useMemo(() => {
    if (activeChatTarget === "admin" || !activeChatBooking) return [];
    return [activeChatBooking];
  }, [activeChatTarget, activeChatBooking]);

  const onToggleOnline = () => {
    if (!providerEmail) return;
    const nextState = !Boolean(providerSetting?.online);
    setProviderOnline(nextState, providerEmail);
    setFeedback(nextState ? "You are now online for new requests." : "You are now offline.");
  };

  const toggleSlot = (slot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((existingSlot) => existingSlot !== slot) : [...prev, slot]
    );
  };

  const updateServiceDraft = (subcategory, changes) => {
    setServiceDraftBySubcategory((prev) => ({
      ...prev,
      [subcategory]: {
        ...prev[subcategory],
        ...changes
      }
    }));
  };

  const saveCategoryServices = () => {
    if (!providerEmail) return;

    const untouchedServices = providerServices.filter(
      (service) => service.category !== selectedCategory
    );
    const categoryServices = categorySubservices.map((subcategory) => {
      const existingService = providerServices.find(
        (service) => service.category === selectedCategory && service.subcategory === subcategory
      );
      const draft = serviceDraftBySubcategory[subcategory] || {};
      const numericPrice = Number(draft.price);

      return {
        id: existingService?.id,
        category: selectedCategory,
        subcategory,
        price: Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0,
        available: Boolean(draft.available)
      };
    });

    saveProviderServices(providerEmail, [...untouchedServices, ...categoryServices]);
    saveProviderProfile({ category: selectedCategory }, providerEmail);
    setFeedback(`${selectedCategory} services updated with pricing and availability.`);
  };

  const saveProviderSettings = () => {
    if (!providerEmail) return;
    if (selectedSlots.length === 0) {
      setFeedback("Please choose at least one slot.");
      return;
    }

    saveProviderProfile(
      {
        ...providerDraft,
        category: selectedCategory,
        selectedSlots
      },
      providerEmail
    );
    saveProviderSelectedSlots(selectedSlots, providerEmail);

    if (user?.role === "PROVIDER") {
      updateUser({
        name: providerDraft.displayName || user?.name,
        email: providerEmail
      });
    }

    setFeedback("Provider profile, slots, and preferences updated.");
  };

  const updateRequestStatus = (booking, status) => {
    if (!providerEmail) return;
    updateBookingStatus(booking.id, status, providerEmail);
    if (status === "Confirmed") {
      setFeedback(`${booking.customerName} booking confirmed.`);
      return;
    }
    if (status === "Completed") {
      setFeedback(`${booking.customerName} booking marked completed.`);
      return;
    }
    setFeedback(`${booking.customerName} booking cancelled.`);
  };

  const openBookingChat = (booking) => {
    setActiveChatTarget(booking.id);
    navigate("/provider/messages");
  };

  const sendProviderMessage = () => {
    const text = providerChatText.trim();
    if (!text) {
      setFeedback("Please type a message before sending.");
      return;
    }

    if (activeChatTarget === "admin") {
      addAdminProviderMessage({
        from: providerDraft.displayName || providerEntry?.name || "Provider",
        text
      });
      setFeedback("Message sent to admin.");
      setProviderChatText("");
      return;
    }

    if (!activeChatBooking) {
      setFeedback("Please select a valid booking thread.");
      return;
    }

    addBookingMessage({
      bookingId: activeChatBooking.id,
      from: providerDraft.displayName || providerEntry?.name || "Provider",
      text,
      senderRole: "PROVIDER",
      senderEmail: providerEmail
    });
    setFeedback(`Message sent to ${activeChatBooking.customerName}.`);
    setProviderChatText("");
  };

  if (!providerEntry) {
    return (
      <PortalLayout portalTitle="Service Provider" menuItems={providerMenu}>
        <section className="portal-card">
          <h3 style={{ marginTop: 0 }}>Provider profile not found</h3>
          <p>
            This provider account is not in onboarding data yet. Create provider account from the
            register page and complete admin verification.
          </p>
        </section>
      </PortalLayout>
    );
  }

  const ProviderHome = () => (
    <>
      <section className="portal-card portal-hero">
        <div>
          <h2>Provider Command Center</h2>
          <p>Track incoming bookings, manage pricing, and respond quickly to customers.</p>
        </div>
        <button className="portal-button" onClick={onToggleOnline}>
          {providerSetting?.online ? "Go Offline" : "Go Online"}
        </button>
      </section>

      <section className="portal-grid">
        <article className="portal-metric">
          <p className="portal-metric-value">{providerBookings.length}</p>
          <p className="portal-metric-label">Total requests</p>
          <p className="portal-metric-note portal-warn">{pendingBookings.length} pending</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{acceptedBookings.length}</p>
          <p className="portal-metric-label">Accepted bookings</p>
          <p className="portal-metric-note portal-ok">Chat enabled for accepted jobs</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{activeServiceCount}</p>
          <p className="portal-metric-label">Active listed services</p>
          <p className="portal-metric-note portal-ok">Visible to customers</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{selectedSlots.length}</p>
          <p className="portal-metric-label">Selected time slots</p>
          <p className="portal-metric-note">{providerSetting?.online ? "Online" : "Offline"}</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{providerPerformance?.rating?.toFixed(1) || "0.0"}</p>
          <p className="portal-metric-label">Average rating</p>
          <p className="portal-metric-note">{providerPerformance?.reviews || 0} reviews</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">Rs.{weeklyEarnings.toLocaleString("en-IN")}</p>
          <p className="portal-metric-label">Value of accepted jobs</p>
          <p className="portal-metric-note portal-ok">{providerPerformance?.completedJobs || 0} total jobs</p>
        </article>
      </section>

      <section className="portal-card">
        <div className="portal-title-row">
          <h3>New Booking Notifications</h3>
          <p>{pendingBookings.length} new</p>
        </div>
        <div className="portal-list">
          {pendingBookings.length === 0 && (
            <article className="portal-list-item">
              <h5>No new booking notifications</h5>
              <p>Incoming customer requests will appear here.</p>
            </article>
          )}
          {pendingBookings.map((booking) => (
            <article className="portal-list-item" key={booking.id}>
              <h5>
                {booking.customerName} have booked you for {booking.subcategory}
              </h5>
              <p>
                {booking.customerLocation} | {booking.category} | Rs.{booking.price}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const ProviderRequests = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Incoming Service Requests</h3>
        <p>Accept or reject customer bookings</p>
      </div>

      <div className="portal-list-grid">
        {providerBookings.length === 0 && (
          <article className="portal-list-card">
            <h4>No requests yet</h4>
            <p className="portal-list-sub">Customer bookings will appear here.</p>
          </article>
        )}

        {providerBookings.map((booking) => (
          <article className="portal-list-card" key={booking.id}>
            <h4>{booking.subcategory}</h4>
            <p className="portal-list-sub">{booking.customerName}</p>
            <p className="portal-list-sub">Category: {booking.category}</p>
            <p className="portal-list-sub">Location: {booking.customerLocation}</p>
            <p className="portal-list-sub">
              Slot: {booking.selectedSlot || "Customer did not select slot"}
            </p>
            <p className="portal-price">Rs.{booking.price}</p>
            <span className={`portal-status ${booking.tone}`}>
              {bookingStatusLabel(booking.status)}
            </span>

            {booking.status === "Pending" && (
              <div className="portal-button-row">
                <button className="portal-button" onClick={() => updateRequestStatus(booking, "Confirmed")}>
                  Accept
                </button>
                <button
                  className="portal-button secondary"
                  onClick={() => updateRequestStatus(booking, "Cancelled")}
                >
                  Cancel
                </button>
              </div>
            )}

            {booking.status === "Confirmed" && (
              <div className="portal-button-row">
                <button className="portal-button" onClick={() => openBookingChat(booking)}>
                  Chat Customer
                </button>
                <button
                  className="portal-button secondary"
                  onClick={() => updateRequestStatus(booking, "Completed")}
                >
                  Mark Completed
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );

  const ProviderServices = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Service Category / Subcategory</h3>
        <p>Set price and availability for each subservice</p>
      </div>

      <div className="portal-chip-row">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            className={`portal-chip ${selectedCategory === category ? "portal-chip-active" : ""}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="portal-list" style={{ marginTop: 12 }}>
        {categorySubservices.map((subcategory) => {
          const draft = serviceDraftBySubcategory[subcategory] || { price: "", available: true };
          return (
            <article className="portal-list-item" key={`${selectedCategory}-${subcategory}`}>
              <h5>{subcategory}</h5>
              <div className="portal-form-grid" style={{ marginTop: 10 }}>
                <div className="portal-field">
                  <label>Price (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    value={draft.price}
                    onChange={(e) =>
                      updateServiceDraft(subcategory, { price: e.target.value.replace(/[^\d]/g, "") })
                    }
                  />
                </div>
                <div className="portal-field">
                  <label>Availability</label>
                  <select
                    value={draft.available ? "Available" : "Unavailable"}
                    onChange={(e) =>
                      updateServiceDraft(subcategory, {
                        available: e.target.value === "Available"
                      })
                    }
                  >
                    <option>Available</option>
                    <option>Unavailable</option>
                  </select>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="portal-button-row">
        <button className="portal-button" onClick={saveCategoryServices}>
          Save {selectedCategory} Services
        </button>
      </div>

      <section className="portal-card" style={{ marginTop: 14 }}>
        <div className="portal-title-row">
          <h3>Live Services Shown To Customers</h3>
          <p>{providerServices.length} listed</p>
        </div>
        <div className="portal-list">
          {providerServices.map((service) => (
            <article className="portal-list-item" key={service.id}>
              <h5>
                {service.category} - {service.subcategory}
              </h5>
              <p>Rs.{service.price}</p>
              <span className={`portal-status ${service.available ? "ok" : "warn"}`}>
                {service.available ? "Available" : "Unavailable"}
              </span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );

  const ProviderEarnings = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Earnings Overview</h3>
        <p>Based on accepted bookings</p>
      </div>

      <section className="portal-grid">
        <article className="portal-metric">
          <p className="portal-metric-value">Rs.{weeklyEarnings.toLocaleString("en-IN")}</p>
          <p className="portal-metric-label">Accepted booking value</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{acceptedBookings.length}</p>
          <p className="portal-metric-label">Accepted requests</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">
            Rs.
            {acceptedBookings.length
              ? Math.round(weeklyEarnings / acceptedBookings.length).toLocaleString("en-IN")
              : 0}
          </p>
          <p className="portal-metric-label">Average ticket size</p>
        </article>
      </section>
    </section>
  );

  const ProviderMessages = () => (
    <section className="portal-split">
      <article className="portal-card">
        <div className="portal-title-row">
          <h3>Conversations</h3>
          <p>{providerUnreadMessageCount} unread</p>
        </div>
        <div className="portal-chip-row">
          <button
            type="button"
            className={`portal-chip ${activeChatTarget === "admin" ? "portal-chip-active" : ""}`}
            onClick={() => setActiveChatTarget("admin")}
          >
            Admin
          </button>
          {visibleChatBookings.map((booking) => {
            const unreadCount = providerUnreadMessageByBookingId[booking.id] || 0;
            return (
              <button
                type="button"
                key={booking.id}
                className={`portal-chip ${activeChatTarget === booking.id ? "portal-chip-active" : ""}`}
                onClick={() => setActiveChatTarget(booking.id)}
              >
                <span>{booking.customerName}</span>
                {unreadCount > 0 && (
                  <span className="portal-chip-notify">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="portal-list" style={{ marginTop: 12 }}>
          {activeChatTarget === "admin" ? (
            <div className="portal-list-item">
              <h5>Admin Desk</h5>
              <p>Verification and operations support</p>
            </div>
          ) : (
            <div className="portal-list-item">
              <h5>{activeChatBooking?.customerName}</h5>
              <p>
                Booking: {activeChatBooking?.subcategory} ({activeChatBooking?.category})
              </p>
            </div>
          )}
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-title-row">
          <h3>Message Preview</h3>
          <p>
            {activeChatTarget === "admin"
              ? "Admin chat"
              : "Customer chat enabled only after acceptance"}
          </p>
        </div>

        <div className="portal-list">
          {activeThreadMessages.map((message) => (
            <div className="portal-list-item" key={message.id}>
              <h5>{message.from}</h5>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <div className="portal-field">
          <label>
            Reply to {activeChatTarget === "admin" ? "Admin" : activeChatBooking?.customerName}
          </label>
          <textarea
            placeholder="Type your message here..."
            value={providerChatText}
            onChange={(e) => setProviderChatText(e.target.value)}
            disabled={activeChatTarget !== "admin" && !activeChatBooking}
          />
        </div>

        <div className="portal-button-row">
          <button className="portal-button" onClick={sendProviderMessage}>
            Send
          </button>
        </div>
      </article>
    </section>
  );

  const ProviderSettings = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Profile Settings</h3>
        <p>Update account details and slot visibility</p>
      </div>

      <div className="portal-form-grid">
        <div className="portal-field">
          <label>Display name</label>
          <input
            type="text"
            value={providerDraft.displayName}
            onChange={(e) =>
              setProviderDraft((prev) => ({ ...prev, displayName: e.target.value }))
            }
          />
        </div>
        <div className="portal-field">
          <label>Primary category</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setProviderDraft((prev) => ({ ...prev, category: e.target.value }));
            }}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="portal-field">
          <label>Service radius</label>
          <input
            type="text"
            value={providerDraft.radius}
            onChange={(e) => setProviderDraft((prev) => ({ ...prev, radius: e.target.value }))}
          />
        </div>
        <div className="portal-field">
          <label>Availability notes</label>
          <input
            type="text"
            value={providerDraft.availability}
            onChange={(e) =>
              setProviderDraft((prev) => ({ ...prev, availability: e.target.value }))
            }
          />
        </div>
        <div className="portal-field">
          <label>Service location</label>
          <input
            type="text"
            value={providerDraft.location}
            onChange={(e) => setProviderDraft((prev) => ({ ...prev, location: e.target.value }))}
          />
        </div>
      </div>

      <section className="portal-card" style={{ marginTop: 14 }}>
        <div className="portal-title-row">
          <h3>Select Time Slots</h3>
          <p>Visible while customers book your services</p>
        </div>
        <div className="portal-chip-row">
          {portalData.providerSlotOptions.map((slot) => (
            <button
              type="button"
              key={slot}
              className={`portal-chip ${selectedSlots.includes(slot) ? "portal-chip-active" : ""}`}
              onClick={() => toggleSlot(slot)}
            >
              {slot}
            </button>
          ))}
        </div>
      </section>

      <div className="portal-button-row">
        <button className="portal-button" onClick={saveProviderSettings}>
          Update Profile
        </button>
        <button className="portal-button secondary" onClick={onToggleOnline}>
          {providerSetting?.online ? "Pause Availability" : "Resume Availability"}
        </button>
      </div>
    </section>
  );

  return (
    <PortalLayout portalTitle="Service Provider" menuItems={providerMenu}>
      {feedback && (
        <section className="portal-card" style={{ borderColor: "rgba(6, 182, 212, 0.6)" }}>
          <p style={{ margin: 0 }}>{feedback}</p>
        </section>
      )}

      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProviderHome />} />
        <Route path="requests" element={<ProviderRequests />} />
        <Route path="services" element={<ProviderServices />} />
        <Route
          path="map"
          element={
            <MapBookingSearch
              bookings={providerBookings}
              onChatCustomer={(booking) => openBookingChat(booking)}
              onMarkCompleted={(booking) => updateRequestStatus(booking, "Completed")}
              onAcceptBooking={(booking) => updateRequestStatus(booking, "Confirmed")}
              onCancelBooking={(booking) => updateRequestStatus(booking, "Cancelled")}
            />
          }
        />
        <Route path="earnings" element={<ProviderEarnings />} />
        <Route path="messages" element={<ProviderMessages />} />
        <Route path="settings" element={<ProviderSettings />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </PortalLayout>
  );
};

export default ProviderDashboard;
