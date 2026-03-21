import React from 'react';
import "./actions.css";

export default function StreamActions(props) {
  return (
    <nav className="col-4 col-md-4 col-xs-12 offset-md-5 fixed-bottom rounded-0 stream-actions" style={{zIndex: 999}}>
            <div className="pull-right room-comm" hidden>
                <button className="btn btn-sm rounded-0 btn-no-effect mr-3 mb-4" id='toggle-video' title="Hide Video">
                    <i className="fa fa-video fa-3x text-app"></i>
                </button>

                <button className="btn btn-sm rounded-0 btn-no-effect mr-3 mb-4" id='toggle-mute' title="Mute">
                    <i className="fa fa-microphone-alt fa-3x text-app"></i>
                </button>

                <button className="btn btn-sm rounded-0 btn-no-effect mr-3 mb-4" id='share-screen' title="Share screen">
                    <i className="fa fa-desktop fa-3x text-app"></i>
                </button>

                <button className="btn btn-sm text-app pull-right btn-no-effect mr-3 mb-4" id='toggle-chat-pane'>
                    <i className="fa fa-comment fa-3x"></i> <span className="badge badge-danger very-small font-weight-lighter" id='new-chat-notification' hidden>New</span>
                </button>
            </div>
        </nav>
  );
}
