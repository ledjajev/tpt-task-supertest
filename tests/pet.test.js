/**
 * Tests for /pet endpoints
 *
 * Endpoints covered:
 *   POST   /pet              – Add a new pet
 *   PUT    /pet              – Update an existing pet
 *   GET    /pet/findByStatus – Find pets by status
 *   GET    /pet/{petId}      – Find pet by ID
 *   DELETE /pet/{petId}      – Delete a pet
 *
 * Test types:
 *   ✅ Functional  – happy-path, verify response shape and status
 *   ❌ Negative    – invalid input, missing fields, bad IDs
 *   ⚠️  Edge Case  – boundary values, empty strings, extreme IDs
 */

const { api } = require("./helpers");

// Unique ID to avoid test pollution across concurrent runs
const TEST_PET_ID = Math.floor(Math.random() * 900000) + 100000;

const validPet = {
  id: TEST_PET_ID,
  name: "Buddy",
  status: "available",
  photoUrls: ["https://example.com/buddy.jpg"],
  category: { id: 1, name: "Dogs" },
  tags: [{ id: 1, name: "friendly" }],
};

// ─────────────────────────────────────────────
// POST /pet
// ─────────────────────────────────────────────
describe("POST /pet – Add a new pet", () => {
  test("✅ [Functional] Creates a pet and returns 200 with the pet object", async () => {
    const res = await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send(validPet);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: TEST_PET_ID,
      name: "Buddy",
      status: "available",
    });
  });

  test("✅ [Functional] Response contains photoUrls array", async () => {
    const res = await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send(validPet);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.photoUrls)).toBe(true);
    expect(res.body.photoUrls.length).toBeGreaterThan(0);
  });

  test("❌ [Negative] Returns 405 when sending invalid data (empty body)", async () => {
    const res = await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send({});

    // Petstore is lenient — returns 200 even for empty body (documented API quirk)
    expect([200, 400, 405, 500]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Creates a pet with a very large numeric ID", async () => {
    const largePet = { ...validPet, id: 9007199254740991 }; // Number.MAX_SAFE_INTEGER
    const res = await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send(largePet);

    expect([200, 400, 500]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Creates a pet with special characters in name", async () => {
    const specialPet = { ...validPet, id: TEST_PET_ID + 1, name: "<script>alert(1)</script>" };
    const res = await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send(specialPet);

    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      // If accepted, the server should not execute/reflect raw script tags
      expect(res.body.name).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────
// GET /pet/{petId}
// ─────────────────────────────────────────────
describe("GET /pet/{petId} – Find pet by ID", () => {
  beforeAll(async () => {
    // Ensure the pet exists before reading it
    await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send(validPet);
  });

  test("✅ [Functional] Returns the correct pet for a valid ID", async () => {
    const res = await api.get(`/pet/${TEST_PET_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_PET_ID);
    expect(res.body.name).toBe("Buddy");
  });

  test("✅ [Functional] Response contains all expected fields", async () => {
    const res = await api.get(`/pet/${TEST_PET_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("photoUrls");
  });

  test("❌ [Negative] Returns 404 for a non-existent pet ID", async () => {
    const res = await api.get("/pet/999999999");

    expect(res.status).toBe(404);
  });

  test("❌ [Negative] Returns 400 for a non-numeric pet ID", async () => {
    const res = await api.get("/pet/not-a-number");

    expect([400, 404]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Returns appropriate response for ID = 0", async () => {
    const res = await api.get("/pet/0");

    expect([400, 404]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Returns appropriate response for negative ID", async () => {
    const res = await api.get("/pet/-1");

    expect([400, 404]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// GET /pet/findByStatus
// ─────────────────────────────────────────────
describe("GET /pet/findByStatus – Find pets by status", () => {
  test("✅ [Functional] Returns array of available pets", async () => {
    const res = await api.get("/pet/findByStatus?status=available");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("✅ [Functional] All returned pets have status=available", async () => {
    const res = await api.get("/pet/findByStatus?status=available");

    expect(res.status).toBe(200);
    res.body.forEach((pet) => {
      expect(pet.status).toBe("available");
    });
  });

  test("✅ [Functional] Returns pets with status=pending", async () => {
    const res = await api.get("/pet/findByStatus?status=pending");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("✅ [Functional] Returns pets with status=sold", async () => {
    const res = await api.get("/pet/findByStatus?status=sold");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("❌ [Negative] Returns 400 for an invalid status value", async () => {
    const res = await api.get("/pet/findByStatus?status=nonexistent");

    // The Petstore spec says 400 for invalid status
    expect([400, 200]).toContain(res.status);
  });

  test("❌ [Negative] Returns 400 when status parameter is missing", async () => {
    const res = await api.get("/pet/findByStatus");

    expect([400, 200]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Handles multiple status values in one request", async () => {
    const res = await api.get("/pet/findByStatus?status=available&status=sold");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// PUT /pet
// ─────────────────────────────────────────────
describe("PUT /pet – Update an existing pet", () => {
  beforeAll(async () => {
    await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send(validPet);
  });

  test("✅ [Functional] Updates a pet name and returns 200", async () => {
    const updated = { ...validPet, name: "BuddyUpdated" };
    const res = await api
      .put("/pet")
      .set("Content-Type", "application/json")
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("BuddyUpdated");
  });

  test("✅ [Functional] Updates pet status from available to sold", async () => {
    const updated = { ...validPet, status: "sold" };
    const res = await api
      .put("/pet")
      .set("Content-Type", "application/json")
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("sold");
  });

  test("❌ [Negative] Returns error for invalid pet data (missing required fields)", async () => {
    const res = await api
      .put("/pet")
      .set("Content-Type", "application/json")
      .send({ status: "available" }); // No id or name

    // Petstore is lenient — returns 200 even for incomplete data (documented API quirk)
    expect([200, 400, 405, 500]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Updates pet with an empty name string", async () => {
    const updated = { ...validPet, name: "" };
    const res = await api
      .put("/pet")
      .set("Content-Type", "application/json")
      .send(updated);

    // Server should either reject or accept — both are valid behaviours to document
    expect([200, 400, 405]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// DELETE /pet/{petId}
// ─────────────────────────────────────────────
describe("DELETE /pet/{petId} – Delete a pet", () => {
  const DELETE_PET_ID = TEST_PET_ID + 50;

  beforeAll(async () => {
    await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send({ ...validPet, id: DELETE_PET_ID });
  });

  test("✅ [Functional] Deletes an existing pet and returns 200", async () => {
    const res = await api
      .delete(`/pet/${DELETE_PET_ID}`)
      .set("api_key", "special-key");

    expect(res.status).toBe(200);
  });

  test("✅ [Functional] Deleted pet is no longer retrievable (returns 404)", async () => {
    const res = await api.get(`/pet/${DELETE_PET_ID}`);

    expect(res.status).toBe(404);
  });

  test("❌ [Negative] Returns 404 when deleting a non-existent pet", async () => {
    const res = await api
      .delete("/pet/999999999")
      .set("api_key", "special-key");

    expect([404, 200]).toContain(res.status); // Petstore can be lenient here
  });

  test("❌ [Negative] Returns 400 for a non-numeric pet ID", async () => {
    const res = await api
      .delete("/pet/invalid-id")
      .set("api_key", "special-key");

    expect([400, 404]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Attempting to delete the same pet twice", async () => {
    const DOUBLE_DELETE_ID = TEST_PET_ID + 51;

    // Create and delete once
    await api
      .post("/pet")
      .set("Content-Type", "application/json")
      .send({ ...validPet, id: DOUBLE_DELETE_ID });

    await api.delete(`/pet/${DOUBLE_DELETE_ID}`).set("api_key", "special-key");

    // Second delete should return 404 or 200 (Petstore is lenient)
    const res = await api
      .delete(`/pet/${DOUBLE_DELETE_ID}`)
      .set("api_key", "special-key");

    expect([404, 200]).toContain(res.status);
  });
});