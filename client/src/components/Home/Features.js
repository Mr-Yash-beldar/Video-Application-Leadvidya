import React from "react";

export const Features = () => (
  <section className="lv-features p-5">
    <div className="container mt-4">
      <h3 className="text-center mb-5 text-white">LeadVidya Class Features</h3>
      <div className="row">
        <div className="col-md-4 col-12 text-center mt-2">
          <div className="col-md-6 d-block ml-auto mr-auto">
            <i className="fa fa-video fa-3x text-white p-5 lv-icon-circle"></i>
          </div>
          <div className="text-white p-2">Live Video Classes</div>
        </div>
        <div className="col-md-4 col-12 text-center mt-2">
          <div className="col-md-6 d-block ml-auto mr-auto">
            <i className="fas fa-microphone-alt fa-3x text-white p-5 lv-icon-circle"></i>
          </div>
          <div className="text-white p-2">Clear Audio Discussions</div>
        </div>
        <div className="col-md-4 col-12 text-center mt-2">
          <div className="col-md-6 d-block ml-auto mr-auto">
            <i className="fa fa-desktop fa-3x text-white p-5 lv-icon-circle"></i>
          </div>
          <div className="text-white p-2">Screen Sharing</div>
        </div>
      </div>
      <div className="row mt-0 mt-sm-5">
        <div className="clearfix col-md-1 d-none d-sm-block"></div>
        <div className="col-md-5 col-12 text-center mt-2">
          <div className="col-md-6 d-block ml-auto mr-auto">
            <i className="fa fa-compact-disc fa-3x text-white p-5 lv-icon-circle"></i>
          </div>
          <div className="text-white p-2">Class Recording</div>
        </div>
        <div className="col-md-4 col-12 text-center mt-2">
          <div className="col-md-6 d-block ml-auto mr-auto">
            <i className="fa fa-comment fa-3x text-white p-5 lv-icon-circle"></i>
          </div>
          <div className="text-white p-2">In-Class Chat</div>
        </div>
      </div>
    </div>
  </section>
);
