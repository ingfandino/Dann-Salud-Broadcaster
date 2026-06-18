"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const request = require("supertest");

process.env.ENABLE_VIDEO_AUDIT_MVP = "true";
process.env.ENABLE_VIDEO_AUDIT_ROOM_MVP = "true";

jest.mock("../src/middlewares/authMiddleware", () => ({
    requireAuth: (req, _res, next) => {
        req.user = { _id: "user-test-id", role: "auditor" };
        next();
    }
}));

jest.mock("../src/middlewares/roleMiddleware", () => ({
    permit: () => (_req, _res, next) => next()
}));

jest.mock("../src/controllers/videoAuditController", () => ({
    getVideoAudit: jest.fn((_req, res) => res.status(200).json({ status: "empty", isLocked: false })),
    uploadVideoAudit: jest.fn((_req, res) => res.status(200).json({ message: "uploaded" })),
    downloadVideo: jest.fn((_req, res) => res.status(204).end()),
    downloadAudio: jest.fn((_req, res) => res.status(204).end()),
    createOrGetRoom: jest.fn((_req, res) => res.status(200).json({
        message: "Room created successfully",
        room: {
            roomId: "room-test-id",
            shortCode: "ABCDEFGH",
            publicUrl: "https://dannsalud.com.ar/va/ABCDEFGH"
        }
    })),
    sendInvitation: jest.fn((_req, res) => res.status(503).json({
        ok: false,
        sendStatus: "not_connected",
        code: "WHATSAPP_NOT_CONNECTED"
    })),
    getPublicRoom: jest.fn((req, res) => {
        if (req.params.publicToken === "missing") {
            return res.status(404).json({ error: "Room not found" });
        }
        return res.status(200).json({
            roomStatus: "created",
            affiliateFirstName: null,
            organizationName: "Dann Salud",
            expiresAt: null
        });
    }),
    joinPublicRoom: jest.fn((_req, res) => res.status(200).json({
        message: "Joined successfully",
        roomStatus: "affiliate_joined",
        affiliateJoinedAt: "2026-06-18T00:00:00.000Z"
    }))
}));

const videoAuditController = require("../src/controllers/videoAuditController");
const videoAuditRoutes = require("../src/routes/videoAuditRoutes");

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/video-audits", videoAuditRoutes);
    app.use("/api/*", (_req, res) => res.status(404).json({ error: "API no encontrada" }));
    return app;
}

describe("VideoAudit API route contract", () => {
    let app;

    beforeEach(() => {
        app = buildApp();
        jest.clearAllMocks();
    });

    test("routes/index.js mounts VideoAudit before the global requireAuth middleware", () => {
        const routeIndex = fs.readFileSync(path.join(__dirname, "../src/routes/index.js"), "utf8");

        expect(routeIndex).toContain('require("./videoAuditRoutes")');
        expect(routeIndex).toContain('router.use("/video-audits", videoAuditRoutes)');
        expect(routeIndex.indexOf('router.use("/video-audits", videoAuditRoutes)'))
            .toBeLessThan(routeIndex.indexOf("router.use(requireAuth)"));
    });

    test("GET /api/video-audits/:auditId reaches the VideoAudit controller", async () => {
        const res = await request(app).get("/api/video-audits/6a33f4394eecd259e0b17bfb");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "empty", isLocked: false });
        expect(videoAuditController.getVideoAudit).toHaveBeenCalledTimes(1);
    });

    test("POST /api/video-audits/:auditId/room reaches the room controller", async () => {
        const res = await request(app)
            .post("/api/video-audits/6a33f4394eecd259e0b17bfb/room")
            .send({ publicBaseUrl: "https://dannsalud.com.ar" });

        expect(res.status).toBe(200);
        expect(res.body.room.publicUrl).toBe("https://dannsalud.com.ar/va/ABCDEFGH");
        expect(videoAuditController.createOrGetRoom).toHaveBeenCalledTimes(1);
    });

    test("public short-link lookup is mounted before global authentication", async () => {
        const res = await request(app).get("/api/video-audits/public/ABCDEFGH");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ roomStatus: "created", organizationName: "Dann Salud" });
        expect(videoAuditController.getPublicRoom).toHaveBeenCalledTimes(1);
    });

    test("missing public room returns application 404 instead of API route 404", async () => {
        const res = await request(app).get("/api/video-audits/public/missing");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Room not found" });
        expect(videoAuditController.getPublicRoom).toHaveBeenCalledTimes(1);
    });

    test("public join endpoint remains registered", async () => {
        const res = await request(app).post("/api/video-audits/public/ABCDEFGH/join");

        expect(res.status).toBe(200);
        expect(res.body.roomStatus).toBe("affiliate_joined");
        expect(videoAuditController.joinPublicRoom).toHaveBeenCalledTimes(1);
    });

    test("recording download routes remain registered", async () => {
        const video = await request(app).get("/api/video-audits/6a33f4394eecd259e0b17bfb/download/video");
        const audio = await request(app).get("/api/video-audits/6a33f4394eecd259e0b17bfb/download/audioBackup");

        expect(video.status).toBe(204);
        expect(audio.status).toBe(204);
        expect(videoAuditController.downloadVideo).toHaveBeenCalledTimes(1);
        expect(videoAuditController.downloadAudio).toHaveBeenCalledTimes(1);
    });

    test("WhatsApp invitation route imports and reaches controller without sending messages", async () => {
        const res = await request(app)
            .post("/api/video-audits/6a33f4394eecd259e0b17bfb/room/send-invitation")
            .send({});

        expect(res.status).toBe(503);
        expect(res.body.code).toBe("WHATSAPP_NOT_CONNECTED");
        expect(videoAuditController.sendInvitation).toHaveBeenCalledTimes(1);
    });
});
