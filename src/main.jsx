import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/styles/global.css'
import './assets/styles/fonts.css';
import App from './App.jsx'
import Initializer from "./bootstrap/Initializer.jsx";
import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent'

const isDev = import.meta.env.DEV;

// solo para dev
const strictEnv = import.meta.env.VITE_STRICT_MODE;

const enableStrict =
  isDev && strictEnv !== "false";

const AppTree = (
  <Initializer>
    <App />
  </Initializer>
);

/* NEW RELIC AGENT  - BEGIN */
const RUN_NR = import.meta.env.VITE_ACTIVE_NR_AGENT;

const options = {
  info: {
    applicationID: '1120462916',
    licenseKey: 'NRJS-be1690fc2b60d6fe84f',
  },
  init: {
    logging: { enabled: false },
    session_replay: { enabled: false },
  },
  // loader_config: { ... }
}
RUN_NR === 'YES' ? new BrowserAgent(options) : null;
/* NEW RELIC AGENT -  END*/

createRoot(document.getElementById("root")).render(
  enableStrict ? <StrictMode>{AppTree}</StrictMode> : AppTree
);