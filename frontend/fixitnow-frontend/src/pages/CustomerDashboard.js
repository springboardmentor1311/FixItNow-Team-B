import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import PortalLayout from "../layout/PortalLayout";
import { useAuth } from "../auth/AuthContext";
import { normalizeEmail } from "../auth/localAuth";
import MapProviderSearch from "./MapProviderSearch";
import ServiceDetail from "./ServiceDetail";
import { useAppData } from "../state/AppDataContext";
import AiHelpWidget from "../components/AiHelpWidget";

const customerMenuBase = [
  { label: "Dashboard", path: "/customer/dashboard" },
  { label: "Find Services", path: "/customer/services" },
  { label: "Map Search", path: "/customer/map" },
  { label: "My Bookings", path: "/customer/bookings" },
  { label: "Messages", path: "/customer/messages" },
  { label: "Settings", path: "/customer/settings" }
];

const readSeenTimestamp = (storageKey) => {
  if (!storageKey) return 0;
  const raw = Number(localStorage.getItem(storageKey));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

const saveSeenTimestamp = (storageKey, timestamp) => {
  if (!storageKey) return;
  localStorage.setItem(storageKey, String(timestamp));
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

const toEpochMs = (value) => {
  const parsed = new Date(value || "").getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const getMessageEpochMs = (message = {}) => {
  const createdAtMs = toEpochMs(message.createdAt);
  if (createdAtMs > 0) return createdAtMs;

  const idMatch = String(message.id || "").match(/^msg-(\d+)-/);
  if (!idMatch) return 0;

  const idTime = Number(idMatch[1]);
  return Number.isFinite(idTime) && idTime > 0 ? idTime : 0;
};

const marketplaceAmountRanges = [
  {
    value: "All",
    label: "All amounts",
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY
  },
  { value: "0-500", label: "Rs.0 - Rs.500", min: 0, max: 500 },
  { value: "501-1000", label: "Rs.501 - Rs.1000", min: 501, max: 1000 },
  { value: "1001-2000", label: "Rs.1001 - Rs.2000", min: 1001, max: 2000 },
  { value: "2001+", label: "Rs.2001 and above", min: 2001, max: Number.POSITIVE_INFINITY }
];

const marketplaceRatingFilters = [
  { value: "All", label: "All ratings", min: 0 },
  { value: "4", label: "4.0 and above", min: 4 },
  { value: "3", label: "3.0 and above", min: 3 },
  { value: "2", label: "2.0 and above", min: 2 }
];

const CustomerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const {
    portalData,
    saveCustomerProfile,
    resetCustomerProfile,
    createBookingRequest,
    updateBookingStatus,
    addBookingMessage,
    addReview,
    bookingStatusLabel
  } = useAppData();

  const customerEmail = normalizeEmail(user?.email || portalData.customerProfile.email || "");
  const [filter, setFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [showMarketplaceFilters, setShowMarketplaceFilters] = useState(false);
  const [serviceNameFilter, setServiceNameFilter] = useState("All");
  const [providerNameFilter, setProviderNameFilter] = useState("All");
  const [amountRangeFilter, setAmountRangeFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [customerDraft, setCustomerDraft] = useState(portalData.customerProfile);
  const [feedback, setFeedback] = useState("");
  const [chatText, setChatText] = useState("");
  const [activeChatBookingId, setActiveChatBookingId] = useState("");
  const [slotChoiceByService, setSlotChoiceByService] = useState({});
  const [lastSeenBookingsAt, setLastSeenBookingsAt] = useState(0);
  const [threadSeenMap, setThreadSeenMap] = useState({});
  const attachmentRef = useRef(null);

  useEffect(() => {
    setCustomerDraft(portalData.customerProfile);
  }, [portalData.customerProfile]);

  const approvedProviders = useMemo(() => {
    const deduped = new Map();
    portalData.providerQueue.forEach((provider) => {
      if (provider.status !== "APPROVED") return;
      const providerKey = normalizeEmail(provider.email);
      if (!providerKey) return;
      deduped.set(providerKey, provider);
    });
    return Array.from(deduped.values());
  }, [portalData.providerQueue]);

  const approvedProviderEmailSet = useMemo(
    () => new Set(approvedProviders.map((provider) => normalizeEmail(provider.email))),
    [approvedProviders]
  );

  const providerProfileByEmail = useMemo(() => {
    const map = new Map();
    portalData.providerProfiles.forEach((profile) => {
      const key = normalizeEmail(profile.providerEmail);
      if (!key) return;
      map.set(key, profile);
    });
    return map;
  }, [portalData.providerProfiles]);

  const marketplaceServices = useMemo(() => {
    return portalData.providerServiceCatalog
      .filter((service) => {
        const providerEmail = normalizeEmail(service.providerEmail);
        if (!approvedProviderEmailSet.has(providerEmail)) return false;
        if (!service.available) return false;
        return Number(service.price) > 0;
      })
      .map((service) => {
        const providerEmail = normalizeEmail(service.providerEmail);
        const provider =
          approvedProviders.find((entry) => normalizeEmail(entry.email) === providerEmail) || null;
        const profile = providerProfileByEmail.get(providerEmail);
        const slots =
          portalData.providerSettings?.[providerEmail]?.selectedSlots ||
          provider?.selectedSlots ||
          [];

        return {
          ...service,
          providerName: provider?.name || service.providerName,
          providerLocation: provider?.area || provider?.address || service.providerLocation,
          providerEmail,
          providerRating: Number(profile?.rating || 0),
          providerReviews: Number(profile?.reviews || 0),
          providerCompletedJobs: Number(profile?.completedJobs || 0),
          slots
        };
      })
      .sort((a, b) => {
        const byCategory = a.category.localeCompare(b.category);
        if (byCategory !== 0) return byCategory;
        return a.subcategory.localeCompare(b.subcategory);
      });
  }, [
    portalData.providerServiceCatalog,
    portalData.providerSettings,
    approvedProviderEmailSet,
    approvedProviders,
    providerProfileByEmail
  ]);

  const categories = useMemo(() => {
    const categorySet = new Set(["All"]);
    marketplaceServices.forEach((service) => categorySet.add(service.category));
    return Array.from(categorySet);
  }, [marketplaceServices]);

  const serviceNameOptions = useMemo(() => {
    const serviceNames = new Set(["All"]);
    marketplaceServices.forEach((service) => serviceNames.add(service.subcategory));
    return Array.from(serviceNames);
  }, [marketplaceServices]);

  const providerNameOptions = useMemo(() => {
    const providerNames = new Set(["All"]);
    marketplaceServices.forEach((service) => providerNames.add(service.providerName));
    return Array.from(providerNames);
  }, [marketplaceServices]);

  const filteredServices = useMemo(() => {
    const selectedAmountRange =
      marketplaceAmountRanges.find((range) => range.value === amountRangeFilter) ||
      marketplaceAmountRanges[0];
    const selectedRatingFilter =
      marketplaceRatingFilters.find((item) => item.value === ratingFilter) ||
      marketplaceRatingFilters[0];

    const matches = marketplaceServices.filter((service) => {
      const categoryMatches = filter === "All" || service.category === filter;
      const serviceNameMatches =
        serviceNameFilter === "All" || service.subcategory === serviceNameFilter;
      const providerNameMatches =
        providerNameFilter === "All" || service.providerName === providerNameFilter;
      const locationMatches = !locationFilter.trim()
        ? true
        : String(service.providerLocation || "")
          .toLowerCase()
          .includes(locationFilter.trim().toLowerCase());

      const numericPrice = Number(service.price || 0);
      const amountMatches =
        selectedAmountRange.value === "All"
          ? true
          : numericPrice >= selectedAmountRange.min && numericPrice <= selectedAmountRange.max;
      const ratingMatches = Number(service.providerRating || 0) >= Number(selectedRatingFilter.min || 0);

      return (
        categoryMatches &&
        serviceNameMatches &&
        providerNameMatches &&
        locationMatches &&
        amountMatches &&
        ratingMatches
      );
    });

    if (sortBy === "price-low-high") {
      return [...matches].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sortBy === "price-high-low") {
      return [...matches].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    if (sortBy === "rating-high-low") {
      return [...matches].sort(
        (a, b) => Number(b.providerRating || 0) - Number(a.providerRating || 0)
      );
    }

    return matches;
  }, [
    marketplaceServices,
    filter,
    locationFilter,
    serviceNameFilter,
    providerNameFilter,
    amountRangeFilter,
    ratingFilter,
    sortBy
  ]);

  const customerBookings = useMemo(
    () =>
      portalData.bookings
        .filter((booking) => normalizeEmail(booking.customerEmail) === customerEmail)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [portalData.bookings, customerEmail]
  );

  const reviewedBookingIdSet = useMemo(
    () =>
      new Set(
        (portalData.reviews || [])
          .filter((review) => normalizeEmail(review.customerEmail) === customerEmail)
          .map((review) => String(review.bookingId || "").trim())
          .filter(Boolean)
      ),
    [portalData.reviews, customerEmail]
  );

  const reviewedLegacyBookingKeySet = useMemo(
    () =>
      new Set(
        (portalData.reviews || [])
          .filter((review) => normalizeEmail(review.customerEmail) === customerEmail)
          .filter((review) => !String(review.bookingId || "").trim())
          .map(
            (review) =>
              `${normalizeEmail(review.providerEmail)}|${String(review.subcategory || "").trim().toLowerCase()}`
          )
      ),
    [portalData.reviews, customerEmail]
  );

  const acceptedBookings = useMemo(
    () => customerBookings.filter((booking) => booking.status === "Confirmed"),
    [customerBookings]
  );

  const bookingSeenStorageKey = customerEmail
    ? `fixitnow_seen_customer_bookings_${customerEmail}`
    : "";
  const threadSeenStorageKey = customerEmail
    ? `fixitnow_seen_customer_thread_messages_${customerEmail}`
    : "";

  useEffect(() => {
    if (!customerEmail) {
      setLastSeenBookingsAt(0);
      setThreadSeenMap({});
      return;
    }

    setLastSeenBookingsAt(readSeenTimestamp(bookingSeenStorageKey));
    setThreadSeenMap(readThreadSeenMap(threadSeenStorageKey));
  }, [customerEmail, bookingSeenStorageKey, threadSeenStorageKey]);

  const isIncomingProviderMessage = (booking, message) => {
    const role = String(message?.senderRole || "").toUpperCase();
    if (role === "PROVIDER") return true;
    if (role === "CUSTOMER" || role === "SYSTEM" || role === "ADMIN") return false;

    const senderEmail = normalizeEmail(message?.senderEmail || "");
    const bookingProviderEmail = normalizeEmail(booking?.providerEmail || "");
    if (!senderEmail || !bookingProviderEmail) {
      return String(message?.from || "").trim().toLowerCase() !== "system";
    }
    return Boolean(senderEmail && bookingProviderEmail && senderEmail === bookingProviderEmail);
  };

  useEffect(() => {
    if (!customerEmail) return;

    const now = Date.now();
    if (location.pathname.startsWith("/customer/bookings")) {
      setLastSeenBookingsAt(now);
      saveSeenTimestamp(bookingSeenStorageKey, now);
    }
  }, [location.pathname, customerEmail, bookingSeenStorageKey]);

  useEffect(() => {
    if (!location.pathname.startsWith("/customer/messages")) return;

    const nextSeen = { ...threadSeenMap };
    let changed = false;

    acceptedBookings.forEach((booking) => {
      const latestIncomingAt = (portalData.bookingMessages[booking.id] || []).reduce(
        (latest, message) => {
          if (!isIncomingProviderMessage(booking, message)) return latest;
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

  const customerBookingUpdateCount = useMemo(
    () =>
      customerBookings.filter(
        (booking) =>
          booking.status !== "Pending" &&
          toEpochMs(booking.updatedAt || booking.createdAt) > lastSeenBookingsAt
      ).length,
    [customerBookings, lastSeenBookingsAt]
  );

  const customerUnreadMessageByBookingId = useMemo(
    () =>
      acceptedBookings.reduce((map, booking) => {
        const seenAt = threadSeenMap[booking.id] || 0;
        const unreadInThread = (portalData.bookingMessages[booking.id] || []).filter(
          (message) => isIncomingProviderMessage(booking, message) && getMessageEpochMs(message) > seenAt
        ).length;

        map[booking.id] = unreadInThread;
        return map;
      }, {}),
    [acceptedBookings, portalData.bookingMessages, threadSeenMap]
  );

  const customerUnreadMessageCount = useMemo(
    () =>
      Object.values(customerUnreadMessageByBookingId).reduce((sum, count) => sum + Number(count || 0), 0),
    [customerUnreadMessageByBookingId]
  );

  const customerBookingBadgeCount = customerBookingUpdateCount;
  const customerMessageBadgeCount = customerUnreadMessageCount;

  const customerMenu = useMemo(
    () =>
      customerMenuBase.map((item) => {
        if (item.path === "/customer/bookings") {
          return { ...item, badgeCount: customerBookingBadgeCount };
        }
        if (item.path === "/customer/messages") {
          return { ...item, badgeCount: customerMessageBadgeCount };
        }
        return item;
      }),
    [customerBookingBadgeCount, customerMessageBadgeCount]
  );

  useEffect(() => {
    if (!acceptedBookings.length) {
      setActiveChatBookingId("");
      return;
    }

    const exists = acceptedBookings.some((booking) => booking.id === activeChatBookingId);
    if (!exists) {
      setActiveChatBookingId(acceptedBookings[0].id);
    }
  }, [acceptedBookings, activeChatBookingId]);

  const activeChatBooking = useMemo(
    () => acceptedBookings.find((booking) => booking.id === activeChatBookingId) || null,
    [acceptedBookings, activeChatBookingId]
  );

  const activeChatMessages = activeChatBooking
    ? portalData.bookingMessages[activeChatBooking.id] || []
    : [];

  const createBooking = (service, meta = {}) => {
    if (!customerEmail) {
      setFeedback("Please login again to continue booking.");
      return;
    }

    const selectedSlot = slotChoiceByService[service.id] || service.slots[0] || "";
    const bookingDate =
      String(meta.bookingDate || "").trim() || new Date().toISOString().slice(0, 10);
    createBookingRequest({
      customerName: customerDraft.name || portalData.customerProfile.name || "Customer",
      customerEmail,
      customerLocation: customerDraft.location || portalData.customerProfile.location,
      providerEmail: service.providerEmail,
      serviceId: service.id,
      category: service.category,
      subcategory: service.subcategory,
      price: service.price,
      bookingDate,
      selectedSlot,
      problemDescription: meta.problemDescription
    });

    setFeedback(
      `${service.providerName} booking request created for ${service.subcategory}. Provider will accept or reject soon.`
    );
  };

  const openProviderChat = (booking) => {
    setActiveChatBookingId(booking.id);
    navigate("/customer/messages");
  };

  const openBookingReview = (booking) => {
    if (!booking || booking.status !== "Completed") return;

    const targetService =
      marketplaceServices.find((service) => booking.serviceId && service.id === booking.serviceId) ||
      marketplaceServices.find(
        (service) =>
          normalizeEmail(service.providerEmail) === normalizeEmail(booking.providerEmail) &&
          service.category === booking.category &&
          service.subcategory === booking.subcategory
      ) ||
      null;

    if (!targetService) {
      setFeedback("Service details unavailable for this booking. Please review from provider listing.");
      return;
    }

    navigate(`/customer/service/${targetService.id}`);
  };

  const isBookingReviewed = (booking) => {
    const bookingId = String(booking?.id || "").trim();
    if (bookingId && reviewedBookingIdSet.has(bookingId)) return true;

    const legacyKey = `${normalizeEmail(booking?.providerEmail || "")}|${String(
      booking?.subcategory || ""
    )
      .trim()
      .toLowerCase()}`;
    return reviewedLegacyBookingKeySet.has(legacyKey);
  };

  const saveCustomerSettings = () => {
    saveCustomerProfile(customerDraft);
    if (user?.role === "CUSTOMER") {
      updateUser({
        name: customerDraft.name,
        email: customerDraft.email
      });
    }
    setFeedback("Customer profile updated successfully.");
  };

  const resetCustomerSettings = () => {
    resetCustomerProfile();
    setFeedback("Customer profile reset.");
  };

  const sendMessage = () => {
    if (!activeChatBooking) {
      setFeedback("Chat starts only after provider accepts booking.");
      return;
    }

    const text = chatText.trim();
    if (!text) {
      setFeedback("Please type a message before sending.");
      return;
    }

    addBookingMessage({
      bookingId: activeChatBooking.id,
      from: customerDraft.name || portalData.customerProfile.name || "Customer",
      text,
      senderRole: "CUSTOMER",
      senderEmail: customerEmail
    });
    setChatText("");
    setFeedback(`Message sent to ${activeChatBooking.providerName}.`);
  };

  const attachPhoto = () => {
    attachmentRef.current?.click();
  };

  const onAttachmentChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeedback(`Attached: ${file.name}`);
  };

  const resetMarketplaceFilters = () => {
    setServiceNameFilter("All");
    setProviderNameFilter("All");
    setAmountRangeFilter("All");
    setRatingFilter("All");
    setSortBy("default");
  };

  const customerHomeView = (
    <>
      <section className="portal-card portal-hero">
        <div>
          <h2>Welcome back, {portalData.customerProfile.name || "Customer"}!</h2>
          <p>
            Browse approved providers, compare prices with location, and track your booking status.
          </p>
        </div>
        <button className="portal-button" onClick={() => navigate("/customer/services")}>
          Find Services Near Me
        </button>
      </section>

      <section className="portal-grid">
        <article className="portal-metric">
          <p className="portal-metric-value">{marketplaceServices.length}</p>
          <p className="portal-metric-label">Live service listings</p>
          <p className="portal-metric-note portal-ok">From approved providers only</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{customerBookings.length}</p>
          <p className="portal-metric-label">My bookings</p>
          <p className="portal-metric-note portal-warn">
            {customerBookings.filter((booking) => booking.status === "Pending").length} pending response
          </p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{acceptedBookings.length}</p>
          <p className="portal-metric-label">Accepted bookings</p>
          <p className="portal-metric-note portal-ok">Chat enabled for accepted jobs</p>
        </article>
        <article className="portal-metric">
          <p className="portal-metric-value">{portalData.customerProfile.location || "N/A"}</p>
          <p className="portal-metric-label">Default location</p>
          <p className="portal-metric-note">Used to speed up booking</p>
        </article>
      </section>

      <section className="portal-list-grid">
        {marketplaceServices.slice(0, 3).map((service) => (
          <article className="portal-list-card" key={service.id}>
            <h4>{service.subcategory}</h4>
            <p className="portal-list-sub">{service.providerName}</p>
            <p className="portal-list-sub">Category: {service.category}</p>
            <p className="portal-list-sub">Location: {service.providerLocation}</p>
            <p className="portal-list-sub">
              {service.providerRating.toFixed(1)} rating | {service.providerReviews} reviews |{" "}
              {service.providerCompletedJobs} jobs
            </p>
            <p className="portal-price">Rs.{service.price}</p>
            <span className="portal-status ok">Approved Provider</span>
            <div className="portal-button-row">
              <button className="portal-button" onClick={() => createBooking(service)}>
                Book Now
              </button>
              <button
                className="portal-button secondary"
                onClick={() => navigate(`/customer/service/${service.id}`)}
              >
                View Details
              </button>
            </div>
          </article>
        ))}
      </section>
    </>
  );

  const customerServicesView = (
    <section className="portal-card">
      <div className="portal-title-row">
        <div className="portal-title-copy">
          <h3>Service Marketplace</h3>
          <p>Filter by category and provider location</p>
        </div>
        <button
          type="button"
          className="portal-button secondary"
          onClick={() => setShowMarketplaceFilters((prev) => !prev)}
        >
          {showMarketplaceFilters ? "Hide Filters" : "Filters"}
        </button>
      </div>

      <div className="portal-form-grid">
        <div className="portal-field">
          <label>Category</label>
          <div className="portal-chip-row">
            {categories.map((category) => (
              <button
                type="button"
                className={`portal-chip ${filter === category ? "portal-chip-active" : ""}`}
                key={category}
                onClick={() => setFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <div className="portal-field">
          <label>Provider location filter</label>
          <input
            type="text"
            placeholder="Type area/location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>
      </div>

      {showMarketplaceFilters && (
        <section className="portal-filter-panel">
          <div className="portal-form-grid">
            <div className="portal-field">
              <label>Amount range</label>
              <select
                value={amountRangeFilter}
                onChange={(e) => setAmountRangeFilter(e.target.value)}
              >
                {marketplaceAmountRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="portal-field">
              <label>Service name</label>
              <select
                value={serviceNameFilter}
                onChange={(e) => setServiceNameFilter(e.target.value)}
              >
                {serviceNameOptions.map((serviceName) => (
                  <option key={serviceName} value={serviceName}>
                    {serviceName}
                  </option>
                ))}
              </select>
            </div>

            <div className="portal-field">
              <label>Provider</label>
              <select
                value={providerNameFilter}
                onChange={(e) => setProviderNameFilter(e.target.value)}
              >
                {providerNameOptions.map((providerName) => (
                  <option key={providerName} value={providerName}>
                    {providerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="portal-field">
              <label>Minimum rating</label>
              <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
                {marketplaceRatingFilters.map((ratingOption) => (
                  <option key={ratingOption.value} value={ratingOption.value}>
                    {ratingOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="portal-field">
              <label>Sort by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="default">Default</option>
                <option value="price-low-high">Price: Low to High</option>
                <option value="price-high-low">Price: High to Low</option>
                <option value="rating-high-low">Rating: High to Low</option>
              </select>
            </div>
          </div>

          <div className="portal-button-row">
            <button type="button" className="portal-button secondary" onClick={resetMarketplaceFilters}>
              Clear Additional Filters
            </button>
          </div>
        </section>
      )}

      <div className="portal-list-grid" style={{ marginTop: 14 }}>
        {filteredServices.length === 0 && (
          <article className="portal-list-card">
            <h4>No services found</h4>
            <p className="portal-list-sub">Try changing category, location, or filter values.</p>
          </article>
        )}

        {filteredServices.map((service) => (
          <article className="portal-list-card" key={service.id}>
            <h4>{service.subcategory}</h4>
            <p className="portal-list-sub">{service.providerName}</p>
            <p className="portal-list-sub">Category: {service.category}</p>
            <p className="portal-list-sub">Provider Location: {service.providerLocation}</p>
            <p className="portal-list-sub">
              {service.providerRating.toFixed(1)} rating | {service.providerReviews} reviews
            </p>
            <p className="portal-price">Rs.{service.price}</p>
            <span className="portal-status ok">Approved Provider</span>

            <div className="portal-field" style={{ marginTop: 10 }}>
              <label>Preferred slot</label>
              <select
                value={slotChoiceByService[service.id] || service.slots[0] || ""}
                onChange={(e) =>
                  setSlotChoiceByService((prev) => ({
                    ...prev,
                    [service.id]: e.target.value
                  }))
                }
              >
                {service.slots.length === 0 && <option value="">Provider slots not configured</option>}
                {service.slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>

            <div className="portal-button-row">
              <button className="portal-button" onClick={() => createBooking(service)}>
                Book Provider
              </button>
              <button
                className="portal-button secondary"
                onClick={() => navigate(`/customer/service/${service.id}`)}
              >
                View Details
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const customerBookingsView = (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Recent Bookings</h3>
        <p>Provider accept/reject status is shown live</p>
      </div>

      <div className="portal-list">
        {customerBookings.length === 0 && (
          <article className="portal-list-item">
            <h5>No bookings yet</h5>
            <p>Create a booking from Find Services.</p>
          </article>
        )}

        {customerBookings.map((booking) => (
          <article className="portal-list-item" key={booking.id}>
            <h5>{booking.subcategory}</h5>
            <p>
              {booking.providerName} | {booking.providerLocation}
            </p>
            <p>
              {booking.category} | Rs.{booking.price}
            </p>
            <span className={`portal-status ${booking.tone}`}>
              {bookingStatusLabel(booking.status)}
            </span>
            <p className="portal-list-sub">
              Service completion: {booking.status === "Completed" ? "Completed" : "Pending"}
            </p>

            {booking.status === "Confirmed" && (
              <p className="portal-list-sub">
                Provider confirmed this booking. Chat is active now.
              </p>
            )}

            {booking.status === "Completed" && (
              <p className="portal-list-sub">
                Provider marked this service as completed. Please add your rating and review.
              </p>
            )}

            {booking.status === "Confirmed" && (
              <div className="portal-button-row">
                <button className="portal-button" onClick={() => openProviderChat(booking)}>
                  Chat Provider
                </button>
              </div>
            )}

            {(booking.status === "Pending" || booking.status === "Confirmed") && (
              <div className="portal-button-row">
                <button
                  className="portal-button secondary"
                  onClick={() => updateBookingStatus(booking.id, "Cancelled")}
                >
                  Cancel Booking
                </button>
              </div>
            )}

            {booking.status === "Completed" && (
              <div className="portal-button-row">
                <button
                  className="portal-button"
                  onClick={() => openBookingReview(booking)}
                  disabled={isBookingReviewed(booking)}
                >
                  {isBookingReviewed(booking) ? "Reviewed" : "Rate & Review"}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );

  const customerMessagesView = (
    <section className="portal-split">
      <article className="portal-card">
        <div className="portal-title-row">
          <h3>Conversations</h3>
          <p>{customerUnreadMessageCount} unread</p>
        </div>

        <div className="portal-chip-row">
          {acceptedBookings.map((booking) => {
            const unreadCount = customerUnreadMessageByBookingId[booking.id] || 0;
            return (
              <button
                key={booking.id}
                type="button"
                className={`portal-chip ${activeChatBookingId === booking.id ? "portal-chip-active" : ""}`}
                onClick={() => setActiveChatBookingId(booking.id)}
              >
                <span>{booking.providerName}</span>
                {unreadCount > 0 && (
                  <span className="portal-chip-notify">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {!acceptedBookings.length && (
          <div className="portal-list" style={{ marginTop: 12 }}>
            <div className="portal-list-item">
              <h5>No active chat yet</h5>
              <p>Chat will open when a provider accepts your booking.</p>
            </div>
          </div>
        )}
      </article>

      <article className="portal-card">
        <div className="portal-title-row">
          <h3>Message Preview</h3>
          <p>Two-way communication after provider acceptance</p>
        </div>

        <div className="portal-list">
          {activeChatMessages.map((message) => (
            <div className="portal-list-item" key={message.id}>
              <h5>{message.from}</h5>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <div className="portal-field">
          <label>Reply</label>
          <textarea
            placeholder={
              activeChatBooking
                ? "Type your message here..."
                : "Wait for provider acceptance to start chat"
            }
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            disabled={!activeChatBooking}
          />
        </div>

        <input
          ref={attachmentRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          style={{ display: "none" }}
          onChange={onAttachmentChosen}
        />

        <div className="portal-button-row">
          <button className="portal-button" onClick={sendMessage} disabled={!activeChatBooking}>
            Send
          </button>
          <button className="portal-button secondary" onClick={attachPhoto} disabled={!activeChatBooking}>
            Attach Photo
          </button>
        </div>
      </article>
    </section>
  );

  const customerSettingsView = (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Profile & Preferences</h3>
        <p>Keep your contact and location details updated</p>
      </div>

      <div className="portal-form-grid">
        <div className="portal-field">
          <label>Full name</label>
          <input
            type="text"
            value={customerDraft.name}
            onChange={(e) => setCustomerDraft((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div className="portal-field">
          <label>Email</label>
          <input
            type="email"
            value={customerDraft.email}
            onChange={(e) => setCustomerDraft((prev) => ({ ...prev, email: e.target.value }))}
          />
        </div>
        <div className="portal-field">
          <label>Phone</label>
          <input
            type="tel"
            value={customerDraft.phone}
            onChange={(e) =>
              setCustomerDraft((prev) => ({
                ...prev,
                phone: e.target.value.replace(/\D/g, "").slice(0, 10)
              }))
            }
          />
        </div>
        <div className="portal-field">
          <label>Default location</label>
          <input
            type="text"
            value={customerDraft.location}
            onChange={(e) => setCustomerDraft((prev) => ({ ...prev, location: e.target.value }))}
          />
        </div>
      </div>

      <div className="portal-button-row">
        <button className="portal-button" onClick={saveCustomerSettings}>
          Save Changes
        </button>
        <button className="portal-button secondary" onClick={resetCustomerSettings}>
          Reset
        </button>
      </div>
    </section>
  );

  return (
    <PortalLayout portalTitle="Customer" menuItems={customerMenu}>
      {feedback && (
        <section className="portal-card" style={{ borderColor: "rgba(6, 182, 212, 0.6)" }}>
          <p style={{ margin: 0 }}>{feedback}</p>
        </section>
      )}

      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={customerHomeView} />
        <Route path="services" element={customerServicesView} />
        <Route
          path="map"
          element={
            <MapProviderSearch
              services={marketplaceServices}
              onViewDetails={(service) => navigate(`/customer/service/${service.id}`)}
            />
          }
        />
        <Route
          path="service/:serviceId"
          element={
            <ServiceDetail
              services={marketplaceServices}
              reviews={portalData.reviews || []}
              customerBookings={customerBookings}
              onAddReview={addReview}
              onCreateBooking={createBooking}
              slotChoiceByService={slotChoiceByService}
              onSlotChange={(serviceId, value) =>
                setSlotChoiceByService((prev) => ({ ...prev, [serviceId]: value }))
              }
            />
          }
        />
        <Route path="bookings" element={customerBookingsView} />
        <Route path="messages" element={customerMessagesView} />
        <Route path="settings" element={customerSettingsView} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>

      <AiHelpWidget
        role="CUSTOMER"
        userName={portalData.customerProfile.name || user?.name || "Customer"}
        userEmail={customerEmail}
        screen={location.pathname}
      />
    </PortalLayout>
  );
};

export default CustomerDashboard;
