import API from "./api";

const unwrap = (response) => response?.data?.data ?? response?.data;

export const requestAssistantHelp = async ({ message, role, screen }) => {
  const res = await API.post("/assistant/help", {
    message,
    role,
    screen
  });

  return unwrap(res)?.reply || "";
};
