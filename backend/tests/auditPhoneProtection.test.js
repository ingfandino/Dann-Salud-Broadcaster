"use strict";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret_change_me_123456";

const express = require("express");
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

jest.mock("../src/config/socket", () => ({
    emitNewAudit: jest.fn(),
    emitAuditUpdate: jest.fn(),
    emitFollowUpUpdate: jest.fn(),
    getIO: jest.fn(() => null),
}));

jest.mock("../src/services/notificationService", () => ({
    notifyAuditDeleted: jest.fn(),
    notifyAuditCreated: jest.fn(),
    notifyAuditCompleted: jest.fn(),
    notifyAuditQRDone: jest.fn(),
    notifyRecoveryAuditCompleted: jest.fn(),
}));

const User = require("../src/models/User");
const Audit = require("../src/models/Audit");
const auditRoutes = require("../src/routes/auditRoutes");
const { signToken } = require("../src/utils/jwt");

let mongoServer;
let app;

function buildApp() {
    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/audits", auditRoutes);
    return testApp;
}

async function createUser(overrides = {}) {
    const suffix = new mongoose.Types.ObjectId().toString();
    return User.create({
        username: `user-${suffix}`,
        nombre: overrides.nombre || "Test User",
        email: overrides.email || `user-${suffix}@test.com`,
        password: "password123",
        role: overrides.role || "gerencia",
        active: true,
        numeroEquipo: overrides.numeroEquipo,
        supervisor: overrides.supervisor,
    });
}

function auth(user) {
    return `Bearer ${signToken(user)}`;
}

function validAuditPayload(overrides = {}) {
    return {
        nombre: "Afiliado Test",
        cuil: "20123456789",
        telefono: "1123456789",
        tipoVenta: "alta",
        obraSocialVendida: "Binimed",
        scheduledAt: "2026-06-18T15:00:00.000Z",
        ...overrides,
    };
}

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    app = buildApp();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe("Audit telefono protection", () => {
    test("generic Audit PATCH rejects telefono and leaves stored phone unchanged", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({ createdBy: user._id, asesor: user._id }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}`)
            .set("Authorization", auth(user))
            .send({ datosExtra: "Nueva nota", telefono: "***" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/telefono no puede modificarse/i);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.datosExtra).toBe("");
    });

    test("clients cannot directly alter telefonoHistory", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({ createdBy: user._id, asesor: user._id }));

        const genericRes = await request(app)
            .patch(`/api/audits/${audit._id}`)
            .set("Authorization", auth(user))
            .send({ telefonoHistory: [{ newValue: "0000000000" }] });

        const dedicatedRes = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({ telefono: "1198765432", telefonoHistory: [{ newValue: "0000000000" }] });

        expect(genericRes.status).toBe(400);
        expect(dedicatedRes.status).toBe(400);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.telefonoHistory).toHaveLength(0);
    });

    test("restricted roles cannot use dedicated phone update", async () => {
        const manager = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({ createdBy: manager._id, asesor: manager._id }));

        for (const role of ["supervisor", "asesor", "auditor", "administrativo", "encargado", "recuperador", "independiente"]) {
            const user = await createUser({ role });
            const res = await request(app)
                .patch(`/api/audits/${audit._id}/telefono`)
                .set("Authorization", auth(user))
                .send({ telefono: "1198765432" });

            expect(res.status).toBe(403);
        }

        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.telefonoHistory).toHaveLength(0);
    });

    test.each(["gerencia", "desarrollador"])("%s can use dedicated phone update", async role => {
        const manager = await createUser({ role: "gerencia" });
        const user = role === "gerencia" ? manager : await createUser({ role, nombre: "Dev User" });
        const audit = await Audit.create(validAuditPayload({ createdBy: manager._id, asesor: manager._id }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({ telefono: "11 9876-5432", reason: "support correction", source: "manual.verified" });

        expect(res.status).toBe(200);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1198765432");
        expect(persisted.telefonoHistory).toHaveLength(1);
        expect(persisted.telefonoHistory[0]).toMatchObject({
            previousValue: "1123456789",
            newValue: "1198765432",
            changedByRole: role,
            source: "manual.verified",
        });
    });
});
