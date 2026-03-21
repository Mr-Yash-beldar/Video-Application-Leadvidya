import * as React from "react";
import { Navbar } from "react-bootstrap";

export const Footer = () => (
  <Navbar
    className="justify-content-around align-items-center lv-footer"
    expand="lg"
    sticky="bottom"
    variant="dark"
  >
    <div className="h6 text-white mb-0">&copy; LeadVidya Class 2026</div>
    <span className="h6 text-white mb-0">
      Secure teaching sessions powered by WebRTC
    </span>
    <span className="h6 text-white mb-0">
      Contact:{" "}
      <a className="text-white" href="mailto:admin@leadvidya.com">
        admin@leadvidya.com
      </a>
    </span>
  </Navbar>
);
