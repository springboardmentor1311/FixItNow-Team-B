import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../state/AppDataContext";
import {
  getLocalAccountRoleByEmail,
  hasRegisteredEmail,
  normalizeEmail,
  registerLocalAccount,
  rememberRegisteredEmail,
  upsertLocalAccount
} from "../auth/localAuth";

const roles = [
  { label: "Customer", value: "CUSTOMER" },
  { label: "Provider", value: "PROVIDER" }
];

const idProofTypes = ["PAN", "AADHAAR", "DRIVING_LICENSE", "VOTER_ID"];

const Register = () => {
  const [role, setRole] = useState("CUSTOMER");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [serviceType, setServiceType] = useState("Mechanic");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [idProofType, setIdProofType] = useState("PAN");
  const [idProofFile, setIdProofFile] = useState(null);

  const [error, setError] = useState("");
  const [geoMessage, setGeoMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { portalData, saveCustomerProfile, saveProviderProfile, submitProviderVerification } =
    useAppData();
  const navigate = useNavigate();
  const slotOptions = portalData.providerSlotOptions || [];

  const roleHint = useMemo(() => {
    if (role === "CUSTOMER") return "Book trusted local professionals in minutes.";
    return "Offer services, manage slots, and grow your business.";
  }, [role]);

  const buildDuplicateEmailMessage = (existingRole = "") => {
    if (existingRole) {
      return `This email is already registered for the ${String(
        existingRole
      ).toLowerCase()} portal. One email can access only one portal. Please login.`;
    }
    return "This email is already registered. One email can access only one portal. Please login.";
  };

  const clearFormForRoleSwitch = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAddress("");
    setPhone("");
    setServiceType("Mechanic");
    setSelectedSlots([]);
    setIdProofType("PAN");
    setIdProofFile(null);
    setGeoMessage("");
    setIsLocating(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError("");
  };

  const onRoleChange = (nextRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    clearFormForRoleSwitch();
  };

  const isValidIdFile = (file) => {
    if (!file) return false;
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    return allowedTypes.includes(file.type) && file.size <= 5 * 1024 * 1024;
  };

  const toggleTimeSlot = (slot) => {
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((existingSlot) => existingSlot !== slot) : [...prev, slot]
    );
  };

  const redirectByRole = (selectedRole) => {
    if (selectedRole === "CUSTOMER") navigate("/customer/dashboard");
    if (selectedRole === "PROVIDER") navigate("/provider/dashboard");
  };

  const joinUniqueAddressParts = (parts) => {
    const uniqueParts = [];
    parts.forEach((part) => {
      const cleaned = part?.trim();
      if (cleaned && !uniqueParts.includes(cleaned)) {
        uniqueParts.push(cleaned);
      }
    });
    return uniqueParts.join(", ");
  };

  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage("Location service is not available in your browser.");
      return;
    }

    const getAccuratePosition = () =>
      new Promise((resolve, reject) => {
        let bestPosition = null;
        let watchId = null;
        let timeoutId = null;

        const finish = (result, error) => {
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          if (timeoutId !== null) window.clearTimeout(timeoutId);
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        };

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (
              !bestPosition ||
              position.coords.accuracy < bestPosition.coords.accuracy
            ) {
              bestPosition = position;
            }

            // Stop early once we get a good GPS fix.
            if (position.coords.accuracy <= 40) {
              finish(bestPosition);
            }
          },
          (error) => {
            finish(null, error);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );

        timeoutId = window.setTimeout(() => {
          if (bestPosition) {
            finish(bestPosition);
            return;
          }
          finish(null, new Error("Location timed out"));
        }, 12000);
      });

    setGeoMessage("Detecting your location...");
    setIsLocating(true);

    const getPreciseAddressFromCoords = async (latitude, longitude) => {
      const openStreetMapUrl =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}` +
        `&lon=${longitude}&addressdetails=1&zoom=18`;

      const openStreetMapResponse = await fetch(openStreetMapUrl, {
        headers: { Accept: "application/json" }
      });

      if (openStreetMapResponse.ok) {
        const data = await openStreetMapResponse.json();
        const addressData = data.address || {};

        const street = [addressData.house_number, addressData.road]
          .filter(Boolean)
          .join(" ")
          .trim();
        const locality =
          addressData.suburb ||
          addressData.neighbourhood ||
          addressData.city_district ||
          addressData.quarter;
        const city =
          addressData.city || addressData.town || addressData.village || addressData.county;
        const state = addressData.state || addressData.state_district;
        const postCode = addressData.postcode;
        const country = addressData.country;

        const preciseAddress =
          joinUniqueAddressParts([street, locality, city, state, postCode, country]) ||
          data.display_name ||
          "";

        if (preciseAddress) {
          return {
            placeName: preciseAddress
          };
        }
      }

      const backupUrl =
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}` +
        `&longitude=${longitude}&localityLanguage=en`;

      const backupResponse = await fetch(backupUrl);
      if (!backupResponse.ok) {
        throw new Error("Reverse geocoding failed");
      }

      const backupData = await backupResponse.json();
      const placeName = joinUniqueAddressParts([
        backupData.locality,
        backupData.city,
        backupData.principalSubdivision,
        backupData.countryName
      ]);

      return {
        placeName
      };
    };

    getAccuratePosition()
      .then(async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          const { placeName } = await getPreciseAddressFromCoords(latitude, longitude);
          if (placeName) {
            setAddress(placeName);
            const roundedAccuracy = Math.round(accuracy || 0);
            if (roundedAccuracy > 120) {
              setGeoMessage(
                `Location detected with low GPS accuracy (~${roundedAccuracy}m). Please verify the address before creating account.`
              );
            } else {
              setGeoMessage(`Precise location set to ${placeName}.`);
            }
            return;
          }
        } catch {
          // Fallback handled below
        }

        const fallback = `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;
        setAddress(fallback);
        setGeoMessage("Could not fetch place name. Coordinates were captured.");
      })
      .catch(() => {
        setGeoMessage("Location access denied or unavailable. Please fill manually.");
      })
      .finally(() => {
        setIsLocating(false);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const normalizedEmail = normalizeEmail(email);
    const trimmedAddress = address.trim();

    if (password !== confirmPassword) {
      setError("Password does not match confirm password.");
      return;
    }

    if (!trimmedName || !normalizedEmail || !trimmedAddress) {
      setError("Please fill all required fields.");
      return;
    }

    if (phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    if (hasRegisteredEmail(normalizedEmail)) {
      setError(buildDuplicateEmailMessage(getLocalAccountRoleByEmail(normalizedEmail)));
      return;
    }

    if (role === "PROVIDER") {
      if (!idProofType) {
        setError("Please select an ID proof type.");
        return;
      }

      if (!isValidIdFile(idProofFile)) {
        setError("Upload a valid ID proof (PDF/JPG/PNG, max 5MB).");
        return;
      }

      if (selectedSlots.length === 0) {
        setError("Please choose at least one time slot before creating provider account.");
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      name: trimmedName,
      email: normalizedEmail,
      password,
      role,
      address: trimmedAddress,
      phone,
      serviceType: role === "PROVIDER" ? serviceType : null,
      selectedSlots: role === "PROVIDER" ? selectedSlots : [],
      idProofType: role === "PROVIDER" ? idProofType : null,
      idProofDocumentName: role === "PROVIDER" ? idProofFile?.name || null : null
    };

    const persistRoleProfile = () => {
      if (role === "CUSTOMER") {
        saveCustomerProfile({
          name: trimmedName,
          email: normalizedEmail,
          phone,
          location: trimmedAddress
        });
      }

      if (role === "PROVIDER") {
        saveProviderProfile({
          displayName: trimmedName,
          category: serviceType,
          availability: "Mon - Sat, 9 AM - 8 PM",
          location: trimmedAddress,
          selectedSlots
        }, normalizedEmail);
      }
    };

    const loginAndRedirect = () => {
      login({ role, email: normalizedEmail, name: trimmedName });
      persistRoleProfile();
      redirectByRole(role);
    };

    const completeProviderRegistration = () => {
      submitProviderVerification({
        ...payload,
        name: trimmedName,
        email: normalizedEmail,
        area: trimmedAddress,
        address: trimmedAddress,
        selectedSlots
      });
      persistRoleProfile();
      navigate("/pending-approval", {
        state: {
          name: trimmedName,
          email: normalizedEmail
        }
      });
    };

    try {
      const res = await API.post("/auth/register", payload);
      const responseData = res?.data?.data ?? res?.data;

      if (role === "PROVIDER") {
        const savedProviderAccount = upsertLocalAccount(payload);
        if (!savedProviderAccount) {
          setError(buildDuplicateEmailMessage(getLocalAccountRoleByEmail(normalizedEmail)));
          return;
        }
        completeProviderRegistration();
        return;
      }

      if (responseData?.token) {
        const savedCustomerAccount = upsertLocalAccount(payload);
        if (!savedCustomerAccount) {
          setError(buildDuplicateEmailMessage(getLocalAccountRoleByEmail(normalizedEmail)));
          return;
        }
        login({ ...responseData, role });
        persistRoleProfile();
        redirectByRole(role);
        return;
      }

      const fallbackRegistration = registerLocalAccount(payload);
      if (
        !fallbackRegistration.ok &&
        fallbackRegistration.reason === "duplicate_email_account"
      ) {
        setError(buildDuplicateEmailMessage(fallbackRegistration.existingRole));
        return;
      }

      rememberRegisteredEmail(normalizedEmail);
      loginAndRedirect();
    } catch (err) {
      if (err?.response) {
        const backendMessage =
          err.response?.data?.message || err.response?.data?.error || "";

        if (
          err.response.status === 409 ||
          /already|exists|duplicate|registered|taken/i.test(String(backendMessage))
        ) {
          rememberRegisteredEmail(normalizedEmail);
          setError(buildDuplicateEmailMessage(getLocalAccountRoleByEmail(normalizedEmail)));
          return;
        }
      }

      const fallbackRegistration = registerLocalAccount(payload);
      if (
        !fallbackRegistration.ok &&
        fallbackRegistration.reason === "duplicate_email_account"
      ) {
        setError(buildDuplicateEmailMessage(fallbackRegistration.existingRole));
        return;
      }

      rememberRegisteredEmail(normalizedEmail);

      if (role === "PROVIDER") {
        completeProviderRegistration();
        return;
      }

      loginAndRedirect();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowTop} />
      <div style={styles.glowBottom} />

      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>{roleHint}</p>

        <div
          style={{
            ...styles.toggleContainer,
            gridTemplateColumns: `repeat(${roles.length}, 1fr)`
          }}
        >
          {roles.map((item) => (
            <button
              type="button"
              key={item.value}
              style={role === item.value ? styles.activeBtn : styles.inactiveBtn}
              onClick={() => onRoleChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.twoCol}>
            <input
              style={styles.input}
              type="text"
              placeholder="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              style={styles.input}
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={styles.twoCol}>
            <div style={styles.passwordWrap}>
              <input
                style={{ ...styles.input, ...styles.passwordInput }}
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                style={styles.passwordEye}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                👁
              </button>
            </div>

            <div style={styles.passwordWrap}>
              <input
                style={{ ...styles.input, ...styles.passwordInput }}
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                style={styles.passwordEye}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                👁
              </button>
            </div>
          </div>

          <input
            style={styles.input}
            type="text"
            placeholder="Current Location"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <input
            style={styles.input}
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              if (value.length <= 10) setPhone(value);
            }}
            required
          />

          {(role === "CUSTOMER" || role === "PROVIDER") && (
            <div style={styles.locationBox}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={detectCurrentLocation}
                disabled={isLocating}
              >
                {isLocating ? "Detecting..." : "Use Current Location"}
              </button>
              {geoMessage && <p style={styles.geoText}>{geoMessage}</p>}
            </div>
          )}

          {role === "PROVIDER" && (
            <div style={styles.providerBlock}>
              <div style={styles.twoCol}>
                <select
                  style={styles.input}
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  <option>Mechanic</option>
                  <option>Plumber</option>
                  <option>Electrician</option>
                  <option>Carpenter</option>
                  <option>AC Technician</option>
                </select>

                <select
                  style={styles.input}
                  value={idProofType}
                  onChange={(e) => setIdProofType(e.target.value)}
                >
                  {idProofTypes.map((proof) => (
                    <option key={proof} value={proof}>
                      {proof.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <label style={styles.uploadLabel}>
                Upload ID proof (PDF/JPG/PNG, max 5MB)
                <input
                  className="register-file-input"
                  style={styles.fileInput}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setIdProofFile(e.target.files?.[0] || null)}
                />
              </label>

              <div style={styles.slotSection}>
                <p style={styles.slotHint}>Choose available time slots</p>
                <div style={styles.slotWrap}>
                  {slotOptions.map((slot) => (
                    <button
                      type="button"
                      key={slot}
                      style={selectedSlots.includes(slot) ? styles.slotChipActive : styles.slotChip}
                      onClick={() => toggleTimeSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {idProofFile && <p style={styles.fileName}>Selected: {idProofFile.name}</p>}
            </div>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.registerBtn} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p style={styles.loginText}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(circle at 12% 8%, rgba(6, 182, 212, 0.22), transparent 34%), radial-gradient(circle at 88% 15%, rgba(56, 189, 248, 0.18), transparent 32%), linear-gradient(150deg, #0f172a, #111827 42%, #1e293b)",
    position: "relative",
    overflow: "hidden",
    padding: "20px"
  },
  glowTop: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6, 182, 212, 0.24), transparent 70%)",
    top: -190,
    right: -160
  },
  glowBottom: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(56, 189, 248, 0.19), transparent 70%)",
    bottom: -220,
    left: -190
  },
  card: {
    position: "relative",
    zIndex: 1,
    background: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    backdropFilter: "blur(12px)",
    padding: "34px",
    borderRadius: "20px",
    width: "min(760px, 100%)",
    boxShadow: "0 26px 64px rgba(3, 10, 16, 0.35)"
  },
  title: {
    margin: 0,
    color: "#f6fbff",
    fontSize: 38,
    textAlign: "center",
    letterSpacing: 0.4
  },
  subtitle: {
    color: "#cbd5e1",
    textAlign: "center",
    margin: "8px 0 20px",
    fontSize: 14
  },
  toggleContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 8,
    marginBottom: 18
  },
  activeBtn: {
    padding: "10px",
    background: "linear-gradient(140deg, #67e8f9, #06b6d4)",
    color: "#083344",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700
  },
  inactiveBtn: {
    padding: "10px",
    background: "rgba(15, 23, 42, 0.9)",
    color: "white",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "8px",
    cursor: "pointer"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12
  },
  input: {
    padding: "11px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(15, 23, 42, 0.95)",
    color: "#f3fbff",
    fontSize: "14px"
  },
  passwordWrap: {
    position: "relative"
  },
  passwordInput: {
    paddingRight: "46px",
    width: "100%"
  },
  passwordEye: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "transparent",
    color: "#bae6fd",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    lineHeight: 1
  },
  locationBox: {
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(15, 23, 42, 0.7)"
  },
  secondaryBtn: {
    border: "1px solid rgba(6, 182, 212, 0.55)",
    background: "rgba(6, 182, 212, 0.2)",
    color: "#cffafe",
    borderRadius: 8,
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: 700
  },
  geoText: {
    margin: "8px 0 0",
    color: "#bae6fd",
    fontSize: 13
  },
  providerBlock: {
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: 12,
    padding: 12,
    background: "rgba(15, 23, 42, 0.7)",
    display: "flex",
    flexDirection: "column",
    gap: 10
  },
  uploadLabel: {
    color: "#d2e9f2",
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  fileInput: {
    color: "#111827",
    background: "#ffffff",
    borderRadius: 8,
    padding: "6px 8px"
  },
  fileName: {
    margin: 0,
    color: "#67e8f9",
    fontSize: 13
  },
  slotSection: {
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(15, 23, 42, 0.68)"
  },
  slotHint: {
    margin: "0 0 8px",
    color: "#d2e9f2",
    fontSize: 13
  },
  slotWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  slotChip: {
    border: "1px solid rgba(148, 163, 184, 0.4)",
    borderRadius: 999,
    background: "rgba(15, 23, 42, 0.92)",
    color: "#e2e8f0",
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer"
  },
  slotChipActive: {
    border: "1px solid rgba(6, 182, 212, 0.9)",
    borderRadius: 999,
    background: "rgba(6, 182, 212, 0.25)",
    color: "#ccfbf1",
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700
  },
  registerBtn: {
    marginTop: "8px",
    padding: "12px",
    background: "linear-gradient(130deg, #67e8f9, #06b6d4)",
    border: "none",
    borderRadius: "10px",
    color: "#083344",
    fontWeight: "bold",
    cursor: "pointer"
  },
  loginText: {
    marginTop: "15px",
    textAlign: "center",
    color: "#f8fafc"
  },
  error: {
    margin: 0,
    color: "#ff9ac4",
    fontSize: 14
  }
};
