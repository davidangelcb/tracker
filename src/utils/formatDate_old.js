export function formatToEST(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  const month = date.toLocaleString("en-US", { month: "short" }); // Ej: "Dec"
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(0);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
}
