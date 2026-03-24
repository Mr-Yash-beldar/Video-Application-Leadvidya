const stream =
  ({ meetings, verifyAdminToken }) =>
  (socket) => {
    socket.on("subscribe", (data) => {
      const room = data && data.room ? String(data.room).trim() : "";
      const token = data && data.token ? data.token : "";
      const name = data && data.name ? data.name : "Guest";
      const accepted = data && data.accepted;

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

      if (!isAdmin && !accepted) {
        const existingWaiting = meeting.waiting.find((u) => u.socketId === data.socketId);
        if (!existingWaiting) {
          meeting.waiting.push({ socketId: data.socketId, name });
          socket.nsp.to(room).emit("update-participants", { participants: meeting.participants, waiting: meeting.waiting });
        }
        socket.emit("waiting-room");
        return;
      }

      meeting.participants.push({ socketId: data.socketId, name, isAdmin });

      socket.join(room);
      socket.join(data.socketId);

      socket.nsp.to(room).emit("update-participants", { participants: meeting.participants, waiting: meeting.waiting });

      const roomMembers = socket.adapter.rooms[room] ? socket.adapter.rooms[room].length : 0;
      if (roomMembers > 1) {
        socket.to(room).emit("new user", { socketId: data.socketId, name });
      }
    });

    socket.on("admit-user", (data) => {
      const { room, socketId } = data;
      const meeting = meetings.get(room);
      if (meeting) {
        meeting.waiting = meeting.waiting.filter((u) => u.socketId !== socketId);
        socket.to(socketId).emit("join-accepted");
        socket.nsp.to(room).emit("update-participants", { participants: meeting.participants, waiting: meeting.waiting });
      }
    });

    socket.on("reject-user", (data) => {
      const { room, socketId } = data;
      const meeting = meetings.get(room);
      if (meeting) {
        meeting.waiting = meeting.waiting.filter((u) => u.socketId !== socketId);
        socket.to(socketId).emit("meeting-error", { message: "Your request to join was declined." });
        socket.nsp.to(room).emit("update-participants", { participants: meeting.participants, waiting: meeting.waiting });
      }
    });

    socket.on("disconnect", () => {
      meetings.forEach((meeting) => {
        let changed = false;
        if (meeting.participants.find((p) => p.socketId === socket.id)) {
          meeting.participants = meeting.participants.filter((p) => p.socketId !== socket.id);
          changed = true;
        }
        if (meeting.waiting.find((p) => p.socketId === socket.id)) {
          meeting.waiting = meeting.waiting.filter((p) => p.socketId !== socket.id);
          changed = true;
        }
        if (changed) {
          socket.nsp.to(meeting.id).emit("update-participants", { participants: meeting.participants, waiting: meeting.waiting });
        }
      });
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
