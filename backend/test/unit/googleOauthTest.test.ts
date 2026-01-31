import axios from "axios";
import {
  buildGoogleAuthUrl,
  exchangeCodeForAccessToken,
  fetchGoogleUserInfo,
} from "../../src/services/googleOAuth.service";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("googleOAuth.service", () => {
  test("buildGoogleAuthUrl deve conter client_id e redirect_uri", () => {
    const url = buildGoogleAuthUrl();
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=google_client_id_test");
    expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Foauth");
    expect(url).toContain("scope=openid+email+profile");
  });

  test("exchangeCodeForAccessToken retorna access_token", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { access_token: "access123" } } as any);
    const token = await exchangeCodeForAccessToken("code123");
    expect(token).toBe("access123");
  });

  test("exchangeCodeForAccessToken lança erro se access_token não vier", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: {} } as any);
    await expect(exchangeCodeForAccessToken("code123")).rejects.toThrow(
      "Google token sem access_token"
    );
  });

  test("fetchGoogleUserInfo retorna user com email", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { sub: "1", email: "a@b.com", name: "A" },
    } as any);

    const user = await fetchGoogleUserInfo("access123");
    expect(user.email).toBe("a@b.com");
    expect(user.sub).toBe("1");
  });

  test("fetchGoogleUserInfo lança erro se não tiver email", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { sub: "1" } } as any);
    await expect(fetchGoogleUserInfo("access123")).rejects.toThrow(
      "Google userinfo sem email"
    );
  });
});
