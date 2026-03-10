const REGISTERED_EMAILS_KEY = "fixitnow_registered_emails";
const LOCAL_ACCOUNTS_KEY = "fixitnow_local_accounts";

export const normalizeEmail = (value = "") => value.trim().toLowerCase();
export const normalizeRole = (value = "") => String(value || "").trim().toUpperCase();

export const resolveRole = (value = "") => {
  const normalizedRole = normalizeRole(value);
  if (normalizedRole.endsWith("ADMIN")) return "ADMIN";
  if (normalizedRole.includes("PROVIDER")) return "PROVIDER";
  if (normalizedRole.includes("CUSTOMER")) return "CUSTOMER";
  return normalizedRole;
};

const toRoleCandidates = (value) => {
  if (Array.isArray(value)) return value.flatMap((item) => toRoleCandidates(item));
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (value === undefined || value === null) return [];
  return [value];
};

export const resolveRoleFromClaims = (claims = {}) => {
  if (!claims || typeof claims !== "object") return "";

  const claimCandidates = [
    claims.role,
    claims.roles,
    claims.authority,
    claims.authorities,
    claims.scope,
    claims.scp
  ];

  for (const candidate of claimCandidates) {
    for (const roleValue of toRoleCandidates(candidate)) {
      const resolved = resolveRole(roleValue);
      if (resolved) return resolved;
    }
  }

  return "";
};

const getParsedList = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const setList = (key, list) => {
  localStorage.setItem(key, JSON.stringify(list));
};

export const getStoredRegisteredEmails = () => getParsedList(REGISTERED_EMAILS_KEY);

export const rememberRegisteredEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return;

  const next = Array.from(new Set([...getStoredRegisteredEmails(), normalized]));
  setList(REGISTERED_EMAILS_KEY, next);
};

export const getLocalAccounts = () => getParsedList(LOCAL_ACCOUNTS_KEY);

const setLocalAccounts = (accounts) => {
  setList(LOCAL_ACCOUNTS_KEY, accounts);
};

const buildStoredAccount = (account) => ({
  name: account.name,
  email: normalizeEmail(account.email),
  password: account.password,
  role: resolveRole(account.role),
  address: account.address || "",
  phone: account.phone || "",
  serviceType: account.serviceType || null,
  idProofType: account.idProofType || null,
  idProofDocumentName: account.idProofDocumentName || null,
  createdAt: account.createdAt || new Date().toISOString()
});

export const findLocalAccount = ({ email, role } = {}) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const normalizedRole = role ? resolveRole(role) : "";

  return (
    getLocalAccounts().find((account) => {
      if (normalizeEmail(account.email) !== normalized) return false;
      if (!normalizedRole) return true;
      return resolveRole(account.role) === normalizedRole;
    }) || null
  );
};

export const findLocalAccountByEmail = (email) => findLocalAccount({ email });

export const getLocalAccountRoleByEmail = (email) =>
  resolveRole(findLocalAccountByEmail(email)?.role);

export const hasRegisteredEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  return Boolean(
    findLocalAccountByEmail(normalized) || getStoredRegisteredEmails().includes(normalized)
  );
};

export const registerLocalAccount = (account) => {
  const normalizedEmail = normalizeEmail(account?.email);
  const normalizedRole = resolveRole(account?.role);
  if (!normalizedEmail) return { ok: false, reason: "invalid_email" };
  if (!normalizedRole) return { ok: false, reason: "invalid_role" };

  const existingRole = getLocalAccountRoleByEmail(normalizedEmail);
  if (hasRegisteredEmail(normalizedEmail)) {
    return {
      ok: false,
      reason: "duplicate_email_account",
      existingRole: existingRole || null
    };
  }

  const nextAccount = buildStoredAccount({
    ...account,
    email: normalizedEmail,
    role: normalizedRole
  });
  const accounts = getLocalAccounts();
  setLocalAccounts([...accounts, nextAccount]);
  rememberRegisteredEmail(normalizedEmail);
  return { ok: true, account: nextAccount };
};

export const upsertLocalAccount = (account) => {
  const normalizedEmail = normalizeEmail(account?.email);
  const normalizedRole = resolveRole(account?.role);
  if (!normalizedEmail) return null;
  if (!normalizedRole) return null;

  const nextAccount = buildStoredAccount({
    ...account,
    email: normalizedEmail,
    role: normalizedRole
  });
  const accounts = getLocalAccounts();
  const index = accounts.findIndex(
    (existing) => normalizeEmail(existing.email) === normalizedEmail
  );

  if (index === -1) {
    setLocalAccounts([...accounts, nextAccount]);
  } else {
    const existingRole = resolveRole(accounts[index]?.role);
    if (existingRole && existingRole !== normalizedRole) {
      return null;
    }

    const updated = [...accounts];
    updated[index] = {
      ...updated[index],
      ...nextAccount,
      role: existingRole || normalizedRole,
      createdAt: updated[index].createdAt
    };
    setLocalAccounts(updated);
  }

  rememberRegisteredEmail(normalizedEmail);
  return nextAccount;
};

export const validateLocalCredentials = ({ email, password, role }) => {
  const account = findLocalAccount({ email, role });
  if (!account) return null;
  if (String(account.password) !== String(password)) return null;
  return account;
};
