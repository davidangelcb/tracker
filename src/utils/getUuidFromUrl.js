export const getUuidFromUrl = () => {
  return window.location.pathname.replace("/", "").trim();
};
