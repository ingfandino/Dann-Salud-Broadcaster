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

jest.mock("../src/services/documentProcessingCase.service", () => ({
    maybeCreateFromAudit: jest.fn(),
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
        telefono: "11 2345-6789",
        tipoVenta: "alta",
        obraSocialAnterior: "OS Test",
        obraSocialVendida: "Binimed",
        scheduledAt: "2026-06-18T15:00:00.000Z",
        ...overrides,
    };
}

async function insertHistoricalInvalidAudit(overrides = {}) {
    const _id = overrides._id || new mongoose.Types.ObjectId();
    const now = new Date("2026-06-18T15:00:00.000Z");
    const doc = {
        _id,
        nombre: "Afiliado Historico",
        cuil: `20${String(_id).slice(-9)}`,
        telefono: "***",
        tipoVenta: "alta",
        obraSocialVendida: "Binimed",
        scheduledAt: now,
        status: "Pendiente",
        statusUpdatedAt: now,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
    await Audit.collection.insertOne(doc);
    return doc;
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
    test("Audit creation rejects masked placeholder", async () => {
        const user = await createUser({ role: "gerencia" });

        const res = await request(app)
            .post("/api/audits")
            .set("Authorization", auth(user))
            .send(validAuditPayload({ telefono: "***" }));

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/enmascarados/i);
        expect(await Audit.countDocuments()).toBe(0);
    });

    test("Audit creation rejects phones with fewer or more than 10 digits", async () => {
        const user = await createUser({ role: "gerencia" });

        const shortRes = await request(app)
            .post("/api/audits")
            .set("Authorization", auth(user))
            .send(validAuditPayload({ cuil: "20123456780", telefono: "112345678" }));

        const longRes = await request(app)
            .post("/api/audits")
            .set("Authorization", auth(user))
            .send(validAuditPayload({ cuil: "20123456781", telefono: "541123456789" }));

        expect(shortRes.status).toBe(400);
        expect(longRes.status).toBe(400);
        expect(await Audit.countDocuments()).toBe(0);
    });

    test("Audit creation normalizes valid formatted phones and records created history", async () => {
        const user = await createUser({ role: "gerencia", nombre: "Gerencia Test", email: "gerencia@test.com" });

        const res = await request(app)
            .post("/api/audits")
            .set("Authorization", auth(user))
            .send(validAuditPayload({ telefono: "(11) 2345-6789" }));

        expect(res.status).toBe(201);
        const audit = await Audit.findById(res.body._id).lean();
        expect(audit.telefono).toBe("1123456789");
        expect(audit.telefonoHistory).toHaveLength(1);
        expect(audit.telefonoHistory[0]).toMatchObject({
            previousValue: null,
            newValue: "1123456789",
            changedByName: "Gerencia Test",
            changedByEmail: "gerencia@test.com",
            changedByRole: "gerencia",
            eventType: "created",
        });
    });

    test("Bulk import reports invalid masked phone placeholders", async () => {
        const user = await createUser({ role: "gerencia" });

        const res = await request(app)
            .post("/api/audits/bulk-import")
            .set("Authorization", auth(user))
            .send({
                records: [
                    validAuditPayload({ telefono: "***" }),
                ],
            });

        expect(res.status).toBe(200);
        expect(res.body.successCount).toBe(0);
        expect(res.body.errorCount).toBe(1);
        expect(res.body.errors[0].reasons.join(" ")).toMatch(/enmascarados/i);
    });

    test("Status-only endpoint cannot overwrite telefono from request body", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}/status`)
            .set("Authorization", auth(user))
            .send({ status: "Mensaje enviado", telefono: "***", _sourceInterface: "seguimiento" });

        expect(res.status).toBe(200);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
    });

    test("Generic datosExtra update rejects telefono and leaves stored phone unchanged", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}`)
            .set("Authorization", auth(user))
            .send({ datosExtra: "Nueva nota", telefono: "***" });

        expect(res.status).toBe(400);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.datosExtra).toBe("");
    });

    test("Masked API response cannot be persisted through generic edit request", async () => {
        const ownerSupervisor = await createUser({ role: "supervisor", nombre: "Owner Sup" });
        const otherSupervisor = await createUser({ role: "supervisor", nombre: "Other Sup" });
        const adviser = await createUser({ role: "asesor", supervisor: ownerSupervisor._id });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: ownerSupervisor._id,
            asesor: adviser._id,
            supervisorSnapshot: { _id: ownerSupervisor._id, nombre: ownerSupervisor.nombre },
        }));

        const listRes = await request(app)
            .get("/api/audits")
            .query({ dateFrom: "2026-06-18", dateTo: "2026-06-19" })
            .set("Authorization", auth(otherSupervisor));

        expect(listRes.status).toBe(200);
        expect(listRes.body[0]).toMatchObject({
            telefono: null,
            telefonoMasked: "***",
            canViewTelefono: false,
        });

        const editRes = await request(app)
            .patch(`/api/audits/${audit._id}`)
            .set("Authorization", auth(otherSupervisor))
            .send({ ...listRes.body[0], datosExtra: "roundtrip attempt" });

        expect(editRes.status).toBe(400);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.datosExtra).toBe("");
    });

    test("Gerencia receives real phone while restricted supervisor receives display-only mask", async () => {
        const gerencia = await createUser({ role: "gerencia" });
        const ownerSupervisor = await createUser({ role: "supervisor" });
        const otherSupervisor = await createUser({ role: "supervisor" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: gerencia._id,
            asesor: gerencia._id,
            supervisorSnapshot: { _id: ownerSupervisor._id, nombre: ownerSupervisor.nombre },
        }));

        const gerenciaRes = await request(app)
            .get("/api/audits")
            .query({ dateFrom: "2026-06-18", dateTo: "2026-06-19" })
            .set("Authorization", auth(gerencia));

        const supervisorRes = await request(app)
            .get("/api/audits")
            .query({ dateFrom: "2026-06-18", dateTo: "2026-06-19" })
            .set("Authorization", auth(otherSupervisor));

        expect(gerenciaRes.status).toBe(200);
        expect(gerenciaRes.body.find(a => a._id === String(audit._id)).telefono).toBe("1123456789");
        expect(supervisorRes.status).toBe(200);
        expect(supervisorRes.body.find(a => a._id === String(audit._id))).toMatchObject({
            telefono: null,
            telefonoMasked: "***",
            canViewTelefono: false,
        });
    });

    test("Dedicated phone update appends history with previous/new values and user snapshot", async () => {
        const user = await createUser({ role: "gerencia", nombre: "Phone Manager", email: "phone@test.com" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({
                telefono: "11-9876-5432",
                reason: "controlled recovery",
                source: "affiliates.telefono1",
                eventType: "recovered",
            });

        expect(res.status).toBe(200);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1198765432");
        expect(persisted.telefonoHistory).toHaveLength(1);
        expect(persisted.telefonoHistory[0]).toMatchObject({
            previousValue: "1123456789",
            newValue: "1198765432",
            changedByName: "Phone Manager",
            changedByEmail: "phone@test.com",
            changedByRole: "gerencia",
            source: "affiliates.telefono1",
            reason: "controlled recovery",
            eventType: "recovered",
        });
    });

    test("Dedicated phone update does not add history when normalized value is unchanged", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
            telefonoHistory: [],
        }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({ telefono: "(11) 2345-6789" });

        expect(res.status).toBe(200);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.telefonoHistory).toHaveLength(0);
    });

    test("Clients cannot directly alter telefonoHistory", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

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

    test("Restricted roles cannot use dedicated phone update", async () => {
        const manager = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: manager._id,
            asesor: manager._id,
        }));

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

    test("Generic Audit PATCH rejects telefono for all authenticated roles", async () => {
        const manager = await createUser({ role: "gerencia" });

        for (const role of ["gerencia", "desarrollador", "supervisor", "asesor", "auditor", "administrativo", "encargado", "recuperador", "independiente"]) {
            const user = role === "gerencia" ? manager : await createUser({ role });
            const audit = await Audit.create(validAuditPayload({
                cuil: `20${new mongoose.Types.ObjectId().toString().slice(-9)}`,
                telefono: "1123456789",
                createdBy: manager._id,
                asesor: manager._id,
            }));

            const res = await request(app)
                .patch(`/api/audits/${audit._id}`)
                .set("Authorization", auth(user))
                .send({ datosExtra: `attempt by ${role}`, telefono: "1198765432" });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/telefono no puede modificarse/i);

            const persisted = await Audit.findById(audit._id).lean();
            expect(persisted.telefono).toBe("1123456789");
            expect(persisted.datosExtra).toBe("");
        }
    });

    test("Desarrollador can use dedicated phone update", async () => {
        const manager = await createUser({ role: "gerencia" });
        const developer = await createUser({ role: "desarrollador", nombre: "Dev User" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: manager._id,
            asesor: manager._id,
        }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(developer))
            .send({ telefono: "1198765432", reason: "support correction", source: "manual.verified" });

        expect(res.status).toBe(200);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1198765432");
        expect(persisted.telefonoHistory[0]).toMatchObject({
            changedByName: "Dev User",
            changedByRole: "desarrollador",
        });
    });

    test("Recovered phone updates require reason and source", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        const missingReason = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({ telefono: "1198765432", eventType: "recovered", source: "affiliates.telefono1" });

        const missingSource = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({ telefono: "1198765432", eventType: "recovered", reason: "controlled recovery" });

        expect(missingReason.status).toBe(400);
        expect(missingSource.status).toBe(400);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.telefonoHistory).toHaveLength(0);
    });

    test("Client cannot impersonate phone history identity fields", async () => {
        const user = await createUser({ role: "gerencia" });
        const impersonatedUser = await createUser({ role: "gerencia", nombre: "Impersonated" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        const res = await request(app)
            .patch(`/api/audits/${audit._id}/telefono`)
            .set("Authorization", auth(user))
            .send({
                telefono: "1198765432",
                changedBy: impersonatedUser._id,
                changedByName: "Impersonated",
            });

        expect(res.status).toBe(400);
        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
        expect(persisted.telefonoHistory).toHaveLength(0);
    });

    test("Restricted roles cannot read real telefonoHistory values while Gerencia can", async () => {
        const gerencia = await createUser({ role: "gerencia" });
        const ownerSupervisor = await createUser({ role: "supervisor", nombre: "Owner Sup" });
        const otherSupervisor = await createUser({ role: "supervisor", nombre: "Other Sup" });
        await Audit.create(validAuditPayload({
            telefono: "1198765432",
            createdBy: gerencia._id,
            asesor: gerencia._id,
            supervisorSnapshot: { _id: ownerSupervisor._id, nombre: ownerSupervisor.nombre },
            telefonoHistory: [{
                previousValue: "1123456789",
                newValue: "1198765432",
                changedBy: gerencia._id,
                changedByName: "Gerencia",
                changedByEmail: "gerencia@test.com",
                changedByRole: "gerencia",
                eventType: "updated",
            }],
        }));

        const restrictedRes = await request(app)
            .get("/api/audits")
            .query({ dateFrom: "2026-06-18", dateTo: "2026-06-19" })
            .set("Authorization", auth(otherSupervisor));

        const gerenciaRes = await request(app)
            .get("/api/audits")
            .query({ dateFrom: "2026-06-18", dateTo: "2026-06-19" })
            .set("Authorization", auth(gerencia));

        expect(restrictedRes.status).toBe(200);
        expect(restrictedRes.body[0].telefonoHistory[0]).toMatchObject({
            previousValue: null,
            newValue: null,
            phoneValuesHidden: true,
        });
        expect(gerenciaRes.status).toBe(200);
        expect(gerenciaRes.body[0].telefonoHistory[0]).toMatchObject({
            previousValue: "1123456789",
            newValue: "1198765432",
        });
    });

    test("Concurrent phone updates do not create mismatched previousValue history", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        const [first, second] = await Promise.all([
            request(app)
                .patch(`/api/audits/${audit._id}/telefono`)
                .set("Authorization", auth(user))
                .send({ telefono: "1198765432", reason: "first update", source: "manual.verified" }),
            request(app)
                .patch(`/api/audits/${audit._id}/telefono`)
                .set("Authorization", auth(user))
                .send({ telefono: "1111111111", reason: "second update", source: "manual.verified" }),
        ]);

        expect([200, 409]).toContain(first.status);
        expect([200, 409]).toContain(second.status);
        expect([first.status, second.status].filter(status => status === 200).length).toBeGreaterThanOrEqual(1);

        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefonoHistory[0].previousValue).toBe("1123456789");
        if (persisted.telefonoHistory.length === 1) {
            expect(persisted.telefonoHistory[0].newValue).toBe(persisted.telefono);
        }
        if (persisted.telefonoHistory.length === 2) {
            expect(persisted.telefonoHistory[1].previousValue).toBe(persisted.telefonoHistory[0].newValue);
            expect(persisted.telefonoHistory[1].newValue).toBe(persisted.telefono);
        }
    });

    test("Direct model save rejects invalid phone placeholders", async () => {
        const user = await createUser({ role: "gerencia" });

        await expect(Audit.create(validAuditPayload({
            telefono: "***",
            createdBy: user._id,
            asesor: user._id,
        }))).rejects.toThrow(/telefono/i);
    });

    test("findOneAndUpdate rejects invalid phone when validators run", async () => {
        const user = await createUser({ role: "gerencia" });
        const audit = await Audit.create(validAuditPayload({
            telefono: "1123456789",
            createdBy: user._id,
            asesor: user._id,
        }));

        await expect(Audit.findOneAndUpdate(
            { _id: audit._id },
            { $set: { telefono: "***" } },
            { new: true, runValidators: true }
        )).rejects.toThrow(/telefono/i);

        const persisted = await Audit.findById(audit._id).lean();
        expect(persisted.telefono).toBe("1123456789");
    });

    test("Historical invalid phones survive unrelated update patterns without whole-document phone validation", async () => {
        const manager = await createUser({ role: "gerencia" });
        const auditor = await createUser({ role: "auditor" });
        const adviser = await createUser({ role: "asesor" });

        const operations = [
            {
                name: "document.save status only",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: adviser._id });
                    const audit = await Audit.findById(raw._id);
                    audit.status = "Mensaje enviado";
                    await audit.save();
                    return raw._id;
                },
            },
            {
                name: "findByIdAndUpdate status only",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: adviser._id });
                    await Audit.findByIdAndUpdate(raw._id, { $set: { status: "Mensaje enviado" } }, { new: true });
                    return raw._id;
                },
            },
            {
                name: "findOneAndUpdate status only with validators",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: adviser._id });
                    await Audit.findOneAndUpdate(
                        { _id: raw._id },
                        { $set: { status: "Mensaje enviado" } },
                        { new: true, runValidators: true }
                    );
                    return raw._id;
                },
            },
            {
                name: "updateOne status only with validators",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: adviser._id });
                    await Audit.updateOne(
                        { _id: raw._id },
                        { $set: { status: "Mensaje enviado" } },
                        { runValidators: true }
                    );
                    return raw._id;
                },
            },
            {
                name: "datosExtra generic API update",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: adviser._id });
                    const res = await request(app)
                        .patch(`/api/audits/${raw._id}`)
                        .set("Authorization", auth(manager))
                        .send({ datosExtra: "nota historica" });

                    expect(res.status).toBe(200);
                    return raw._id;
                },
            },
            {
                name: "auditor assignment findByIdAndUpdate",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: adviser._id });
                    await Audit.findByIdAndUpdate(
                        raw._id,
                        { $set: { auditor: auditor._id } },
                        { new: true, runValidators: true }
                    );
                    return raw._id;
                },
            },
            {
                name: "adviser assignment findByIdAndUpdate",
                run: async () => {
                    const raw = await insertHistoricalInvalidAudit({ createdBy: manager._id, asesor: manager._id });
                    await Audit.findByIdAndUpdate(
                        raw._id,
                        { $set: { asesor: adviser._id } },
                        { new: true, runValidators: true }
                    );
                    return raw._id;
                },
            },
        ];

        for (const operation of operations) {
            const auditId = await operation.run();
            const persisted = await Audit.findById(auditId).lean();
            expect(persisted.telefono).toBe("***");
        }
    });

    test("Historical invalid phone can be recovered through dedicated endpoint with history", async () => {
        const user = await createUser({ role: "gerencia", nombre: "Recovery Manager", email: "recovery@test.com" });
        const raw = await insertHistoricalInvalidAudit({
            createdBy: user._id,
            asesor: user._id,
            telefonoHistory: [],
        });

        const res = await request(app)
            .patch(`/api/audits/${raw._id}/telefono`)
            .set("Authorization", auth(user))
            .send({
                telefono: "11 9876-5432",
                eventType: "recovered",
                reason: "controlled high-confidence recovery",
                source: "affiliates.telefono1",
            });

        expect(res.status).toBe(200);
        const persisted = await Audit.findById(raw._id).lean();
        expect(persisted.telefono).toBe("1198765432");
        expect(persisted.telefonoHistory).toHaveLength(1);
        expect(persisted.telefonoHistory[0]).toMatchObject({
            previousValue: "***",
            newValue: "1198765432",
            changedByName: "Recovery Manager",
            changedByEmail: "recovery@test.com",
            changedByRole: "gerencia",
            eventType: "recovered",
            reason: "controlled high-confidence recovery",
            source: "affiliates.telefono1",
        });
    });
});
