/**
 * Integration tests for the Finance Dashboard API.
 * Uses a real MongoDB test database and exercises the API through Supertest.
 * Run: npm test
 */

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const { User } = require("../src/models/user.model");
const { Record } = require("../src/models/record.model");

// Use a separate test database to avoid polluting dev data
const TEST_DB =
  process.env.MONGO_URI_TEST ||
  "mongodb://localhost:27017/finance_dashboard_test";

let adminToken, analystToken, viewerToken;
let adminUser, analystUser, viewerUser;
let testRecordId;

beforeAll(async () => {
    await mongoose.connect(TEST_DB);
    // Clear test DB
    await User.deleteMany({});
    await Record.deleteMany({});

    // Create test users
    adminUser = await User.create({ name: "Test Admin", email: "admin@test.com", password: "admin123", role: "admin" });
    analystUser = await User.create({ name: "Test Analyst", email: "analyst@test.com", password: "analyst123", role: "analyst" });
    viewerUser = await User.create({ name: "Test Viewer", email: "viewer@test.com", password: "viewer123", role: "viewer" });

    // Get tokens
    const adminLogin = await request(app).post("/api/auth/login").send({ email: "admin@test.com", password: "admin123" });
    const analystLogin = await request(app).post("/api/auth/login").send({ email: "analyst@test.com", password: "analyst123" });
    const viewerLogin = await request(app).post("/api/auth/login").send({ email: "viewer@test.com", password: "viewer123" });

    adminToken = adminLogin.body.token;
    analystToken = analystLogin.body.token;
    viewerToken = viewerLogin.body.token;
});

afterAll(async () => {
    await User.deleteMany({});
    await Record.deleteMany({});
    await mongoose.connection.close();
});

// ─── HEALTH CHECK ───────────────────────────────────────────────────────────

describe("Health Check", () => {
    it("returns a repository docs pointer on the root route", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.docs).toContain("README.md");
        expect(res.body.docs).not.toContain("/api/docs");
    });
});

// ─── AUTH ────────────────────────────────────────────────────────────────────

describe("Auth", () => {
    it("registers a new user", async () => {
        const res = await request(app).post("/api/auth/register").send({
            name: "New User",
            email: "new@test.com",
            password: "newpass123",
        });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.role).toBe("viewer"); // default role
    });

    it("rejects duplicate registration (email already exists)", async () => {
        const res = await request(app).post("/api/auth/register").send({
            name: "Dup User",
            email: "new@test.com",
            password: "newpass123",
        });
        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it("rejects registration with invalid email", async () => {
        const res = await request(app).post("/api/auth/register").send({
            name: "Bad Email",
            email: "not-an-email",
            password: "pass123",
        });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("rejects login with wrong password", async () => {
        const res = await request(app).post("/api/auth/login").send({
            email: "admin@test.com",
            password: "wrongpassword",
        });
        expect(res.statusCode).toBe(401);
    });

    it("returns current user on /me", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.user.email).toBe("admin@test.com");
    });

    it("rejects /me without token", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.statusCode).toBe(401);
    });
});

// ─── RECORDS ─────────────────────────────────────────────────────────────────

describe("Records", () => {
    it("rejects invalid record id format", async () => {
        const res = await request(app)
            .get("/api/records/not-a-mongo-id")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it("allows analyst to create a record", async () => {
        const res = await request(app)
            .post("/api/records")
            .set("Authorization", `Bearer ${analystToken}`)
            .send({
                amount: 5000,
                type: "income",
                category: "salary",
                date: "2024-06-15",
                description: "June salary",
            });
        expect(res.statusCode).toBe(201);
        expect(res.body.record.amount).toBe(5000);
        testRecordId = res.body.record._id;
    });

    it("prevents viewer from creating a record", async () => {
        const res = await request(app)
            .post("/api/records")
            .set("Authorization", `Bearer ${viewerToken}`)
            .send({ amount: 100, type: "expense", category: "food" });
        expect(res.statusCode).toBe(403);
    });

    it("allows viewer to read records", async () => {
        const res = await request(app)
            .get("/api/records")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.records).toBeDefined();
    });

    it("filters records by type", async () => {
        const res = await request(app)
            .get("/api/records?type=income")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(200);
        res.body.records.forEach((r) => expect(r.type).toBe("income"));
    });

    it("rejects invalid type filter", async () => {
        const res = await request(app)
            .get("/api/records?type=invalid")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(400);
    });

    it("allows admin to update a record", async () => {
        const res = await request(app)
            .patch(`/api/records/${testRecordId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ amount: 6000 });
        expect(res.statusCode).toBe(200);
        expect(res.body.record.amount).toBe(6000);
    });

    it("prevents analyst from updating a record", async () => {
        const res = await request(app)
            .patch(`/api/records/${testRecordId}`)
            .set("Authorization", `Bearer ${analystToken}`)
            .send({ amount: 9000 });
        expect(res.statusCode).toBe(403);
    });

    it("soft deletes a record (admin only)", async () => {
        const res = await request(app)
            .delete(`/api/records/${testRecordId}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);

        // Verify it no longer appears in list
        const list = await request(app)
            .get("/api/records")
            .set("Authorization", `Bearer ${adminToken}`);
        const found = list.body.records.find((r) => r._id === testRecordId);
        expect(found).toBeUndefined();
    });
});

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

describe("Dashboard", () => {
    it("returns summary for any authenticated user", async () => {
        const res = await request(app)
            .get("/api/dashboard/summary")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.summary).toHaveProperty("totalIncome");
        expect(res.body.summary).toHaveProperty("totalExpenses");
        expect(res.body.summary).toHaveProperty("netBalance");
    });

    it("returns category breakdown", async () => {
        const res = await request(app)
            .get("/api/dashboard/category-breakdown")
            .set("Authorization", `Bearer ${analystToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.breakdown)).toBe(true);
    });

    it("returns monthly trend", async () => {
        const res = await request(app)
            .get("/api/dashboard/monthly-trend?months=6")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.trend)).toBe(true);
    });

    it("allows analyst to view weekly trend", async () => {
        const res = await request(app)
            .get("/api/dashboard/weekly-trend")
            .set("Authorization", `Bearer ${analystToken}`);
        expect(res.statusCode).toBe(200);
    });

    it("prevents viewer from accessing weekly trend", async () => {
        const res = await request(app)
            .get("/api/dashboard/weekly-trend")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(res.statusCode).toBe(403);
    });
});

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

describe("User Management", () => {
    it("allows admin to list users", async () => {
        const res = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.users)).toBe(true);
    });

    it("prevents non-admin from accessing user list", async () => {
        const res = await request(app)
            .get("/api/users")
            .set("Authorization", `Bearer ${analystToken}`);
        expect(res.statusCode).toBe(403);
    });

    it("allows admin to update user role", async () => {
        const res = await request(app)
            .patch(`/api/users/${viewerUser._id}/role`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ role: "analyst" });
        expect(res.statusCode).toBe(200);
        expect(res.body.user.role).toBe("analyst");
    });

    it("prevents admin from changing their own role", async () => {
        const res = await request(app)
            .patch(`/api/users/${adminUser._id}/role`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ role: "viewer" });
        expect(res.statusCode).toBe(400);
    });

    it("blocks inactive user from accessing authenticated routes", async () => {
        // Deactivate viewer user
        await User.findByIdAndUpdate(viewerUser._id, { isActive: false }, { new: true });

        const me = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${viewerToken}`);
        expect(me.statusCode).toBe(403);

        // Restore for any later tests
        await User.findByIdAndUpdate(viewerUser._id, { isActive: true }, { new: true });
    });
});
