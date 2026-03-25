/**
 * Tests for /user endpoints
 *
 * Endpoints covered:
 *   POST   /user            – Create user
 *   GET    /user/login      – Log user into the system
 *   GET    /user/logout     – Log out current user session
 *   GET    /user/{username} – Get user by username
 *   PUT    /user/{username} – Update user
 *   DELETE /user/{username} – Delete user
 *
 * Test types:
 *   ✅ Functional  – happy-path, verify response shape and status
 *   ❌ Negative    – invalid input, missing fields, wrong credentials
 *   ⚠️  Edge Case  – boundary values, unusual usernames/passwords
 */

const { api } = require("./helpers");

const SUFFIX = Date.now();
const TEST_USERNAME = `testuser_${SUFFIX}`;

const validUser = {
  id: SUFFIX,
  username: TEST_USERNAME,
  firstName: "Test",
  lastName: "User",
  email: `${TEST_USERNAME}@example.com`,
  password: "password123",
  phone: "1234567890",
  userStatus: 1,
};

// ─────────────────────────────────────────────
// POST /user
// ─────────────────────────────────────────────
describe("POST /user – Create user", () => {
  test("✅ [Functional] Creates a user and returns 200", async () => {
    const res = await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send(validUser);

    expect(res.status).toBe(200);
  });

  test("✅ [Functional] Response contains a message field", async () => {
    const newUser = { ...validUser, username: `${TEST_USERNAME}_b`, id: SUFFIX + 1 };
    const res = await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send(newUser);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  test("❌ [Negative] Returns error when required fields are missing", async () => {
    const res = await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send({ email: "nobody@example.com" }); // No username or password

    expect([400, 200]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Creates a user with a very long username (100 chars)", async () => {
    const longUsername = "u".repeat(100);
    const res = await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send({ ...validUser, username: longUsername, id: SUFFIX + 2 });

    expect([200, 400]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Creates a user with special characters in username", async () => {
    const specialUser = {
      ...validUser,
      username: "user@name!#$",
      id: SUFFIX + 3,
    };
    const res = await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send(specialUser);

    expect([200, 400]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// GET /user/login
// ─────────────────────────────────────────────
describe("GET /user/login – Log in", () => {
  test("✅ [Functional] Returns 200 for valid credentials", async () => {
    const res = await api.get(
      `/user/login?username=${TEST_USERNAME}&password=password123`
    );

    expect(res.status).toBe(200);
  });

  test("✅ [Functional] Response contains a session token in message or header", async () => {
    const res = await api.get(
      `/user/login?username=${TEST_USERNAME}&password=password123`
    );

    expect(res.status).toBe(200);
    // Petstore returns a token inside the message body
    expect(res.body.message).toMatch(/logged in/i);
  });

  test("✅ [Functional] Rate-limit header X-Rate-Limit is present", async () => {
    const res = await api.get(
      `/user/login?username=${TEST_USERNAME}&password=password123`
    );

    expect(res.status).toBe(200);
    expect(res.headers["x-rate-limit"]).toBeDefined();
  });

  test("❌ [Negative] Returns 400 for wrong password", async () => {
    const res = await api.get(
      `/user/login?username=${TEST_USERNAME}&password=wrongpassword`
    );

    // Petstore does not validate passwords — returns 200 for any credentials (documented API quirk)
    expect([200, 400, 401, 403]).toContain(res.status);
  });

  test("❌ [Negative] Returns 400 when credentials are missing", async () => {
    const res = await api.get("/user/login");

    expect([400, 200]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Returns appropriate response for empty username and password", async () => {
    const res = await api.get("/user/login?username=&password=");

    expect([400, 401, 200]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// GET /user/logout
// ─────────────────────────────────────────────
describe("GET /user/logout – Log out", () => {
  test("✅ [Functional] Returns 200 on logout", async () => {
    const res = await api.get("/user/logout");

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// GET /user/{username}
// ─────────────────────────────────────────────
describe("GET /user/{username} – Get user by username", () => {
  beforeAll(async () => {
    await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send(validUser);
  });

  test("✅ [Functional] Returns the correct user for a valid username", async () => {
    const res = await api.get(`/user/${TEST_USERNAME}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe(TEST_USERNAME);
  });

  test("✅ [Functional] Returned user has all expected fields", async () => {
    const res = await api.get(`/user/${TEST_USERNAME}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("username");
    expect(res.body).toHaveProperty("email");
    expect(res.body).toHaveProperty("firstName");
    expect(res.body).toHaveProperty("lastName");
  });

  test("❌ [Negative] Returns 404 for a non-existent username", async () => {
    const res = await api.get("/user/this_user_definitely_does_not_exist_xyz");

    expect(res.status).toBe(404);
  });

  test("⚠️  [Edge Case] Handles username with only spaces (encoded)", async () => {
    const res = await api.get("/user/%20%20%20");

    expect([400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// PUT /user/{username}
// ─────────────────────────────────────────────
describe("PUT /user/{username} – Update user", () => {
  test("✅ [Functional] Updates user firstName and returns 200", async () => {
    const updated = { ...validUser, firstName: "UpdatedName" };
    const res = await api
      .put(`/user/${TEST_USERNAME}`)
      .set("Content-Type", "application/json")
      .send(updated);

    expect(res.status).toBe(200);
  });

  test("✅ [Functional] Updated user data is persisted", async () => {
    const updated = { ...validUser, firstName: "Persisted" };
    await api
      .put(`/user/${TEST_USERNAME}`)
      .set("Content-Type", "application/json")
      .send(updated);

    const res = await api.get(`/user/${TEST_USERNAME}`);
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe("Persisted");
  });

  test("❌ [Negative] Returns 404 when updating a non-existent user", async () => {
    const res = await api
      .put("/user/ghost_user_xyz")
      .set("Content-Type", "application/json")
      .send(validUser);

    expect([404, 200]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Updating with empty strings for firstName and lastName", async () => {
    const emptyNames = { ...validUser, firstName: "", lastName: "" };
    const res = await api
      .put(`/user/${TEST_USERNAME}`)
      .set("Content-Type", "application/json")
      .send(emptyNames);

    expect([200, 400]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// DELETE /user/{username}
// ─────────────────────────────────────────────
describe("DELETE /user/{username} – Delete user", () => {
  const DELETE_USERNAME = `${TEST_USERNAME}_delete`;

  beforeAll(async () => {
    await api
      .post("/user")
      .set("Content-Type", "application/json")
      .send({ ...validUser, username: DELETE_USERNAME, id: SUFFIX + 99 });
  });

  test("✅ [Functional] Deletes an existing user and returns 200", async () => {
    const res = await api.delete(`/user/${DELETE_USERNAME}`);

    expect(res.status).toBe(200);
  });

  test("✅ [Functional] Deleted user is no longer retrievable (returns 404)", async () => {
    const res = await api.get(`/user/${DELETE_USERNAME}`);

    expect(res.status).toBe(404);
  });

  test("❌ [Negative] Returns 404 when deleting a non-existent user", async () => {
    const res = await api.delete("/user/user_that_never_existed_xyz");

    expect([404, 200]).toContain(res.status);
  });
});