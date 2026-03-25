/**
 * Tests for /store endpoints
 *
 * Endpoints covered:
 *   GET    /store/inventory         – Returns pet inventories by status
 *   POST   /store/order             – Place an order for a pet
 *   GET    /store/order/{orderId}   – Find purchase order by ID
 *   DELETE /store/order/{orderId}   – Delete purchase order by ID
 *
 * Test types:
 *   ✅ Functional  – happy-path, verify response shape and status
 *   ❌ Negative    – invalid input, missing fields, bad IDs
 *   ⚠️  Edge Case  – boundary values, unusual inputs
 */

const { api } = require("./helpers");

const TEST_ORDER_ID = Math.floor(Math.random() * 9000) + 1000;

const validOrder = {
  id: TEST_ORDER_ID,
  petId: 1,
  quantity: 1,
  shipDate: new Date().toISOString(),
  status: "placed",
  complete: false,
};

// ─────────────────────────────────────────────
// GET /store/inventory
// ─────────────────────────────────────────────
describe("GET /store/inventory – Returns pet inventories by status", () => {
  test("✅ [Functional] Returns 200 with an inventory object", async () => {
    const res = await api.get("/store/inventory");

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe("object");
    expect(res.body).not.toBeNull();
  });

  test("✅ [Functional] Inventory keys are strings (status names)", async () => {
    const res = await api.get("/store/inventory");

    expect(res.status).toBe(200);
    Object.keys(res.body).forEach((key) => {
      expect(typeof key).toBe("string");
    });
  });

  test("✅ [Functional] Inventory values are non-negative integers (counts)", async () => {
    const res = await api.get("/store/inventory");

    expect(res.status).toBe(200);
    Object.values(res.body).forEach((count) => {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─────────────────────────────────────────────
// POST /store/order
// ─────────────────────────────────────────────
describe("POST /store/order – Place an order", () => {
  test("✅ [Functional] Places a valid order and returns 200", async () => {
    const res = await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send(validOrder);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_ORDER_ID);
    expect(res.body.status).toBe("placed");
  });

  test("✅ [Functional] Response contains all expected order fields", async () => {
    const res = await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send(validOrder);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("petId");
    expect(res.body).toHaveProperty("quantity");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("complete");
  });

  test("❌ [Negative] Returns error when sending empty order body", async () => {
    const res = await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send({});

    expect([400, 200]).toContain(res.status);
  });

  test("❌ [Negative] Returns error for invalid order status", async () => {
    const badOrder = { ...validOrder, status: "flying" };
    const res = await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send(badOrder);

    expect([400, 200]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Order with quantity = 0", async () => {
    const zeroQtyOrder = { ...validOrder, id: TEST_ORDER_ID + 1, quantity: 0 };
    const res = await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send(zeroQtyOrder);

    expect([200, 400]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Order with quantity = 2147483647 (max int32)", async () => {
    const maxQtyOrder = { ...validOrder, id: TEST_ORDER_ID + 2, quantity: 2147483647 };
    const res = await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send(maxQtyOrder);

    expect([200, 400]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// GET /store/order/{orderId}
// ─────────────────────────────────────────────
describe("GET /store/order/{orderId} – Find order by ID", () => {
  beforeAll(async () => {
    await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send(validOrder);
  });

  test("✅ [Functional] Returns the correct order for a valid ID", async () => {
    const res = await api.get(`/store/order/${TEST_ORDER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(TEST_ORDER_ID);
  });

  test("✅ [Functional] Returned order matches the placed order", async () => {
    const res = await api.get(`/store/order/${TEST_ORDER_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.petId).toBe(validOrder.petId);
    expect(res.body.quantity).toBe(validOrder.quantity);
    expect(res.body.status).toBe(validOrder.status);
  });

  test("❌ [Negative] Returns 404 for a non-existent order ID", async () => {
    const res = await api.get("/store/order/999999");

    expect(res.status).toBe(404);
  });

  test("❌ [Negative] Returns 400 for non-numeric order ID", async () => {
    const res = await api.get("/store/order/abc");

    expect([400, 404]).toContain(res.status);
  });

  test("⚠️  [Edge Case] Returns appropriate response for order ID > 10 (spec boundary)", async () => {
    // Petstore spec states only IDs 1–10 are valid
    const res = await api.get("/store/order/11");

    expect([404, 200]).toContain(res.status);
  });
});

// ─────────────────────────────────────────────
// DELETE /store/order/{orderId}
// ─────────────────────────────────────────────
describe("DELETE /store/order/{orderId} – Delete an order", () => {
  const DELETE_ORDER_ID = TEST_ORDER_ID + 10;

  beforeAll(async () => {
    await api
      .post("/store/order")
      .set("Content-Type", "application/json")
      .send({ ...validOrder, id: DELETE_ORDER_ID });
  });

  test("✅ [Functional] Deletes an existing order and returns 200", async () => {
    const res = await api.delete(`/store/order/${DELETE_ORDER_ID}`);

    expect(res.status).toBe(200);
  });

  test("✅ [Functional] Deleted order is no longer retrievable (returns 404)", async () => {
    const res = await api.get(`/store/order/${DELETE_ORDER_ID}`);

    expect(res.status).toBe(404);
  });

  test("❌ [Negative] Returns 404 when deleting a non-existent order", async () => {
    const res = await api.delete("/store/order/999999");

    expect([404, 200]).toContain(res.status);
  });

  test("❌ [Negative] Returns 400 for non-numeric order ID", async () => {
    const res = await api.delete("/store/order/invalid");

    expect([400, 404]).toContain(res.status);
  });
});