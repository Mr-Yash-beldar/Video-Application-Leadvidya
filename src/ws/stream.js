const jwt = require("jsonwebtoken");
const Meeting = require("../../models/Meeting");

const stream = ({ verifyAdminToken }) => (socket) => {
  // Each socket immediately joins its own private room for direct messaging
  socket.join(socket.id);

  socket.on("subscribe", async (data) => {
    try {
      const room = data && data.room ? String(data.room).trim() : "";
      const name = data && data.name ? data.name : "Guest";
      const token = data && data.token ? data.token : ""; // In Socket IO v2 the token comes through event payload usually.

      if (!room) {
        socket.emit("meeting-error", { message: "Meeting ID is required" });
        return;
      }

      // 1. Verify Authentication & Role
      const payload = token ? verifyAdminToken(token) : null;
      const isAdmin = !!(payload && payload.role === "admin");
      
      // Store on socket instance for disconnection handling
      socket.userRole = isAdmin ? "admin" : "guest";
      socket.userName = name;

      // 2. Fetch Meeting from MongoDB
      const meeting = await Meeting.findOne({ meetingId: room });
      if (!meeting) {
        socket.emit("meeting-error", { message: "Meeting does not exist" });
        return;
      }

      if (meeting.status !== "active" && !isAdmin) {
        socket.emit("meeting-error", { message: "Meeting has not started yet" });
        return;
      }

      // 3. Guest waiting queue logic (Atomic pushes to DB)
      if (!isAdmin && !(data && data.accepted)) {
        // Atomic Add to waiting list unless already admitted
        const existingParticipant = meeting.participants.find(p => p.socketId === socket.id);
        
        if (!existingParticipant) {
           await Meeting.findOneAndUpdate(
            { meetingId: room },
            { 
              $push: { 
                participants: { socketId: socket.id, name, role: "guest", status: "in_waiting_room" } 
              } 
            }
          );
        }

        const updatedMeeting = await Meeting.findOne({ meetingId: room });
        
        const waiting = updatedMeeting.participants.filter(p => p.status === "in_waiting_room");
        const activeParticipants = updatedMeeting.participants.filter(p => p.status === "admitted");

        // Broadcast to host
        socket.nsp.to(room).emit("update-participants", {
          participants: activeParticipants,
          waiting: waiting,
        });

        socket.emit("waiting-room");
        return;
      }

      // 4. Joining as participant / Admin
      const pStatus = "admitted";
      await Meeting.findOneAndUpdate(
        { meetingId: room },
        { 
          // Pull existing to prevent duplicates
          $pull: { participants: { socketId: socket.id } } 
        }
      );
      
      await Meeting.findOneAndUpdate(
        { meetingId: room },
        { 
          $push: { 
            participants: { socketId: socket.id, name, role: isAdmin ? "admin" : "guest", status: pStatus } 
          } 
        }
      );

      socket.join(room);

      const latestMeeting = await Meeting.findOne({ meetingId: room });
      const currentWaiting = latestMeeting.participants.filter(p => p.status === "in_waiting_room");
      const currentActive = latestMeeting.participants.filter(p => p.status === "admitted");

      socket.nsp.to(room).emit("update-participants", {
        participants: currentActive,
        waiting: currentWaiting,
      });

      // Notify existing room members
      const roomSockets = Object.keys(socket.adapter.rooms[room]
        ? socket.adapter.rooms[room].sockets || {}
        : {});
      if (roomSockets.length > 1) {
        socket.to(room).emit("new user", { socketId: socket.id, name });
      }

    } catch (error) {
       console.error("Subscribe Error:", error);
       socket.emit("meeting-error", { message: "Server encountered an error while subscribing." });
    }
  });

  socket.on("admit-user", async (data) => {
    try {
      const { room, socketId } = data;
      const meeting = await Meeting.findOne({ meetingId: room });
      if (!meeting) return;

      // Update status atomically
      await Meeting.findOneAndUpdate(
        { meetingId: room, "participants.socketId": socketId },
        { $set: { "participants.$.status": "admitted" } }
      );

      // Notify the specific guest
      socket.nsp.to(socketId).emit("join-accepted");

      const latestMeeting = await Meeting.findOne({ meetingId: room });
      socket.nsp.to(room).emit("update-participants", {
        participants: latestMeeting.participants.filter(p => p.status === "admitted"),
        waiting: latestMeeting.participants.filter(p => p.status === "in_waiting_room"),
      });

    } catch (error) {
       console.error("Admit Error:", error);
    }
  });

  socket.on("reject-user", async (data) => {
    try {
      const { room, socketId } = data;
      const meeting = await Meeting.findOne({ meetingId: room });
      if (!meeting) return;

      await Meeting.findOneAndUpdate(
        { meetingId: room },
        { $pull: { participants: { socketId: socketId } } }
      );

      socket.nsp
        .to(socketId)
        .emit("meeting-error", { message: "Your request to join was declined." });

      const latestMeeting = await Meeting.findOne({ meetingId: room });
      socket.nsp.to(room).emit("update-participants", {
        participants: latestMeeting ? latestMeeting.participants.filter(p => p.status === "admitted") : [],
        waiting: latestMeeting ? latestMeeting.participants.filter(p => p.status === "in_waiting_room") : [],
      });

    } catch (error) {
      console.error("Reject Error:", error);
    }
  });

  socket.on("disconnect", async () => {
    try {
      // Find meetings this socket is in and pull them out of participants array globally
      const affectedMeetings = await Meeting.find({ "participants.socketId": socket.id });
      
      await Meeting.updateMany(
        { "participants.socketId": socket.id },
        { $pull: { participants: { socketId: socket.id } } }
      );

      // Broadcast update to all rooms the user was physically part of
      for (const meeting of affectedMeetings) {
        const latestMeeting = await Meeting.findOne({ _id: meeting._id });
        if (latestMeeting) {
           socket.nsp.to(latestMeeting.meetingId).emit("update-participants", {
              participants: latestMeeting.participants.filter(p => p.status === "admitted"),
              waiting: latestMeeting.participants.filter(p => p.status === "in_waiting_room"),
           });
        }
      }
    } catch (error) {
      console.error("Disconnect Error:", error);
    }
  });

  // ── WebRTC signaling (Restored) ────────────────────────────────────────────────────
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

  // ── Chat Signaling ────────────────────────────────────────────────────
  socket.on("chat", (data) => {
    socket.to(data.room).emit("chat", { sender: data.sender, msg: data.msg });
  });
};

module.exports = stream;
