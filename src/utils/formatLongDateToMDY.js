// Ejemplo recibido: "Wednesday, November 26th, 2025"
export const formatLongDateToMDY = (dateString) => {
  const cleaned = dateString
    .replace(/^[A-Za-z]+,\s*/, "")
    .replace(/(st|nd|rd|th)/, "");
    
  const date = new Date(cleaned);

  if (isNaN(date)) return null;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
};
