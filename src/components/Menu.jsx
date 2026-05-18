import React from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useGlobalStore } from "../store/useGlobalStore";

export default function Menu() {
  const {
    activeMenu,
    setActiveMenu,
    evidenceCompleted,
    initialConfig,
    jobStatus,
  } = useGlobalStore();

  const isVideoMode = initialConfig?.mode === "videos";
  const resolvedSummaryMenuId = isVideoMode ? "summary-video" : "summary";

  const menus = [
    { id: "location", label: "Location", icon: "bi-cursor-fill" },
    { id: "evidence", label: "Before/After", icon: "bi-image" },
    { id: "summary", label: "Summary", icon: "bi-card-text" },
  ];

  const isJobCompleted =
    initialConfig?.jobStatus === "completed" || jobStatus === "completed";

  // Si el job ya está completed, el límite real debe ser summary
  const tabLimit = isJobCompleted ? "summary" : (initialConfig?.tab || "location");
  const tabOrder = ["location", "evidence", "summary"];

  // Mapear activeMenu real a la opción visual del menú
  const effectiveActiveMenu = (() => {
    if (activeMenu === "summary-video") return "summary";

    if (isJobCompleted && activeMenu !== "location") {
      return "summary";
    }

    return activeMenu;
  })();

  const isMenuEnabled = (menuId) => {
    if (tabOrder.indexOf(menuId) > tabOrder.indexOf(tabLimit)) return false;

    switch (menuId) {
      case "location":
        return true;

      case "evidence":
        // Si ya está completed, no debe poder volver a Evidence
        if (isJobCompleted) return false;

        return !evidenceCompleted && initialConfig?.tab === "evidence";

      case "summary":
        // Summary disponible si ya completó, o si backend ya lo trae completed
        return (
          evidenceCompleted ||
          initialConfig?.tab === "summary" ||
          isJobCompleted
        );

      default:
        return false;
    }
  };

  const handleMenuClick = (menuId, enabled) => {
    if (!enabled) return;

    if (menuId === "summary") {
      setActiveMenu(resolvedSummaryMenuId);
      return;
    }

    setActiveMenu(menuId);
  };

  return (
    <div className="main-menu d-flex justify-content-around bg-primary py-0">
      {menus.map((menu) => {
        const isActive = effectiveActiveMenu === menu.id;
        const enabled = isMenuEnabled(menu.id);

        return (
          <button
            key={menu.id}
            className={`btn d-flex flex-column align-items-center border-0 ${
              isActive ? "text-white" : "text-light opacity-50"
            }`}
            disabled={!enabled}
            onClick={() => handleMenuClick(menu.id, enabled)}
            style={{
              cursor: enabled ? "pointer" : "default",
              pointerEvents: enabled ? "auto" : "none",
            }}
          >
            <i className={`bi ${menu.icon} mb-1 fs-3`}></i>
            <span className="small fw-semibold">{menu.label}</span>
          </button>
        );
      })}
    </div>
  );
}
