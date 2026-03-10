import API from "./api";

const unwrap = (response) => response?.data?.data ?? response?.data;

export const createBooking = async (payload) => {
  const res = await API.post("/bookings", payload);
  return unwrap(res);
};

export const getCustomerBookings = async (customerId) => {
  const res = await API.get(`/bookings/customer/${customerId}`);
  return unwrap(res) || [];
};

export const getProviderBookings = async (providerId) => {
  const res = await API.get(`/bookings/provider/${providerId}`);
  return unwrap(res) || [];
};

export const updateBookingStatus = async (bookingId, status) => {
  const res = await API.patch(`/bookings/${bookingId}/status`, { status });
  return unwrap(res);
};

export const getDashboardStats = async (userId) => {
  const res = await API.get(`/dashboard/stats/${userId}`);
  return unwrap(res);
};

