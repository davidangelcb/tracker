import React, { useState, useEffect } from "react";
import "./PhoneNumberScreen.css";
import FlagUsa from "../../../assets/images/flag-usa.svg";

export default function PhoneNumberScreen({ 
  onValidChange, 
  disabled = false,
  defaultValue = ""
}) {
  const [phone, setPhone] = useState(defaultValue);

  // Limpia todo lo que NO sea dígitos
  const cleanDigits = (value) => value.replace(/\D/g, "");

  // Formatea al estilo USA: (XXX) XXX-XXXX
  const formatUSPhone = (digits) => {
    const cleaned = digits.slice(0, 10); // Máx 10 dígitos (USA)
    const len = cleaned.length;

    if (len === 0) return "";
    if (len < 4) return `(${cleaned}`;
    if (len < 7) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  };

  // Regex estricta USA
  const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/;

  const digitsOnly = cleanDigits(phone);
  const isValid = phoneRegex.test(formatUSPhone(digitsOnly));

  // Actualizar si defaultValue cambia
  useEffect(() => {
    if (defaultValue && defaultValue.trim() !== "") {
      const digits = cleanDigits(defaultValue);
      setPhone(formatUSPhone(digits));
    }
  }, [defaultValue]);

  // Avisar al parent
  useEffect(() => {
    onValidChange(isValid, cleanDigits(phone)); // Envia solo dígitos
  }, [isValid, phone]);

  return (
    <div className="pt-1">
      <h5 className="fw-semibold mb-2 fs-14">
        Tell us who's on site today
      </h5>

      <div className="phone-wrapper d-flex align-items-center">
        <img src={FlagUsa} alt="flag" className="flag-img" />
        <span className="px-2">+1</span>

        <input
          type="tel"
          className="form-control phone-input rounded-0"
          value={phone}
          onChange={(e) => {
            const digits = cleanDigits(e.target.value);
            setPhone(formatUSPhone(digits));
          }}
          placeholder="(555) 555-5555"
          disabled={disabled}
        />
      </div>

      <span className="fs-11">Enter an onsite teammate mobile number to <strong>Start Job</strong></span>
    </div>
  );
}
