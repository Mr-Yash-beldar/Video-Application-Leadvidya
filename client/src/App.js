import React from "react";
import "./App.css";
import { Home } from "./components/Home";
import { Features } from "./components/Home/Features";
import Header from "./components/HeaderPrimary";
import { Footer } from "./components/Footer";
import { PrivateMeeting } from "./components/Home/PrivateMeeting";
import Button from "react-bootstrap/Button";
import { useHistory } from "react-router-dom";

function App(props) {
  const history = useHistory();

  return (
    <>
      <Header>
        <Button
          variant="outline-light"
          onClick={() => history.push("/private")}
        >
          Join with Meeting ID
        </Button>
      </Header>

      <section className="lv-hero" id="room-create">
        <div className="container py-5">
          <div className="row align-items-center">
            <div className="col-12 col-lg-7 mb-4 mb-lg-0">
              <div className="lv-chip">LeadVidya Class Platform</div>
              <h1 className="lv-title mt-3">
                Live classes that feel focused, secure, and ready in seconds.
              </h1>
              <p className="lv-subtitle mt-3">
                Admin creates and starts meetings. Learners join instantly with
                meeting ID. Video, audio, chat, and recording are built in.
              </p>
              <div className="mt-4">
                <Button
                  className="lv-btn-primary mr-2"
                  onClick={() => history.push("/private")}
                >
                  Join Class
                </Button>
                <Button
                  className="lv-btn-ghost"
                  onClick={() =>
                    window.scrollTo({ top: 760, behavior: "smooth" })
                  }
                >
                  View Features
                </Button>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="lv-preview-card">
                <div className="lv-preview-head">Today at LeadVidya</div>
                <div className="lv-preview-item">
                  <span className="lv-dot"></span>
                  Admin Console with JWT Authentication
                </div>
                <div className="lv-preview-item">
                  <span className="lv-dot"></span>
                  Access Control: only admin can create/start
                </div>
                <div className="lv-preview-item">
                  <span className="lv-dot"></span>
                  Public Join: learners can join once class starts
                </div>
              </div>
            </div>
          </div>

          <div className="row mt-4 lv-panels-row">
            <div className="col-12 col-lg-6 mb-3">
              <PrivateMeeting />
            </div>
            <div className="col-12 col-lg-6 mb-3">
              <Home />
            </div>
          </div>
        </div>
      </section>

      <Features />
      {props.location.pathname === "/" && !props.location.search && <Footer />}
    </>
  );
}

export default App;
