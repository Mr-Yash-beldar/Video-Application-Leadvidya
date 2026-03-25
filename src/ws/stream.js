const stream =
  ({ meetings, verifyAdminToken }) =>
  (socket) => {
    // Each socket immediately joins its own private room for direct messaging
    socket.join(socket.id);

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
        socket.emit("meeting-error", { message: "Meeting has not started yet" });
        return;
      }

      // ── Guest waiting queue ─────────────────────────────────────────────
      if (!isAdmin && !accepted) {
        // Use server-authoritative socket.id as the socketId
        const alreadyWaiting = meeting.waiting.find((u) => u.socketId === socket.id);
        if (!alreadyWaiting) {
          meeting.waiting.push({ socketId: socket.id, name });
        }

        // Broadcast updated waiting list to everyone in the room (host included)
        const uniqueWaiting = dedup(meeting.waiting);
        const uniqueParticipants = dedup(meeting.participants);
        socket.nsp.to(room).emit("update-participants", {
          participants: uniqueParticipants,
          waiting: uniqueWaiting,
        });

        socket.emit("waiting-room");
        return;
      }

      // ── Joining as participant ──────────────────────────────────────────
      if (!meeting.participants.find((p) => p.socketId === socket.id)) {
        meeting.participants.push({ socketId: socket.id, name, isAdmin });
      }

      // Remove from waiting list if they were admitted
      meeting.waiting = meeting.waiting.filter((u) => u.socketId !== socket.id);

      socket.join(room);

      const uniqueWaiting = dedup(meeting.waiting);
      const uniqueParticipants = dedup(meeting.participants);
      socket.nsp.to(room).emit("update-participants", {
        participants: uniqueParticipants,
        waiting: uniqueWaiting,
      });

      // Notify existing room members about the new peer
      const roomSockets = Object.keys(socket.adapter.rooms[room]
        ? socket.adapter.rooms[room].sockets || {}
        : {});
      if (roomSockets.length > 1) {
        socket.to(room).emit("new user", { socketId: socket.id, name });
      }
    });

    // ── Admit user ──────────────────────────────────────────────────────────
    socket.on("admit-user", (data) => {
      const { room, socketId } = data;
      const meeting = meetings.get(room);
      if (!meeting) return;

      // Remove from waiting list
      meeting.waiting = meeting.waiting.filter((u) => u.socketId !== socketId);

      // Notify the specific guest directly via their private room
      socket.nsp.to(socketId).emit("join-accepted");

      // Broadcast updated participant + waiting lists to all room members
      socket.nsp.to(room).emit("update-participants", {
        participants: dedup(meeting.participants),
        waiting: dedup(meeting.waiting),
      });
    });

    // ── Reject user ─────────────────────────────────────────────────────────
    socket.on("reject-user", (data) => {
      const { room, socketId } = data;
      const meeting = meetings.get(room);
      if (!meeting) return;

      meeting.waiting = meeting.waiting.filter((u) => u.socketId !== socketId);

      socket.nsp
        .to(socketId)
        .emit("meeting-error", { message: "Your request to join was declined." });

      socket.nsp.to(room).emit("update-participants", {
        participants: dedup(meeting.participants),
        waiting: dedup(meeting.waiting),
      });
    });

    // ── Disconnect ──────────────────────────────────────────────────────────
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
          socket.nsp.to(meeting.id).emit("update-participants", {
            participants: dedup(meeting.participants),
            waiting: dedup(meeting.waiting),
          });
        }
      });
    });

    // ── WebRTC signaling ────────────────────────────────────────────────────
    socket.on("newUserStart", (data) => {
      socket.to(data.to).emit("newUserStart", { sender: data.sender });
    });

    socket.on("sdp", (data) => {
      socket.to(data.to).emit("sdp", {
        description: data.description,
        sender: data.sender,
      });
    });

    socket.on("ice candidates", (data) => {
      socket.to(data.to).emit("ice candidates", {
        candidate: data.candidate,
        sender: data.sender,
      });
    });

    socket.on("chat", (data) => {
      socket.to(data.room).emit("chat", { sender: data.sender, msg: data.msg });
    });
  };

// Deduplicate by socketId, latest entry wins
function dedup(arr) {
  return Array.from(new Map(arr.map((u) => [u.socketId, u])).values());
}

module.exports = stream;
