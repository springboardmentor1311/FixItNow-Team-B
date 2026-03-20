import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getLocalAccounts, normalizeEmail, resolveRole } from "../auth/localAuth";

const STORAGE_KEY = "fixitnow_portal_data";

const SLOT_OPTIONS = [
  "08:00 AM - 09:00 AM",
  "09:30 AM - 10:30 AM",
  "11:00 AM - 12:00 PM",
  "01:30 PM - 02:30 PM",
  "04:00 PM - 05:00 PM",
  "06:30 PM - 07:30 PM"
];

const SERVICE_CATEGORIES = {
  "Home Service": [
    "House Cleaning",
    "Bathroom Cleaning",
    "Painting",
    "Deep Cleaning",
    "Sofa Cleaning"
  ],
  Electrical: ["Wiring Repair", "Switch/Socket Fix", "Fan Installation", "DB Panel Check"],
  Plumbing: ["Tap Repair", "Pipe Leakage", "Drain Blockage", "Bathroom Fitting"],
  Carpentry: ["Furniture Repair", "Door Lock Fix", "Shelf Installation", "Custom Woodwork"],
  "AC Repair": ["Gas Refill", "Cooling Issue", "AC Installation", "Periodic Servicing"],
  Appliance: ["Washing Machine", "Refrigerator", "Microwave", "Water Purifier"],
  Mechanic: ["Bike Service", "Car Service", "Puncture Repair", "Battery Replacement"]
};

const DEFAULT_PROVIDER_AVAILABILITY = "Mon - Sat, 9 AM - 8 PM";

const providerStatusToVerificationLabel = (status) => {
  if (status === "APPROVED") return "Verified";
  if (status === "ON_HOLD") return "Under Review";
  return "Pending";
};

const toProviderProfileVerification = (providerStatus) => {
  if (providerStatus === "APPROVED") {
    return { verification: "Verified", tone: "ok" };
  }
  if (providerStatus === "ON_HOLD") {
    return { verification: "Under Review", tone: "warn" };
  }
  return { verification: "Pending", tone: "warn" };
};

const normalizeServiceCategory = (value = "") => {
  const incoming = String(value || "").trim();
  if (!incoming) return "Home Service";

  const matchedCategory = Object.keys(SERVICE_CATEGORIES).find(
    (category) => category.toLowerCase() === incoming.toLowerCase()
  );
  return matchedCategory || "Home Service";
};

const normalizeServiceSubcategory = (category, value = "") => {
  const normalizedCategory = normalizeServiceCategory(category);
  const availableSubcategories = SERVICE_CATEGORIES[normalizedCategory] || [];
  const incoming = String(value || "").trim();

  if (!availableSubcategories.length) {
    return incoming || "General Service";
  }

  const matchedSubcategory = availableSubcategories.find(
    (subcategory) => subcategory.toLowerCase() === incoming.toLowerCase()
  );
  return matchedSubcategory || availableSubcategories[0];
};

const sanitizeSlots = (slots) =>
  Array.from(
    new Set(
      (Array.isArray(slots) ? slots : [])
        .map((slot) => String(slot || "").trim())
        .filter(Boolean)
    )
  );

const normalizeProviderStatus = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "PENDING";
  if (normalized.includes("APPROVED") || normalized.includes("VERIFIED")) return "APPROVED";
  if (normalized.includes("HOLD")) return "ON_HOLD";
  return "PENDING";
};

const statusLabelToProviderStatus = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "PENDING";
  if (normalized === "VERIFIED" || normalized.includes("APPROVED")) return "APPROVED";
  if (normalized.includes("UNDER REVIEW") || normalized.includes("HOLD")) return "ON_HOLD";
  if (normalized.includes("PENDING")) return "PENDING";
  return normalizeProviderStatus(normalized);
};

const toProviderDocsLabel = (status) => {
  if (status === "APPROVED") return "Approved";
  if (status === "ON_HOLD") return "On hold";
  return "Pending review";
};

const toProviderTone = (status) => {
  if (status === "APPROVED") return "ok";
  if (status === "ON_HOLD") return "warn";
  return "warn";
};

const normalizeBookingStatus = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "Pending";
  if (normalized.includes("CANCEL")) return "Cancelled";
  if (normalized.includes("REJECT") || normalized.includes("DECLIN")) return "Cancelled";
  if (normalized.includes("COMPLETE")) return "Completed";
  if (normalized.includes("ACCEPT") || normalized.includes("APPROV") || normalized.includes("CONFIRM")) {
    return "Confirmed";
  }
  if (normalized.includes("PEND")) return "Pending";
  return "Pending";
};

const bookingToneByStatus = (status) => {
  if (status === "Confirmed" || status === "Completed") return "ok";
  if (status === "Pending") return "warn";
  return "alert";
};

const bookingStatusLabel = (status) => {
  if (status === "Confirmed") return "Confirmed";
  if (status === "Completed") return "Completed";
  if (status === "Cancelled") return "Cancelled";
  return "Pending";
};

const createId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createMessageId = () => createId("msg");

const extractTimestampFromMessageId = (messageId = "") => {
  const match = String(messageId || "").match(/^msg-(\d+)-/);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const normalizeMessageCreatedAt = (createdAt, messageId) => {
  const parsedCreatedAt = new Date(createdAt || "").getTime();
  if (Number.isFinite(parsedCreatedAt) && parsedCreatedAt > 0) {
    return new Date(parsedCreatedAt).toISOString();
  }

  const fromId = extractTimestampFromMessageId(messageId);
  if (fromId > 0) {
    return new Date(fromId).toISOString();
  }

  return "";
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const dedupeBy = (list, getKey) => {
  const map = new Map();
  ensureArray(list).forEach((item) => {
    const key = getKey(item);
    if (!key) return;
    map.set(key, item);
  });
  return Array.from(map.values());
};

const providerIdentityKey = (provider = {}) =>
  normalizeEmail(provider.email || "") || String(provider.name || "").trim().toLowerCase();

const getRegisteredProviderEmailSet = () => {
  const providerAccounts = getLocalAccounts().filter(
    (account) => resolveRole(account?.role) === "PROVIDER"
  );
  return new Set(
    providerAccounts
      .map((account) => normalizeEmail(account?.email || ""))
      .filter(Boolean)
  );
};

const buildProviderQueueEntry = (provider = {}) => {
  const status = normalizeProviderStatus(provider.status || provider.docs);
  const name = String(provider.name || provider.displayName || "").trim() || "Unnamed Provider";
  const email = normalizeEmail(provider.email || provider.providerEmail || "");
  const area = String(provider.area || provider.address || provider.location || "").trim();

  return {
    id: provider.id || createId("pq"),
    name,
    email,
    phone: String(provider.phone || "").trim(),
    area: area || "Not specified",
    address: area,
    serviceType: normalizeServiceCategory(provider.serviceType || provider.category),
    idProofType: provider.idProofType || "Not provided",
    idProofDocumentName: provider.idProofDocumentName || "Not provided",
    selectedSlots: sanitizeSlots(provider.selectedSlots || provider.availabilitySlots),
    submittedAt: provider.submittedAt || provider.createdAt || new Date().toISOString(),
    status,
    docs: toProviderDocsLabel(status),
    tone: toProviderTone(status)
  };
};

const createProviderVerificationEntry = (providerEntry) => ({
  id: `ver-provider-${providerEntry.email || providerEntry.id}`,
  name: providerEntry.name,
  role: "Provider",
  document: `${providerEntry.idProofType} | ${providerEntry.idProofDocumentName}`,
  status: providerStatusToVerificationLabel(providerEntry.status),
  tone: toProviderTone(providerEntry.status)
});

const mergeVerificationQueue = (existingQueue, providerQueue) => {
  const nonProviderEntries = ensureArray(existingQueue)
    .filter((entry) => String(entry?.role || "").trim().toLowerCase() !== "provider")
    .map((entry) => ({
      id: entry.id || createId("ver"),
      name: entry.name || "User",
      role: entry.role || "Customer",
      document: entry.document || "Not provided",
      status: entry.status || "Pending",
      tone: entry.tone || "warn"
    }));

  const providerEntries = ensureArray(providerQueue).map((provider) =>
    createProviderVerificationEntry(provider)
  );

  return dedupeBy([...providerEntries, ...nonProviderEntries], (entry) =>
    String(entry.id || `${entry.name}-${entry.role}`).trim().toLowerCase()
  );
};

const buildDefaultProviderSetting = (values = {}) => ({
  displayName: String(values.displayName || "").trim() || "Service Provider",
  category: normalizeServiceCategory(values.category),
  radius: String(values.radius || "10 km").trim() || "10 km",
  availability:
    String(values.availability || DEFAULT_PROVIDER_AVAILABILITY).trim() ||
    DEFAULT_PROVIDER_AVAILABILITY,
  selectedSlots: sanitizeSlots(values.selectedSlots),
  online: Boolean(values.online),
  location: String(values.location || "").trim()
});

const buildProviderServiceEntry = (service = {}, providerEntry = null) => {
  const providerEmail = normalizeEmail(service.providerEmail || providerEntry?.email || "");
  const category = normalizeServiceCategory(service.category || providerEntry?.serviceType);
  const subcategory = normalizeServiceSubcategory(category, service.subcategory || service.name);
  const numericPrice = Number(service.price);
  const price = Number.isFinite(numericPrice) && numericPrice > 0 ? Math.round(numericPrice) : 0;

  return {
    id: service.id || createId("svc"),
    providerEmail,
    providerName: String(service.providerName || providerEntry?.name || "").trim(),
    providerLocation: String(
      service.providerLocation || providerEntry?.area || providerEntry?.address || ""
    ).trim(),
    category,
    subcategory,
    price,
    available: service.available !== false,
    createdAt: service.createdAt || new Date().toISOString(),
    updatedAt: service.updatedAt || service.createdAt || new Date().toISOString()
  };
};

const buildBookingEntry = (booking = {}) => {
  const status = normalizeBookingStatus(booking.status);
  const category = normalizeServiceCategory(booking.category);
  const subcategory = normalizeServiceSubcategory(category, booking.subcategory || booking.title);
  const numericPrice = Number(booking.price);
  const price = Number.isFinite(numericPrice) && numericPrice > 0 ? Math.round(numericPrice) : 0;

  return {
    id: booking.id || createId("bk"),
    customerName: String(booking.customerName || "Customer").trim(),
    customerEmail: normalizeEmail(booking.customerEmail || ""),
    customerLocation: String(booking.customerLocation || "").trim(),
    providerName: String(booking.providerName || booking.partner || "").trim(),
    providerEmail: normalizeEmail(booking.providerEmail || ""),
    providerLocation: String(booking.providerLocation || "").trim(),
    serviceId: String(booking.serviceId || "").trim(),
    category,
    subcategory,
    price,
    bookingDate: String(booking.bookingDate || booking.scheduledDate || "").trim(),
    selectedSlot: String(booking.selectedSlot || "").trim(),
    problemDescription: String(booking.problemDescription || booking.problem_description || "").trim(),
    status,
    tone: bookingToneByStatus(status),
    createdAt: booking.createdAt || new Date().toISOString(),
    updatedAt: booking.updatedAt || booking.createdAt || new Date().toISOString()
  };
};

const buildLegacyCustomerBookings = (bookings) =>
  ensureArray(bookings).map((booking) => ({
    title: booking.subcategory || booking.category,
    partner: booking.providerName,
    status: bookingStatusLabel(booking.status),
    tone: bookingToneByStatus(booking.status)
  }));

const findProviderIndexByIdOrName = (providerQueue, providerId) => {
  const id = String(providerId || "").trim();
  const normalizedId = id.toLowerCase();
  if (!id) return -1;

  return ensureArray(providerQueue).findIndex((provider) => {
    const providerName = String(provider.name || "").trim().toLowerCase();
    const providerEmail = normalizeEmail(provider.email || "");
    return provider.id === id || providerName === normalizedId || providerEmail === normalizedId;
  });
};

const defaultData = {
  customerProfile: {
    name: "",
    email: "",
    phone: "",
    location: ""
  },
  providerProfile: {
    displayName: "",
    category: "Home Service",
    radius: "10 km",
    availability: DEFAULT_PROVIDER_AVAILABILITY
  },
  providerOnline: false,
  providerSlotOptions: SLOT_OPTIONS,
  providerSelectedSlots: [],
  providerSettings: {},
  providerQueue: [],
  providerProfiles: [],
  providerServiceCatalog: [],
  bookings: [],
  bookingMessages: {},
  customerBookings: [],
  userVerificationQueue: [],
  disputeQueue: [],
  adminProviderChat: [],
  customerProviderChat: [],
  reviews: [],
  adminSettings: {
    autoApproveCustomers: "Enabled",
    verificationSla: "24 hours",
    disputeSla: "48 hours",
    incidentEmail: "admin@fixitnow.com"
  },
  serviceCategories: SERVICE_CATEGORIES
};

const withDerivedData = (incomingData) => {
  const baseData = {
    ...defaultData,
    ...incomingData
  };

  const providerQueue = dedupeBy(
    ensureArray(baseData.providerQueue).map((provider) => buildProviderQueueEntry(provider)),
    providerIdentityKey
  );

  const providerSettingsInput =
    baseData.providerSettings && typeof baseData.providerSettings === "object"
      ? baseData.providerSettings
      : {};

  const providerSettings = {};
  providerQueue.forEach((provider) => {
    providerSettings[provider.email] = buildDefaultProviderSetting({
      ...(providerSettingsInput[provider.email] || {}),
      displayName: providerSettingsInput[provider.email]?.displayName || provider.name,
      category: providerSettingsInput[provider.email]?.category || provider.serviceType,
      location:
        providerSettingsInput[provider.email]?.location || provider.area || provider.address,
      selectedSlots:
        providerSettingsInput[provider.email]?.selectedSlots || provider.selectedSlots || []
    });
  });

  const normalizedProviderQueue = providerQueue.map((provider) => {
    const setting = providerSettings[provider.email];
    return buildProviderQueueEntry({
      ...provider,
      name: setting?.displayName || provider.name,
      serviceType: setting?.category || provider.serviceType,
      area: setting?.location || provider.area,
      address: setting?.location || provider.address,
      selectedSlots: setting?.selectedSlots || provider.selectedSlots
    });
  });

  const providerByEmail = new Map(
    normalizedProviderQueue.map((provider) => [provider.email, provider])
  );

  const providerServiceCatalogInput = ensureArray(baseData.providerServiceCatalog)
    .map((service) => {
      const providerEmail = normalizeEmail(service.providerEmail || "");
      const provider = providerByEmail.get(providerEmail);
      if (!provider) return null;
      return buildProviderServiceEntry(
        {
          ...service,
          providerEmail,
          providerName: provider.name,
          providerLocation: provider.area || provider.address
        },
        provider
      );
    })
    .filter(Boolean);

  const providerServiceCatalog = dedupeBy(
    providerServiceCatalogInput,
    (service) => `${service.providerEmail}|${service.category}|${service.subcategory}`
  );

  normalizedProviderQueue.forEach((provider) => {
    const alreadyHasService = providerServiceCatalog.some(
      (service) => service.providerEmail === provider.email
    );
    if (alreadyHasService) return;

    const category = normalizeServiceCategory(provider.serviceType);
    providerServiceCatalog.push(
      buildProviderServiceEntry(
        {
          providerEmail: provider.email,
          providerName: provider.name,
          providerLocation: provider.area || provider.address,
          category,
          subcategory: SERVICE_CATEGORIES[category][0],
          price: 499,
          available: true
        },
        provider
      )
    );
  });

  const providerNameToEmail = new Map(
    normalizedProviderQueue.map((provider) => [provider.name.trim().toLowerCase(), provider.email])
  );

  const providerProfilesMap = new Map();
  ensureArray(baseData.providerProfiles).forEach((profile) => {
    const profileEmail = normalizeEmail(
      profile.providerEmail ||
      profile.email ||
      providerNameToEmail.get(String(profile.name || "").trim().toLowerCase()) ||
      ""
    );
    const provider = providerByEmail.get(profileEmail);
    if (!provider) return;

    const profileStatus = toProviderProfileVerification(provider.status);
    providerProfilesMap.set(profileEmail, {
      id: profile.id || `prv-${profileEmail || provider.id}`,
      providerEmail: profileEmail,
      name: String(profile.name || provider.name).trim() || provider.name,
      service: normalizeServiceCategory(profile.service || provider.serviceType),
      rating: Number(profile.rating || 0),
      reviews: Number(profile.reviews || 0),
      completedJobs: Number(profile.completedJobs || 0),
      verification: profileStatus.verification,
      tone: profileStatus.tone,
      location: provider.area || provider.address
    });
  });

  normalizedProviderQueue.forEach((provider) => {
    if (providerProfilesMap.has(provider.email)) return;

    const profileStatus = toProviderProfileVerification(provider.status);
    providerProfilesMap.set(provider.email, {
      id: `prv-${provider.email || provider.id}`,
      providerEmail: provider.email,
      name: provider.name,
      service: normalizeServiceCategory(provider.serviceType),
      rating: 0,
      reviews: 0,
      completedJobs: 0,
      verification: profileStatus.verification,
      tone: profileStatus.tone,
      location: provider.area || provider.address
    });
  });

  const providerProfiles = Array.from(providerProfilesMap.values());
  const userVerificationQueue = mergeVerificationQueue(
    baseData.userVerificationQueue,
    normalizedProviderQueue
  );

  const bookings = dedupeBy(
    ensureArray(baseData.bookings)
      .map((booking) => {
        const providerEmail =
          normalizeEmail(booking.providerEmail || "") ||
          normalizeEmail(
            providerNameToEmail.get(String(booking.providerName || "").trim().toLowerCase()) || ""
          );
        const provider = providerByEmail.get(providerEmail);
        if (!provider) return null;

        return buildBookingEntry({
          ...booking,
          providerEmail,
          providerName: provider.name,
          providerLocation: provider.area || provider.address
        });
      })
      .filter(Boolean),
    (booking) => booking.id
  );

  const bookingIds = new Set(bookings.map((booking) => booking.id));
  const bookingMessagesInput =
    baseData.bookingMessages && typeof baseData.bookingMessages === "object"
      ? baseData.bookingMessages
      : {};
  const bookingMessages = {};

  Object.entries(bookingMessagesInput).forEach(([bookingId, thread]) => {
    if (!bookingIds.has(bookingId)) return;

    const normalizedThread = ensureArray(thread)
      .map((message) => {
        const text = String(message?.text || "").trim();
        if (!text) return null;

        const messageId = message.id || createMessageId();

        return {
          id: messageId,
          from: String(message.from || "System"),
          text,
          timestamp: String(message.timestamp || ""),
          senderRole: String(message.senderRole || ""),
          senderEmail: normalizeEmail(message.senderEmail || ""),
          createdAt: normalizeMessageCreatedAt(message.createdAt, messageId)
        };
      })
      .filter(Boolean);

    bookingMessages[bookingId] = normalizedThread;
  });

  const providerSlotOptions = sanitizeSlots(baseData.providerSlotOptions);
  const normalizedSlotOptions = providerSlotOptions.length ? providerSlotOptions : SLOT_OPTIONS;

  const primaryProvider = normalizedProviderQueue[0] || null;
  const primaryProviderSetting = primaryProvider
    ? providerSettings[primaryProvider.email]
    : buildDefaultProviderSetting({
      displayName: baseData.providerProfile?.displayName,
      category: baseData.providerProfile?.category,
      radius: baseData.providerProfile?.radius,
      availability: baseData.providerProfile?.availability,
      selectedSlots: baseData.providerSelectedSlots,
      online: baseData.providerOnline
    });

  const customerProfile = {
    ...defaultData.customerProfile,
    ...(baseData.customerProfile || {})
  };

  const adminSettings = {
    ...defaultData.adminSettings,
    ...(baseData.adminSettings || {})
  };

  const disputeQueue = ensureArray(baseData.disputeQueue).map((dispute) => ({
    id: dispute.id || createId("dsp"),
    ticket: dispute.ticket || "DSP-0000",
    customer: dispute.customer || "Customer",
    provider: dispute.provider || "Provider",
    issue: dispute.issue || "Not specified",
    status: dispute.status || "Open",
    tone: dispute.tone || "warn"
  }));

  const adminProviderChat = ensureArray(baseData.adminProviderChat)
    .map((message) => {
      const messageId = message.id || createMessageId();
      return {
        id: messageId,
        from: message.from || "System",
        text: String(message.text || "").trim(),
        timestamp: message.timestamp || "",
        createdAt: normalizeMessageCreatedAt(message.createdAt, messageId)
      };
    })
    .filter((message) => Boolean(message.text));

  const customerProviderChat = ensureArray(baseData.customerProviderChat)
    .map((message) => {
      const messageId = message.id || createMessageId();
      return {
        id: messageId,
        from: message.from || "System",
        text: String(message.text || "").trim(),
        timestamp: message.timestamp || "",
        createdAt: normalizeMessageCreatedAt(message.createdAt, messageId)
      };
    })
    .filter((message) => Boolean(message.text));

  const reviews = ensureArray(baseData.reviews).map((review) => ({
    id: review.id || createId("rev"),
    providerEmail: normalizeEmail(review.providerEmail || ""),
    customerEmail: normalizeEmail(review.customerEmail || ""),
    bookingId: String(review.bookingId || "").trim(),
    serviceId: String(review.serviceId || "").trim(),
    customerName: String(review.customerName || "Customer"),
    providerName: String(review.providerName || "").trim(),
    subcategory: String(review.subcategory || "").trim(),
    rating: Math.min(5, Math.max(0, Number(review.rating || 0))),
    text: String(review.text || "").trim(),
    createdAt: review.createdAt || new Date().toISOString()
  })).filter((r) => r.providerEmail && r.text);

  const completedJobsByProvider = {};
  bookings.forEach((booking) => {
    if (booking.status !== "Completed") return;
    if (!booking.providerEmail) return;
    completedJobsByProvider[booking.providerEmail] =
      Number(completedJobsByProvider[booking.providerEmail] || 0) + 1;
  });

  const reviewsByProvider = {};
  reviews.forEach((r) => {
    if (!reviewsByProvider[r.providerEmail]) reviewsByProvider[r.providerEmail] = [];
    reviewsByProvider[r.providerEmail].push(r);
  });

  const updatedProviderProfiles = providerProfiles.map((profile) => {
    const providerReviewList = reviewsByProvider[profile.providerEmail] || [];
    const completedJobs = Math.max(
      Number(completedJobsByProvider[profile.providerEmail] || 0),
      Number(profile.completedJobs || 0)
    );
    if (providerReviewList.length === 0) {
      return {
        ...profile,
        completedJobs
      };
    }

    const sum = providerReviewList.reduce((acc, r) => acc + r.rating, 0);
    return {
      ...profile,
      rating: sum / providerReviewList.length,
      reviews: providerReviewList.length,
      completedJobs
    };
  });

  return {
    ...baseData,
    customerProfile,
    adminSettings,
    providerQueue: normalizedProviderQueue,
    providerSettings,
    providerProfiles: updatedProviderProfiles,
    providerServiceCatalog,
    userVerificationQueue,
    bookings,
    bookingMessages,
    reviews,
    customerBookings: buildLegacyCustomerBookings(bookings),
    providerSlotOptions: normalizedSlotOptions,
    providerProfile: {
      displayName: primaryProviderSetting.displayName,
      category: primaryProviderSetting.category,
      radius: primaryProviderSetting.radius,
      availability: primaryProviderSetting.availability
    },
    providerSelectedSlots: primaryProviderSetting.selectedSlots,
    providerOnline: Boolean(primaryProviderSetting.online),
    disputeQueue,
    adminProviderChat,
    customerProviderChat,
    serviceCategories: SERVICE_CATEGORIES
  };
};

const mergeWithDefaults = (raw) => {
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    parsed = {};
  }

  const providerEmailSet = getRegisteredProviderEmailSet();
  const localProviderAccounts = getLocalAccounts().filter(
    (account) => resolveRole(account?.role) === "PROVIDER"
  );

  const providerQueue = dedupeBy(
    ensureArray(parsed.providerQueue)
      .map((provider) => buildProviderQueueEntry(provider))
      .filter((provider) => provider.email && providerEmailSet.has(provider.email)),
    providerIdentityKey
  );

  const providerSettings = {};
  const parsedProviderSettings =
    parsed.providerSettings && typeof parsed.providerSettings === "object"
      ? parsed.providerSettings
      : {};

  providerQueue.forEach((provider) => {
    providerSettings[provider.email] = buildDefaultProviderSetting({
      ...(parsedProviderSettings[provider.email] || {}),
      displayName: provider.name,
      category: provider.serviceType,
      selectedSlots:
        parsedProviderSettings[provider.email]?.selectedSlots ||
        provider.selectedSlots ||
        parsed.providerSelectedSlots,
      location: provider.area || provider.address
    });
  });

  localProviderAccounts.forEach((account) => {
    const providerEmail = normalizeEmail(account.email || "");
    if (!providerEmail) return;

    const exists = providerQueue.some((provider) => provider.email === providerEmail);
    if (exists) return;

    const generatedEntry = buildProviderQueueEntry({
      name: account.name || providerEmail.split("@")[0],
      email: providerEmail,
      phone: account.phone || "",
      area: account.address || "Not specified",
      address: account.address || "Not specified",
      serviceType: account.serviceType || "Home Service",
      idProofType: account.idProofType || "Not provided",
      idProofDocumentName: account.idProofDocumentName || "Not provided",
      status: "PENDING",
      selectedSlots: providerSettings[providerEmail]?.selectedSlots || []
    });

    providerQueue.push(generatedEntry);
    providerSettings[providerEmail] = buildDefaultProviderSetting({
      ...(providerSettings[providerEmail] || {}),
      displayName: generatedEntry.name,
      category: generatedEntry.serviceType,
      selectedSlots: generatedEntry.selectedSlots,
      location: generatedEntry.area || generatedEntry.address
    });
  });

  const parsedBookings = ensureArray(parsed.bookings);
  const parsedServiceCatalog = ensureArray(parsed.providerServiceCatalog);
  const parsedProviderProfiles = ensureArray(parsed.providerProfiles);

  const legacyBookingsFromOldShape = ensureArray(parsed.customerBookings)
    .map((booking) => {
      const providerMatch = providerQueue.find(
        (provider) =>
          provider.name.trim().toLowerCase() === String(booking.partner || "").trim().toLowerCase()
      );
      if (!providerMatch) return null;

      return buildBookingEntry({
        customerName: parsed.customerProfile?.name || "Customer",
        customerEmail: parsed.customerProfile?.email || "",
        customerLocation: parsed.customerProfile?.location || "",
        providerName: providerMatch.name,
        providerEmail: providerMatch.email,
        providerLocation: providerMatch.area || providerMatch.address,
        category: providerMatch.serviceType,
        subcategory: booking.title || providerMatch.serviceType,
        status: booking.status || "PENDING"
      });
    })
    .filter(Boolean);

  return withDerivedData({
    ...defaultData,
    ...parsed,
    providerQueue,
    providerSettings,
    bookings: parsedBookings.length ? parsedBookings : legacyBookingsFromOldShape,
    providerServiceCatalog: parsedServiceCatalog,
    providerProfiles: parsedProviderProfiles
  });
};

const AppDataContext = createContext(null);

export const AppDataProvider = ({ children }) => {
  const [portalData, setPortalData] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return mergeWithDefaults(raw);
    } catch {
      return withDerivedData(defaultData);
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portalData));
  }, [portalData]);

  const value = useMemo(() => {
    const resolveProviderEmail = (providerEmail, sourceData) => {
      const normalized = normalizeEmail(providerEmail || "");
      if (normalized) return normalized;
      return normalizeEmail(sourceData.providerQueue?.[0]?.email || "");
    };

    const saveCustomerProfile = (profile) => {
      setPortalData((prev) =>
        withDerivedData({
          ...prev,
          customerProfile: {
            ...prev.customerProfile,
            ...profile
          }
        })
      );
    };

    const resetCustomerProfile = () => {
      setPortalData((prev) =>
        withDerivedData({
          ...prev,
          customerProfile: { ...defaultData.customerProfile }
        })
      );
    };

    const saveProviderProfile = (profile, providerEmail) => {
      setPortalData((prev) => {
        const resolvedProviderEmail = resolveProviderEmail(providerEmail, prev);
        if (!resolvedProviderEmail) return prev;

        const provider = prev.providerQueue.find((entry) => entry.email === resolvedProviderEmail);
        if (!provider) return prev;

        const currentSetting =
          prev.providerSettings[resolvedProviderEmail] ||
          buildDefaultProviderSetting({
            displayName: provider.name,
            category: provider.serviceType,
            location: provider.area || provider.address,
            selectedSlots: provider.selectedSlots
          });

        return withDerivedData({
          ...prev,
          providerSettings: {
            ...prev.providerSettings,
            [resolvedProviderEmail]: buildDefaultProviderSetting({
              ...currentSetting,
              ...profile
            })
          }
        });
      });
    };

    const setProviderOnline = (isOnline, providerEmail) => {
      setPortalData((prev) => {
        const resolvedProviderEmail = resolveProviderEmail(providerEmail, prev);
        if (!resolvedProviderEmail) return prev;
        const provider = prev.providerQueue.find((entry) => entry.email === resolvedProviderEmail);
        if (!provider) return prev;

        const currentSetting =
          prev.providerSettings[resolvedProviderEmail] ||
          buildDefaultProviderSetting({
            displayName: provider.name,
            category: provider.serviceType,
            location: provider.area || provider.address,
            selectedSlots: provider.selectedSlots
          });

        return withDerivedData({
          ...prev,
          providerSettings: {
            ...prev.providerSettings,
            [resolvedProviderEmail]: buildDefaultProviderSetting({
              ...currentSetting,
              online: Boolean(isOnline)
            })
          }
        });
      });
    };

    const saveProviderSelectedSlots = (slots, providerEmail) => {
      setPortalData((prev) => {
        const resolvedProviderEmail = resolveProviderEmail(providerEmail, prev);
        if (!resolvedProviderEmail) return prev;
        const provider = prev.providerQueue.find((entry) => entry.email === resolvedProviderEmail);
        if (!provider) return prev;

        const currentSetting =
          prev.providerSettings[resolvedProviderEmail] ||
          buildDefaultProviderSetting({
            displayName: provider.name,
            category: provider.serviceType,
            location: provider.area || provider.address,
            selectedSlots: provider.selectedSlots
          });

        return withDerivedData({
          ...prev,
          providerSettings: {
            ...prev.providerSettings,
            [resolvedProviderEmail]: buildDefaultProviderSetting({
              ...currentSetting,
              selectedSlots: sanitizeSlots(slots)
            })
          }
        });
      });
    };

    const saveProviderServices = (providerEmail, services) => {
      setPortalData((prev) => {
        const resolvedProviderEmail = resolveProviderEmail(providerEmail, prev);
        if (!resolvedProviderEmail) return prev;
        const provider = prev.providerQueue.find((entry) => entry.email === resolvedProviderEmail);
        if (!provider) return prev;

        const normalizedServices = dedupeBy(
          ensureArray(services).map((service) =>
            buildProviderServiceEntry(
              {
                ...service,
                providerEmail: resolvedProviderEmail
              },
              provider
            )
          ),
          (service) => `${service.providerEmail}|${service.category}|${service.subcategory}`
        );

        const withoutCurrentProvider = prev.providerServiceCatalog.filter(
          (service) => service.providerEmail !== resolvedProviderEmail
        );

        const primaryCategory =
          normalizedServices[0]?.category || normalizeServiceCategory(provider.serviceType);
        const currentSetting =
          prev.providerSettings[resolvedProviderEmail] ||
          buildDefaultProviderSetting({
            displayName: provider.name,
            category: provider.serviceType,
            location: provider.area || provider.address,
            selectedSlots: provider.selectedSlots
          });

        return withDerivedData({
          ...prev,
          providerServiceCatalog: [...withoutCurrentProvider, ...normalizedServices],
          providerSettings: {
            ...prev.providerSettings,
            [resolvedProviderEmail]: buildDefaultProviderSetting({
              ...currentSetting,
              category: primaryCategory
            })
          }
        });
      });
    };

    const upsertProviderService = (providerEmail, service) => {
      setPortalData((prev) => {
        const resolvedProviderEmail = resolveProviderEmail(providerEmail, prev);
        if (!resolvedProviderEmail) return prev;
        const provider = prev.providerQueue.find((entry) => entry.email === resolvedProviderEmail);
        if (!provider) return prev;

        const normalizedService = buildProviderServiceEntry(
          {
            ...service,
            providerEmail: resolvedProviderEmail
          },
          provider
        );

        const withoutDuplicate = prev.providerServiceCatalog.filter(
          (entry) =>
            !(
              entry.providerEmail === resolvedProviderEmail &&
              entry.category === normalizedService.category &&
              entry.subcategory === normalizedService.subcategory
            )
        );

        return withDerivedData({
          ...prev,
          providerServiceCatalog: [...withoutDuplicate, normalizedService]
        });
      });
    };

    const saveAdminSettings = (settings) => {
      setPortalData((prev) =>
        withDerivedData({
          ...prev,
          adminSettings: {
            ...prev.adminSettings,
            ...settings
          }
        })
      );
    };

    const submitProviderVerification = (providerDetails) => {
      const providerEmail = normalizeEmail(providerDetails?.email || "");
      if (!providerEmail) return;

      setPortalData((prev) => {
        const nextEntry = buildProviderQueueEntry({
          ...providerDetails,
          email: providerEmail,
          area: providerDetails?.area || providerDetails?.address || "",
          address: providerDetails?.address || providerDetails?.area || "",
          serviceType: providerDetails?.serviceType || providerDetails?.category,
          selectedSlots: providerDetails?.selectedSlots || providerDetails?.availabilitySlots,
          status: "PENDING",
          submittedAt: new Date().toISOString()
        });

        const nextQueue = [...prev.providerQueue];
        const existingIndex = nextQueue.findIndex((provider) => {
          if (provider.email && providerEmail) return provider.email === providerEmail;
          return (
            String(provider.name || "").trim().toLowerCase() ===
            String(nextEntry.name || "").trim().toLowerCase()
          );
        });

        if (existingIndex === -1) {
          nextQueue.unshift(nextEntry);
        } else {
          const existing = nextQueue[existingIndex];
          nextQueue[existingIndex] = {
            ...existing,
            ...nextEntry,
            id: existing.id,
            status: "PENDING",
            docs: toProviderDocsLabel("PENDING"),
            tone: toProviderTone("PENDING"),
            submittedAt: new Date().toISOString()
          };
        }

        const settingBase =
          prev.providerSettings[providerEmail] ||
          buildDefaultProviderSetting({
            displayName: nextEntry.name,
            category: nextEntry.serviceType,
            location: nextEntry.area || nextEntry.address,
            selectedSlots: nextEntry.selectedSlots
          });

        const nextProviderSettings = {
          ...prev.providerSettings,
          [providerEmail]: buildDefaultProviderSetting({
            ...settingBase,
            displayName: nextEntry.name,
            category: nextEntry.serviceType,
            location: nextEntry.area || nextEntry.address,
            selectedSlots: nextEntry.selectedSlots
          })
        };

        const hasServices = prev.providerServiceCatalog.some(
          (service) => service.providerEmail === providerEmail
        );
        let nextServiceCatalog = prev.providerServiceCatalog;

        if (!hasServices) {
          const defaultCategory = normalizeServiceCategory(nextEntry.serviceType);
          nextServiceCatalog = [
            ...prev.providerServiceCatalog,
            buildProviderServiceEntry(
              {
                providerEmail,
                providerName: nextEntry.name,
                providerLocation: nextEntry.area || nextEntry.address,
                category: defaultCategory,
                subcategory: SERVICE_CATEGORIES[defaultCategory][0],
                price: 499,
                available: true
              },
              nextEntry
            )
          ];
        }

        return withDerivedData({
          ...prev,
          providerQueue: dedupeBy(nextQueue, providerIdentityKey),
          providerSettings: nextProviderSettings,
          providerServiceCatalog: nextServiceCatalog
        });
      });
    };

    const approveProvider = (providerId) => {
      setPortalData((prev) => {
        const targetIndex = findProviderIndexByIdOrName(prev.providerQueue, providerId);
        if (targetIndex === -1) return prev;

        const providerQueue = prev.providerQueue.map((provider, index) => {
          if (index !== targetIndex) return buildProviderQueueEntry(provider);
          return buildProviderQueueEntry({
            ...provider,
            status: "APPROVED",
            docs: toProviderDocsLabel("APPROVED"),
            tone: toProviderTone("APPROVED")
          });
        });

        return withDerivedData({
          ...prev,
          providerQueue
        });
      });
    };

    const holdProvider = (providerId) => {
      setPortalData((prev) => {
        const targetIndex = findProviderIndexByIdOrName(prev.providerQueue, providerId);
        if (targetIndex === -1) return prev;

        const providerQueue = prev.providerQueue.map((provider, index) => {
          if (index !== targetIndex) return buildProviderQueueEntry(provider);
          return buildProviderQueueEntry({
            ...provider,
            status: "ON_HOLD",
            docs: toProviderDocsLabel("ON_HOLD"),
            tone: toProviderTone("ON_HOLD")
          });
        });

        return withDerivedData({
          ...prev,
          providerQueue
        });
      });
    };

    const getProviderAccessStatus = (email) => {
      const normalized = normalizeEmail(email || "");
      if (!normalized) {
        return { provider: null, status: "NOT_FOUND", isApproved: false };
      }

      const provider =
        portalData.providerQueue.find((entry) => normalizeEmail(entry.email) === normalized) ||
        null;
      if (!provider) {
        return { provider: null, status: "NOT_FOUND", isApproved: false };
      }

      return {
        provider,
        status: provider.status,
        isApproved: provider.status === "APPROVED"
      };
    };

    const updateVerificationStatus = (entryId, status, tone = "warn") => {
      setPortalData((prev) => {
        const targetEntry = prev.userVerificationQueue.find((entry) => entry.id === entryId);
        const isProviderEntry =
          String(targetEntry?.role || "").trim().toLowerCase() === "provider" ||
          String(entryId || "").startsWith("ver-provider-");

        if (!isProviderEntry) {
          const userVerificationQueue = prev.userVerificationQueue.map((entry) =>
            entry.id === entryId ? { ...entry, status, tone } : entry
          );
          return withDerivedData({
            ...prev,
            userVerificationQueue
          });
        }

        const providerStatus = statusLabelToProviderStatus(status);
        const providerEmailFromId = String(entryId || "").startsWith("ver-provider-")
          ? normalizeEmail(String(entryId).slice("ver-provider-".length))
          : "";
        const providerNameFromEntry = String(targetEntry?.name || "").trim().toLowerCase();

        const providerQueue = prev.providerQueue.map((provider) => {
          const emailMatches = providerEmailFromId && provider.email === providerEmailFromId;
          const nameMatches =
            !providerEmailFromId &&
            providerNameFromEntry &&
            provider.name.trim().toLowerCase() === providerNameFromEntry;

          if (!emailMatches && !nameMatches) {
            return buildProviderQueueEntry(provider);
          }

          return buildProviderQueueEntry({
            ...provider,
            status: providerStatus,
            docs: toProviderDocsLabel(providerStatus),
            tone: toProviderTone(providerStatus)
          });
        });

        return withDerivedData({
          ...prev,
          providerQueue
        });
      });
    };

    const updateDisputeStatus = (disputeId, status, tone = "warn") => {
      setPortalData((prev) =>
        withDerivedData({
          ...prev,
          disputeQueue: prev.disputeQueue.map((dispute) =>
            dispute.id === disputeId ? { ...dispute, status, tone } : dispute
          )
        })
      );
    };

    const addAdminProviderMessage = (message) => {
      const text = String(message?.text || "").trim();
      if (!text) return;

      const createdAt = new Date().toISOString();
      const timestamp = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      });

      setPortalData((prev) =>
        withDerivedData({
          ...prev,
          adminProviderChat: [
            ...prev.adminProviderChat,
            {
              id: createMessageId(),
              from: message.from || "System",
              text,
              timestamp,
              createdAt
            }
          ]
        })
      );
    };

    const addCustomerProviderMessage = (message) => {
      const text = String(message?.text || "").trim();
      if (!text) return;

      const createdAt = new Date().toISOString();
      const timestamp = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
      });

      setPortalData((prev) =>
        withDerivedData({
          ...prev,
          customerProviderChat: [
            ...prev.customerProviderChat,
            {
              id: createMessageId(),
              from: message.from || "System",
              text,
              timestamp,
              createdAt
            }
          ]
        })
      );
    };

    const createBookingRequest = (bookingDetails) => {
      setPortalData((prev) => {
        const providerEmail = normalizeEmail(bookingDetails?.providerEmail || "");
        if (!providerEmail) return prev;

        const provider = prev.providerQueue.find((entry) => entry.email === providerEmail);
        if (!provider || provider.status !== "APPROVED") return prev;

        const category = normalizeServiceCategory(
          bookingDetails?.category || bookingDetails?.serviceType || provider.serviceType
        );
        const subcategory = normalizeServiceSubcategory(
          category,
          bookingDetails?.subcategory || bookingDetails?.serviceName
        );
        const customerEmail = normalizeEmail(
          bookingDetails?.customerEmail || prev.customerProfile.email || ""
        );

        if (!customerEmail) return prev;

        const duplicatePendingRequest = prev.bookings.some(
          (booking) =>
            booking.customerEmail === customerEmail &&
            booking.providerEmail === providerEmail &&
            booking.category === category &&
            booking.subcategory === subcategory &&
            booking.status === "Pending"
        );

        if (duplicatePendingRequest) {
          return prev;
        }

        const booking = buildBookingEntry({
          customerName: bookingDetails?.customerName || prev.customerProfile.name || "Customer",
          customerEmail,
          customerLocation:
            bookingDetails?.customerLocation || prev.customerProfile.location || "Not specified",
          providerName: provider.name,
          providerEmail: provider.email,
          providerLocation: provider.area || provider.address,
          serviceId: bookingDetails?.serviceId,
          category,
          subcategory,
          price: bookingDetails?.price,
          bookingDate: bookingDetails?.bookingDate,
          selectedSlot: bookingDetails?.selectedSlot,
          problemDescription: bookingDetails?.problemDescription,
          status: "Pending"
        });

        return withDerivedData({
          ...prev,
          bookings: [booking, ...prev.bookings]
        });
      });
    };

    const updateBookingStatus = (bookingId, status, providerEmail) => {
      setPortalData((prev) => {
        const normalizedStatus = normalizeBookingStatus(status);
        const normalizedProviderEmail = normalizeEmail(providerEmail || "");

        let statusChanged = false;
        const bookings = prev.bookings.map((booking) => {
          if (booking.id !== bookingId) return booking;
          if (normalizedProviderEmail && booking.providerEmail !== normalizedProviderEmail) {
            return booking;
          }
          if (normalizedStatus === "Completed" && !normalizedProviderEmail) {
            return booking;
          }

          if (booking.status === normalizedStatus) return booking;

          statusChanged = true;
          return {
            ...booking,
            status: normalizedStatus,
            tone: bookingToneByStatus(normalizedStatus),
            updatedAt: new Date().toISOString()
          };
        });

        if (!statusChanged) return prev;

        let statusText = "";
        if (normalizedStatus === "Confirmed") {
          statusText = "Booking confirmed. Chat is now enabled for this booking.";
        } else if (normalizedStatus === "Completed") {
          statusText = "Service marked as completed by provider. Please submit your rating and review.";
        } else if (normalizedStatus === "Cancelled") {
          statusText = normalizedProviderEmail
            ? "Booking was cancelled by provider."
            : "Booking was cancelled.";
        }

        const existingThread = ensureArray(prev.bookingMessages[bookingId]);
        let bookingMessages = prev.bookingMessages;
        if (statusText) {
          const lastMessage = existingThread[existingThread.length - 1];
          const shouldAppend = String(lastMessage?.text || "").trim() !== statusText;
          if (shouldAppend) {
            bookingMessages = {
              ...prev.bookingMessages,
              [bookingId]: [
                ...existingThread,
                {
                  id: createMessageId(),
                  from: "System",
                  text: statusText,
                  timestamp: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  }),
                  createdAt: new Date().toISOString(),
                  senderRole: "SYSTEM",
                  senderEmail: ""
                }
              ]
            };
          }
        }

        return withDerivedData({
          ...prev,
          bookings,
          bookingMessages
        });
      });
    };

    const addBookingMessage = (message) => {
      const bookingId = String(message?.bookingId || "").trim();
      const text = String(message?.text || "").trim();
      if (!bookingId || !text) return;

      setPortalData((prev) => {
        const booking = prev.bookings.find((entry) => entry.id === bookingId);
        if (!booking) return prev;
        if (booking.status !== "Confirmed") return prev;

        const createdAt = new Date().toISOString();
        const timestamp = new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit"
        });

        const nextThread = [
          ...ensureArray(prev.bookingMessages[bookingId]),
          {
            id: createMessageId(),
            from: message.from || "User",
            text,
            timestamp,
            createdAt,
            senderRole: String(message.senderRole || ""),
            senderEmail: normalizeEmail(message.senderEmail || "")
          }
        ];

        return withDerivedData({
          ...prev,
          bookingMessages: {
            ...prev.bookingMessages,
            [bookingId]: nextThread
          }
        });
      });
    };

    const addBooking = (booking) => {
      setPortalData((prev) => {
        const providerName = String(booking?.partner || booking?.provider || "")
          .trim()
          .toLowerCase();
        const provider = prev.providerQueue.find(
          (entry) => entry.name.trim().toLowerCase() === providerName
        );
        if (!provider) return prev;

        const normalizedBooking = buildBookingEntry({
          customerName: prev.customerProfile.name || "Customer",
          customerEmail: prev.customerProfile.email || "",
          customerLocation: prev.customerProfile.location || "",
          providerName: provider.name,
          providerEmail: provider.email,
          providerLocation: provider.area || provider.address,
          category: booking?.category || provider.serviceType,
          subcategory: booking?.title || booking?.serviceName || provider.serviceType,
          price: booking?.price || 0,
          status: booking?.status || "Pending"
        });

        return withDerivedData({
          ...prev,
          bookings: [normalizedBooking, ...prev.bookings]
        });
      });
    };

    const addReview = (review) => {
      const providerEmail = normalizeEmail(review?.providerEmail || "");
      const customerEmail = normalizeEmail(review?.customerEmail || "");
      if (!providerEmail || !customerEmail) return;
      if (!review?.text?.trim()) return;
      const requestedBookingId = String(review?.bookingId || "").trim();
      const requestedServiceId = String(review?.serviceId || "").trim();
      const rating = Math.min(5, Math.max(1, Number(review.rating || 0)));
      if (!rating) return;

      setPortalData((prev) => {
        const completedBookings = prev.bookings.filter((booking) => {
          if (booking.status !== "Completed") return false;
          if (booking.providerEmail !== providerEmail) return false;
          if (booking.customerEmail !== customerEmail) return false;
          if (requestedBookingId && booking.id !== requestedBookingId) return false;
          if (requestedServiceId && String(booking.serviceId || "") !== requestedServiceId) {
            return false;
          }
          return true;
        });
        if (!completedBookings.length) return prev;

        const bookedReviewIds = new Set(
          prev.reviews
            .map((entry) => String(entry.bookingId || "").trim())
            .filter(Boolean)
        );

        const targetBooking =
          completedBookings.find((booking) => !bookedReviewIds.has(booking.id)) || null;
        if (!targetBooking) return prev;

        const alreadyReviewedByLegacyRule = prev.reviews.some((entry) => {
          if (entry.providerEmail !== providerEmail || entry.customerEmail !== customerEmail) {
            return false;
          }
          if (!entry.bookingId && !requestedServiceId) return true;
          if (!entry.bookingId && requestedServiceId) {
            return String(entry.serviceId || "") === requestedServiceId;
          }
          return false;
        });
        if (alreadyReviewedByLegacyRule) return prev;

        return withDerivedData({
          ...prev,
          reviews: [
            ...prev.reviews,
            {
              id: createId("rev"),
              bookingId: targetBooking.id,
              serviceId: String(targetBooking.serviceId || requestedServiceId || ""),
              providerEmail,
              customerEmail,
              customerName: String(review.customerName || "Customer"),
              providerName: String(targetBooking.providerName || review.providerName || ""),
              subcategory: String(targetBooking.subcategory || review.subcategory || ""),
              rating,
              text: review.text.trim(),
              createdAt: new Date().toISOString()
            }
          ]
        });
      });
    };

    return {
      portalData,
      saveCustomerProfile,
      resetCustomerProfile,
      saveProviderProfile,
      setProviderOnline,
      saveProviderSelectedSlots,
      saveProviderServices,
      upsertProviderService,
      saveAdminSettings,
      submitProviderVerification,
      approveProvider,
      holdProvider,
      getProviderAccessStatus,
      updateVerificationStatus,
      updateDisputeStatus,
      addAdminProviderMessage,
      addCustomerProviderMessage,
      createBookingRequest,
      updateBookingStatus,
      addBookingMessage,
      addBooking,
      addReview,
      bookingStatusLabel
    };
  }, [portalData]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return context;
};
