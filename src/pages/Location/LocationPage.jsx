import React, { useEffect, useState } from "react";
import { useGlobalStore } from "../../store/useGlobalStore";
import useGeolocationPermission from "../../hooks/useGeolocationPermission";
import GeoStatus from "../../components/GeoStatus";
import PermissionBlockedModal from "../../components/PermissionBlockedModal";
import PhoneNumberScreen from "./components/PhoneNumberScreen";
import GoogleMapsLink from "../../components/GoogleMapsLink";
import { formatLongDateToMDY } from "../../utils/formatLongDateToMDY";
import { startJob } from "../../services/api";
import { convertUtcToTimezone } from "../../utils/dateTime";
import IconGps from "../../assets/images/icon-gps2.svg";
import IconInfo from "../../assets/images/icon-info3.svg";
import IconCheck from "../../assets/images/icon-check.svg";
import './LocationPage.css';

export default function LocationPage() {
  const initialConfig = useGlobalStore((state) => state.initialConfig);
  const uuid = useGlobalStore((state) => state.uuid);
  const status = useGlobalStore((s) => s.geoStatus);
  const setActiveMenu = useGlobalStore((s) => s.setActiveMenu);
  const setPhoneNumber = useGlobalStore((s) => s.setPhoneNumber);
  const jobStarted = useGlobalStore((s) => s.jobStarted);
  const setJobStarted = useGlobalStore((s) => s.setJobStarted);
  
  const startJobInfo = useGlobalStore(s => s.startJobInfo);
  const setStartJobInfo = useGlobalStore((s) => s.setStartJobInfo);
  const hasStartInfo = Object.keys(startJobInfo).length > 0;
  
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    requestPermission,
    showBlockedModal,
    setShowBlockedModal,
    deviceType,
  } = useGeolocationPermission();

  useEffect(() => {
    if (status === "prompt") requestPermission();
  }, [status]);

  // Función Start Job
  const handleStartJob = async () => {
    if (!isPhoneValid || loading) return;

    setLoading(true);

    try {
      const res = await startJob(uuid);

      if (res.acknowledged) {
        useGlobalStore.getState().setStartJobInfo(res);
        // setStartJobInfo(res);
        // useGlobalStore.setState({ initialConfig: { ...initialConfig, tab: "evidence" } });
        useGlobalStore.setState((state) => ({
          initialConfig: {
            ...state.initialConfig,
            tab: "evidence",
            startJobInfo: res,
          }
        }));

        setPhoneNumber(localPhone);
        setJobStarted(true);
        setActiveMenu("evidence");
        
      } else {
        alert("Failed to start the job. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while connecting to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      {/* WRAPPER QUE OCUPA LA ALTURA TOTAL DEL VIEWPORT */}
      <div className="d-flex flex-column" style={{ minHeight: "65vh" }}>

        <div className="p-3 pt-0 pt-3 flex-grow-0">

          <PhoneNumberScreen
              disabled={
                jobStarted ||
                initialConfig.tab === "evidence" ||
                initialConfig.tab === "summary"
              }
              defaultValue={
                startJobInfo?.phone
                  ? startJobInfo.phone
                  : useGlobalStore.getState().phoneNumber || ""
              }
              onValidChange={(valid, value) => {
                setIsPhoneValid(valid);
                setLocalPhone(value);
                if (valid) setPhoneNumber(value);
              }}
            />
<hr />
          <div className="mt-2">

            <div className="">
              <img src={IconGps} alt="" style={{ height: 15 }} className="pe-2" />
              <GoogleMapsLink lat={initialConfig.propertyLocation.geo.coordinates[1]} lng={initialConfig.propertyLocation.geo.coordinates[0]} className="fw-600 fs-14">
                {initialConfig.propertyName}
              </GoogleMapsLink>

              {initialConfig?.unit?.trim() !== "" && (
                <p className="mb-0 text-secondary fs-14">
                  Unit {initialConfig.unit}
                </p>
              )}

              {/*
              <p className="mb-0 text-secondary fs-14">
                {initialConfig.propertyLocation.address1 +
                  " " +
                  initialConfig.propertyLocation.city +
                  " " +
                  initialConfig.propertyLocation.postalCode}
                <br /> {initialConfig.unit}
              </p>
              */}
            </div>

            <hr />
            
            <div className="row general-info">
              <div className="col-6">
                <p className="mb-1 fw-semibold fs-14">Cleaning Type</p>
                <p className="text-secondary">{initialConfig.service}</p>
              </div>

              <div className="col-6 d-flex">
                <div
                  style={{
                    height: "80%",
                    marginRight: "12px",
                    border: ".5px solid #ddddddff"
                  }}
                ></div>

                <div>
                  <p className="mb-1 fw-semibold fs-14">Scheduled</p>
                  <p className="text-secondary">
                    {formatLongDateToMDY(initialConfig.scheduleDate)}
                  </p>
                </div>
              </div>

              <div className="col-12">
                <p className="mb-1 fw-semibold fs-14">Special Instructions</p>
                <p className="text-secondary mb-1">
                  To review the specifications, please check the job in your account.
                </p>
              </div>
            </div>

          </div>

          <br />

        </div>

        <div className="al-footer mt-auto p-3 pt-0">
          {hasStartInfo && (
            <div
              className="d-flex align-items-center p-3 rounded-0 mb-4 w-100 notif-location-share py-2"
              style={{ backgroundColor: "#EDFFF2" }}
            >
              <img src={IconCheck} alt="" style={{ height: 25 }} className="pe-2 d-flex align-items-center justify-content-center me-3" />

              <div style={{ color: "#23A756" }} className="fw-semibold">
                {/*<p className="mb-0">{startJobInfo.date} - {startJobInfo.time} - {startJobInfo.state}</p>*/}
                <p className="mb-0">{convertUtcToTimezone(startJobInfo.dateUp, initialConfig.timezone)} - {startJobInfo.state}</p>
              </div>
            </div>
          )}
          
          {(status !== "granted" && (initialConfig.tab !== 'evidence' && initialConfig.tab !== 'summary')) && (
            <div
              className="d-flex align-items-center p-3 rounded-0 mb-4 w-100 notif-location-share py-2"
              style={{ backgroundColor: "#FFF7E0" }}
            >
              <img src={IconInfo} alt="" style={{ height: 25 }} className="pe-2 d-flex align-items-center justify-content-center me-3" />

              <div>
                <p className="mb-0">Your location is not shared.</p>
                <p className="mb-0">Turn it on in your device settings to proceed.</p>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="d-flex gap-3">
            <GeoStatus
              status={status}
              onRequest={requestPermission}
              disabled={jobStarted || initialConfig.tab !== "location"}
            />

            <button
              className="btn w-50 fw-semibold text-white rounded-0 fs-14"
              style={{
                backgroundColor:
                  isPhoneValid &&
                  !jobStarted &&
                  initialConfig.tab === "location" &&
                  !loading
                    ? "#0088FF"
                    : "#b6b6b6ff",
                border: "none",
                padding: "12px 0",
              }}
              disabled={
                !isPhoneValid ||
                loading ||
                jobStarted ||
                initialConfig.tab !== "location"
              }
              onClick={handleStartJob}
            >
              {initialConfig.tab !== "location"
                ? "Job Started"
                : loading
                ? "Starting..."
                : "Start Job"}
            </button>

          </div>
        </div>

        <PermissionBlockedModal
          open={showBlockedModal}
          deviceType={deviceType}
          onClose={() => setShowBlockedModal(false)}
        />
      </div>

      <p className="bg-light text-secondary small py-2 px-3 my-0" style={{fontSize: 12}}>
        Photos are mandatory to complete the job and receive payment.
      </p>

    </>
  );
}
