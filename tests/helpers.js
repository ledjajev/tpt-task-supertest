const supertest = require("supertest");

const BASE_URL = "https://petstore.swagger.io/v2";
const api = supertest(BASE_URL);

module.exports = { api };