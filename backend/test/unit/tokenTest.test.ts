import { signAuthToken, verifyAuthToken } from "../../src/services/token.service";

describe("token.service", () => {
  test("assina e verifica token com clienteId", () => {
    const token = signAuthToken(
      { sub: "sub1", email: "x@y.com", name: "X", picture: "p" },
      99
    );

    const decoded = verifyAuthToken(token);
    expect(decoded.email).toBe("x@y.com");
    expect(decoded.clienteId).toBe(99);
    expect(decoded.sub).toBe("sub1");
  });
});
