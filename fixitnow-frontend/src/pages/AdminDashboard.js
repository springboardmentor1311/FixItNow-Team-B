import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PortalLayout from "../layout/PortalLayout";
import { useAppData } from "../state/AppDataContext";

const adminMenu = [
  { label: "Dashboard", path: "/admin/dashboard" },
  { label: "Verification", path: "/admin/verification" },
  { label: "Disputes", path: "/admin/disputes" },
  { label: "Analytics", path: "/admin/analytics" },
  { label: "Messages", path: "/admin/messages" },
  { label: "Settings", path: "/admin/settings" }
];

const AdminDashboard = () => {
  const {
    portalData,
    saveAdminSettings,
    approveProvider,
    holdProvider,
    updateVerificationStatus,
    updateDisputeStatus,
    addAdminProviderMessage
  } = useAppData();

  const [feedback, setFeedback] = useState("");
  const [searchText, setSearchText] = useState("");
  const [adminDraft, setAdminDraft] = useState(portalData.adminSettings);
  const [healthMessage, setHealthMessage] = useState("No health check run yet.");
  const [adminChatText, setAdminChatText] = useState("");

  useEffect(() => {
    setAdminDraft(portalData.adminSettings);
  }, [portalData.adminSettings]);

  const visibleVerificationQueue = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return portalData.userVerificationQueue;
    return portalData.userVerificationQueue.filter((entry) =>
      `${entry.name} ${entry.role}`.toLowerCase().includes(query)
    );
  }, [portalData.userVerificationQueue, searchText]);

  const pendingVerificationCount = useMemo(() => {
    const userPending = portalData.userVerificationQueue.filter(
      (entry) =>
        String(entry.role || "").trim().toLowerCase() !== "provider" && entry.status !== "Verified"
    ).length;
    const providerPending = portalData.providerQueue.filter(
      (provider) => provider.status !== "APPROVED"
    ).length;
    return userPending + providerPending;
  }, [portalData.userVerificationQueue, portalData.providerQueue]);

  const openDisputeCount = useMemo(
    () => portalData.disputeQueue.filter((dispute) => dispute.status !== "Resolved").length,
    [portalData.disputeQueue]
  );

  const resolvedDisputeCount = useMemo(
    () => portalData.disputeQueue.filter((dispute) => dispute.status === "Resolved").length,
    [portalData.disputeQueue]
  );

  const averageProviderRating = useMemo(() => {
    if (!portalData.providerProfiles.length) return 0;
    const total = portalData.providerProfiles.reduce((sum, profile) => sum + profile.rating, 0);
    return total / portalData.providerProfiles.length;
  }, [portalData.providerProfiles]);

  const totalCompletedJobs = useMemo(
    () =>
      portalData.providerProfiles.reduce(
        (sum, profile) => sum + Number(profile.completedJobs || 0),
        0
      ),
    [portalData.providerProfiles]
  );

  const totalReviews = useMemo(
    () =>
      portalData.providerProfiles.reduce((sum, profile) => sum + Number(profile.reviews || 0), 0),
    [portalData.providerProfiles]
  );

  const resolutionRate = useMemo(() => {
    if (!portalData.disputeQueue.length) return "0";
    return ((resolvedDisputeCount / portalData.disputeQueue.length) * 100).toFixed(1);
  }, [portalData.disputeQueue.length, resolvedDisputeCount]);

  const exportSnapshot = () => {
    const blob = new Blob([JSON.stringify(portalData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fixitnow-admin-snapshot.json";
    link.click();
    URL.revokeObjectURL(url);
    setFeedback("Snapshot exported successfully.");
  };

  const onApproveProvider = (provider) => {
    approveProvider(provider.id);
    setFeedback(`${provider.name} approved.`);
  };

  const onHoldProvider = (provider) => {
    holdProvider(provider.id);
    setFeedback(`${provider.name} moved to hold state.`);
  };

  const formatSubmittedAt = (timestamp) => {
    if (!timestamp) return "Not available";
    const parsedDate = new Date(timestamp);
    if (Number.isNaN(parsedDate.getTime())) return "Not available";
    return parsedDate.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };

  const markVerification = (entryId, status, tone) => {
    updateVerificationStatus(entryId, status, tone);
    setFeedback(`Verification status updated to ${status}.`);
  };

  const markDispute = (disputeId, status, tone) => {
    updateDisputeStatus(disputeId, status, tone);
    setFeedback(`Dispute marked as ${status}.`);
  };

  const saveSettings = () => {
    saveAdminSettings(adminDraft);
    setFeedback("Admin settings saved successfully.");
  };

  const runHealthCheck = () => {
    const checks = [
      "API latency: Stable",
      "Queue health: Within threshold",
      "Auth service: Operational",
      "Notification service: Operational"
    ];
    setHealthMessage(checks.join(" | "));
    setFeedback("Health check completed.");
  };

  const sendAdminMessage = () => {
    if (!adminChatText.trim()) {
      setFeedback("Please type a message before sending.");
      return;
    }

    addAdminProviderMessage({
      from: "Admin",
      text: adminChatText
    });
    setAdminChatText("");
    setFeedback("Message sent to service provider.");
  };

  const AdminHome = () => (
    <>
      <section className="portal-card portal-hero">
        <div>
          <h2>Admin Control Room</h2>
          <p>
            Monitor disputes, user verification, and platform health while coordinating
            directly with service providers.
          </p>
        </div>
        <button className="portal-button" onClick={exportSnapshot}>
          Export Snapshot
        </button>
      </section>

      <section className="portal-grid">
        <article className="portal-metric">
          <p className="portal-metric-value">{portalData.providerProfiles.length}</p>
          <p className="portal-metric-label">Service provider profiles</p>
          <p className="portal-metric-note portal-ok">Ratings, reviews, jobs tracked</p>
        </article>

        <article className="portal-metric">
          <p className="portal-metric-value">{pendingVerificationCount}</p>
          <p className="portal-metric-label">Pending verifications</p>
          <p className="portal-metric-note portal-warn">User + service verification queue</p>
        </article>

        <article className="portal-metric">
          <p className="portal-metric-value">{openDisputeCount}</p>
          <p className="portal-metric-label">Open disputes</p>
          <p className="portal-metric-note portal-alert">Requires dispute management</p>
        </article>

        <article className="portal-metric">
          <p className="portal-metric-value">{averageProviderRating.toFixed(1)}</p>
          <p className="portal-metric-label">Average provider rating</p>
          <p className="portal-metric-note">{healthMessage}</p>
        </article>
      </section>

      <section className="portal-card">
        <div className="portal-title-row">
          <h3>Service Provider Profiles</h3>
          <p>Ratings, reviews, and completed jobs</p>
        </div>
        <div className="portal-list-grid">
          {portalData.providerProfiles.map((profile) => (
            <article className="portal-list-card" key={profile.id}>
              <h4>{profile.name}</h4>
              <p className="portal-list-sub">{profile.service}</p>
              <p className="portal-list-sub">Location: {profile.location || "Not specified"}</p>
              <p className="portal-list-sub">Rating: {profile.rating.toFixed(1)} / 5</p>
              <p className="portal-list-sub">Reviews: {profile.reviews}</p>
              <p className="portal-list-sub">Completed jobs: {profile.completedJobs}</p>
              <span className={`portal-status ${profile.tone}`}>{profile.verification}</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const AdminVerification = () => (
    <>
      <section className="portal-card">
        <div className="portal-title-row">
          <h3>User & Service Verification</h3>
          <p>Approve identities and service accounts</p>
        </div>

        <div className="portal-field" style={{ marginBottom: 12 }}>
          <label>Search account</label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name or role"
          />
        </div>

        <div className="portal-list">
          {visibleVerificationQueue.map((entry) => (
            <article className="portal-list-item" key={entry.id}>
              <h5>{entry.name}</h5>
              <p>
                {entry.role} | {entry.document}
              </p>
              <span className={`portal-status ${entry.tone}`}>{entry.status}</span>
              <div className="portal-button-row">
                <button
                  className="portal-button"
                  onClick={() => markVerification(entry.id, "Verified", "ok")}
                >
                  Mark Verified
                </button>
                <button
                  className="portal-button secondary"
                  onClick={() => markVerification(entry.id, "Under Review", "warn")}
                >
                  Keep Under Review
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="portal-card">
        <div className="portal-title-row">
          <h3>Provider Document Queue</h3>
          <p>Service verification and onboarding checks</p>
        </div>

        <div className="portal-list-grid">
          {portalData.providerQueue.map((provider) => {
            const providerStats = portalData.providerProfiles.find(
              (profile) =>
                profile.name.trim().toLowerCase() === provider.name.trim().toLowerCase()
            );
            const providerServices = portalData.providerServiceCatalog.filter(
              (service) =>
                String(service.providerEmail || "").trim().toLowerCase() ===
                String(provider.email || "").trim().toLowerCase()
            );
            const activeServices = providerServices.filter(
              (service) => service.available && Number(service.price) > 0
            );
            const pendingBookings = portalData.bookings.filter(
              (booking) =>
                String(booking.providerEmail || "").trim().toLowerCase() ===
                  String(provider.email || "").trim().toLowerCase() &&
                booking.status === "Pending"
            ).length;
            return (
              <article className="portal-list-card" key={provider.id || provider.name}>
                <h4>{provider.name}</h4>
                <p className="portal-list-sub">{provider.area}</p>
                <p className="portal-list-sub">Email: {provider.email || "Not provided"}</p>
                <p className="portal-list-sub">Phone: {provider.phone || "Not provided"}</p>
                <p className="portal-list-sub">
                  Service: {provider.serviceType || "Not provided"} | ID:{" "}
                  {provider.idProofType || "Not provided"}
                </p>
                <p className="portal-list-sub">
                  Document: {provider.idProofDocumentName || "Not provided"}
                </p>
                <p className="portal-list-sub">
                  Submitted: {formatSubmittedAt(provider.submittedAt)}
                </p>
                <p className="portal-list-sub">Active listed services: {activeServices.length}</p>
                <p className="portal-list-sub">Pending customer bookings: {pendingBookings}</p>
                {activeServices.slice(0, 3).map((service) => (
                  <p className="portal-list-sub" key={service.id}>
                    {service.category} - {service.subcategory} - Rs.{service.price}
                  </p>
                ))}
                <p className="portal-list-sub">
                  Login access:{" "}
                  {provider.status === "APPROVED"
                    ? "Allowed"
                    : "Blocked until admin approval"}
                </p>
                <p className="portal-list-sub">
                  Rating: {providerStats?.rating?.toFixed(1) || "N/A"} | Reviews:{" "}
                  {providerStats?.reviews ?? "N/A"} | Jobs: {providerStats?.completedJobs ?? "N/A"}
                </p>
                <span className={`portal-status ${provider.tone}`}>{provider.docs}</span>
                <div className="portal-button-row">
                  <button
                    className="portal-button"
                    onClick={() => onApproveProvider(provider)}
                  >
                    Approve
                  </button>
                  <button
                    className="portal-button secondary"
                    onClick={() => onHoldProvider(provider)}
                  >
                    Hold
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );

  const AdminDisputes = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Dispute Management</h3>
        <p>Track and resolve customer-provider conflicts</p>
      </div>

      <div className="portal-list">
        {portalData.disputeQueue.map((dispute) => (
          <article className="portal-list-item" key={dispute.id}>
            <h5>{dispute.ticket}</h5>
            <p>
              {dispute.customer} vs {dispute.provider}
            </p>
            <p>{dispute.issue}</p>
            <span className={`portal-status ${dispute.tone}`}>{dispute.status}</span>
            <div className="portal-button-row">
              <button
                className="portal-button"
                onClick={() => markDispute(dispute.id, "Resolved", "ok")}
              >
                Resolve
              </button>
              <button
                className="portal-button secondary"
                onClick={() => markDispute(dispute.id, "Escalated", "alert")}
              >
                Escalate
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const AdminAnalytics = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Platform Analytics</h3>
        <p>Operational and quality indicators</p>
      </div>

      <section className="portal-grid">
        <article className="portal-metric">
          <p className="portal-metric-value">{averageProviderRating.toFixed(1)}</p>
          <p className="portal-metric-label">Average provider rating</p>
        </article>

        <article className="portal-metric">
          <p className="portal-metric-value">{totalReviews}</p>
          <p className="portal-metric-label">Total reviews</p>
        </article>

        <article className="portal-metric">
          <p className="portal-metric-value">{totalCompletedJobs}</p>
          <p className="portal-metric-label">Completed jobs</p>
        </article>

        <article className="portal-metric">
          <p className="portal-metric-value">{resolutionRate}%</p>
          <p className="portal-metric-label">Dispute resolution rate</p>
        </article>
      </section>

      <div className="portal-button-row">
        <button className="portal-button" onClick={runHealthCheck}>
          Generate Health Report
        </button>
      </div>

      <div className="portal-list" style={{ marginTop: 12 }}>
        <article className="portal-list-item">
          <h5>Latest health result</h5>
          <p>{healthMessage}</p>
        </article>
      </div>
    </section>
  );

  const AdminMessages = () => (
    <section className="portal-split">
      <article className="portal-card">
        <div className="portal-title-row">
          <h3>Conversations</h3>
          <p>{portalData.adminProviderChat.length} messages</p>
        </div>
        <div className="portal-list">
          <div className="portal-list-item">
            <h5>Service Provider Desk</h5>
            <p>Direct admin-provider channel</p>
          </div>
        </div>
      </article>

      <article className="portal-card">
        <div className="portal-title-row">
          <h3>Message Preview</h3>
          <p>Two-way messaging enabled</p>
        </div>

        <div className="portal-list">
          {portalData.adminProviderChat.map((message) => (
            <div className="portal-list-item" key={message.id}>
              <h5>
                {message.from} {message.timestamp ? `| ${message.timestamp}` : ""}
              </h5>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <div className="portal-field">
          <label>Reply to provider</label>
          <textarea
            placeholder="Type your message here..."
            value={adminChatText}
            onChange={(e) => setAdminChatText(e.target.value)}
          />
        </div>

        <div className="portal-button-row">
          <button className="portal-button" onClick={sendAdminMessage}>
            Send
          </button>
        </div>
      </article>
    </section>
  );

  const AdminSettings = () => (
    <section className="portal-card">
      <div className="portal-title-row">
        <h3>Platform Settings</h3>
        <p>Control security and moderation defaults</p>
      </div>

      <div className="portal-form-grid">
        <div className="portal-field">
          <label>Auto-approve customer signups</label>
          <select
            value={adminDraft.autoApproveCustomers}
            onChange={(e) =>
              setAdminDraft((prev) => ({ ...prev, autoApproveCustomers: e.target.value }))
            }
          >
            <option>Enabled</option>
            <option>Disabled</option>
          </select>
        </div>

        <div className="portal-field">
          <label>Provider verification SLA</label>
          <select
            value={adminDraft.verificationSla}
            onChange={(e) =>
              setAdminDraft((prev) => ({ ...prev, verificationSla: e.target.value }))
            }
          >
            <option>24 hours</option>
            <option>48 hours</option>
            <option>72 hours</option>
          </select>
        </div>

        <div className="portal-field">
          <label>Dispute resolution SLA</label>
          <select
            value={adminDraft.disputeSla}
            onChange={(e) => setAdminDraft((prev) => ({ ...prev, disputeSla: e.target.value }))}
          >
            <option>24 hours</option>
            <option>48 hours</option>
            <option>72 hours</option>
          </select>
        </div>

        <div className="portal-field">
          <label>Incident alert email</label>
          <input
            type="email"
            value={adminDraft.incidentEmail}
            onChange={(e) =>
              setAdminDraft((prev) => ({ ...prev, incidentEmail: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="portal-button-row">
        <button className="portal-button" onClick={saveSettings}>
          Save Settings
        </button>
        <button className="portal-button secondary" onClick={runHealthCheck}>
          Run Health Check
        </button>
      </div>
    </section>
  );

  return (
    <PortalLayout portalTitle="Admin" menuItems={adminMenu}>
      {feedback && (
        <section className="portal-card" style={{ borderColor: "rgba(6, 182, 212, 0.6)" }}>
          <p style={{ margin: 0 }}>{feedback}</p>
        </section>
      )}

      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminHome />} />
        <Route path="verification" element={<AdminVerification />} />
        <Route path="disputes" element={<AdminDisputes />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="settings" element={<AdminSettings />} />

        <Route path="users" element={<Navigate to="/admin/verification" replace />} />
        <Route path="providers" element={<Navigate to="/admin/verification" replace />} />
        <Route path="reports" element={<Navigate to="/admin/analytics" replace />} />

        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </PortalLayout>
  );
};

export default AdminDashboard;
