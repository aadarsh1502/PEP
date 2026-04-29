const request = require("supertest");
const app = require("../app");

describe("GET /health", () => {
  it("should return 200 with status ok and instanceId", async () => {
    const res = await request(app).get("/health");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("instanceId");
    expect(res.body).toHaveProperty("timestamp");
  });
});

describe("POST /upload", () => {
  it("should return 400 when no file is provided", async () => {
    const res = await request(app).post("/upload");

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error", "No image file provided");
  });

  it("should return 400 when file type is not allowed", async () => {
    const res = await request(app)
      .post("/upload")
      .attach("image", Buffer.from("not an image"), {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty(
      "error",
      "Only JPG and PNG files are allowed"
    );
  });
});
