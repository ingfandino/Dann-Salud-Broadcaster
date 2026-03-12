// backend/tests/auth.test.js

process.env.NODE_ENV = "test";

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../src/server");
const User = require("../src/models/User");

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
});

describe("Auth API", () => {
    it("✅ registra un nuevo usuario", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "dani",
                nombre: "Daniel Fandiño",
                email: "daniel@test.com",
                password: "secreto123",
                numeroEquipo: 7,
            });

        expect(res.statusCode).toBe(201);
        expect(res.body.message).toMatch(/Registro exitoso/i);

        const user = await User.findOne({ email: "daniel@test.com" });
        expect(user).not.toBeNull();
        expect(user.activo).toBe(false);
    });

    it("❌ no permite login si usuario está inactivo", async () => {
        await new User({
            username: "dani",
            nombre: "Daniel Fandiño",
            email: "daniel@test.com",
            password: "secreto123",
            numeroEquipo: 7,
            role: "asesor",
            activo: false,
        }).save();

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "daniel@test.com", password: "secreto123" });

        expect(res.statusCode).toBe(403);
        expect(res.body.error).toMatch(/inactiva/i);
    });

    it("✅ permite login si usuario está activo", async () => {
        const user = await new User({
            username: "dani",
            nombre: "Daniel Fandiño",
            email: "daniel@test.com",
            password: "secreto123",
            numeroEquipo: 7,
            role: "asesor",
            activo: true,
        }).save();

        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: "daniel@test.com", password: "secreto123" });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body.user.email).toBe(user.email);
        expect(res.body.user.role).toBe("asesor");
    });

    it("✅ me devuelve datos del usuario autenticado", async () => {
        const user = await new User({
            username: "dani",
            nombre: "Daniel Fandiño",
            email: "daniel@test.com",
            password: "secreto123",
            numeroEquipo: 7,
            role: "asesor",
            activo: true,
        }).save();

        const login = await request(app)
            .post("/api/auth/login")
            .send({ email: "daniel@test.com", password: "secreto123" });

        const token = login.body.token;

        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.email).toBe(user.email);
        expect(res.body.role).toBe("asesor");
    });
});