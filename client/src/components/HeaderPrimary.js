import * as React from "react";
import { Navbar } from "react-bootstrap";

const Header = ({ children }) => (
  <Navbar
    className="justify-content-between lv-topbar"
    expand="lg"
    sticky="top"
    variant="dark"
  >
    <Navbar.Brand href="/">
      <span className="lv-brand">LeadVidya Class</span>
    </Navbar.Brand>
    {children || null}
  </Navbar>
);

export default Header;
