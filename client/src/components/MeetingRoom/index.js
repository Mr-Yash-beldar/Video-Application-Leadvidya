import * as React from "react";
import { useEffect, useState } from "react";
import Header from "../HeaderPrimary";
import { loadEvents } from "../../helpers/events";
import { loadRtc, record } from "../../helpers/rtc";
import { setParticipantName } from "../../services/room";
import StreamActions from "../StreamActions";
import RecodringView from "./Recording";
import Button from "react-bootstrap/Button";

import "./room.css";
import { useParams, useHistory } from "react-router-dom";
const MeetingRoom = () => {
  const { meetingId } = useParams();
  const [isRecording, setIsRecording] = useState(false);
  let { push } = useHistory();

  useEffect(() => {
    if (!sessionStorage.getItem("username")) {
      setParticipantName("");
    }
    loadEvents();
    loadRtc(meetingId);
  }, [meetingId]);

  const startRecording = async (type) => {
    const isStarted = await record(type);
    console.log(isStarted);
    setIsRecording(isStarted);
  };

  const stopRecording = () => {
    record();
    setIsRecording(false);
  };

  return (
    <>
      <RecodringView />
      <Header>
        <div>
          {!isRecording && (
            <Button
              variant="outline-info"
              onClick={() => startRecording("media")}
              style={{ marginRight: 10, marginTop: 5 }}
            >
              Record Video
            </Button>
          )}
          {"  "}
          {!isRecording && (
            <Button
              variant="outline-info"
              onClick={() => startRecording("screen")}
              style={{ marginRight: 10, marginTop: 5 }}
            >
              Record Screen
            </Button>
          )}
          {"   "}
          {isRecording && (
            <Button
              variant="outline-danger"
              onClick={() => stopRecording()}
              style={{ marginRight: 10, marginTop: 5 }}
            >
              Stop Recording
            </Button>
          )}
          {"   "}
          <Button
            variant="danger"
            onClick={() => push("/")}
            style={{ marginRight: 10, marginTop: 5 }}
          >
            Leave Class
          </Button>
          {"  "}
        </div>
      </Header>

      <div className="container-fluid">
        <div className="row"></div>

        <div className="row">
          <div className="col-md-12 main" id="main-section">
            <video
              className="local-video mirror-mode"
              id="local"
              volume="0"
              autoPlay
              muted
            ></video>
            <div className="row mt-2 mb-2" id="videos"></div>
          </div>

          <div
            className="col-md-3 chat-col d-print-none mb-2 bg-app-secondary"
            id="chat-pane"
            hidden
          >
            <div className="row">
              <div className="col-12 text-center h2 mb-3">CHAT</div>
            </div>

            <div id="chat-messages"></div>

            <div className="row">
              <textarea
                id="chat-input"
                className="form-control rounded-0 chat-box border-info"
                rows="3"
                placeholder="Type here..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>
      <StreamActions />
    </>
  );
};

export default MeetingRoom;
