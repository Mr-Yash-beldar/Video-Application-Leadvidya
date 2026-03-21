const stream =
  ({ meetings, verifyAdminToken }) =>
  (socket) => {
    socket.on("subscribe", (data) => {
      const room = data && data.room ? String(data.room).trim() : "";
      const token = data && data.token ? data.token : "";

      if (!room) {
        socket.emit("meeting-error", { message: "Meeting ID is required" });
        return;
      }

      const meeting = meetings.get(room);
      const payload = token ? verifyAdminToken(token) : null;
      const isAdmin = !!(payload && payload.role === "admin");

      if (!meeting) {
        socket.emit("meeting-error", { message: "Meeting does not exist" });
        return;
      }

      if (!meeting.started && !isAdmin) {
        socket.emit("meeting-error", {
          message: "Meeting has not started yet",
        });
        return;
      }

      socket.join(room);
      socket.join(data.socketId);

      const roomMembers = socket.adapter.rooms[room];
      if (roomMembers && roomMembers.length > 1) {
        socket.to(room).emit("new user", { socketId: data.socketId });
      }
    });

    socket.on("newUserStart", (data) => {
      socket.to(data.to).emit("newUserStart", { sender: data.sender });
    });

    socket.on("sdp", (data) => {
      socket
        .to(data.to)
        .emit("sdp", { description: data.description, sender: data.sender });
    });

    socket.on("ice candidates", (data) => {
      socket
        .to(data.to)
        .emit("ice candidates", {
          candidate: data.candidate,
          sender: data.sender,
        });
    });

    socket.on("chat", (data) => {
      socket.to(data.room).emit("chat", { sender: data.sender, msg: data.msg });
    });
  };

module.exports = stream;
