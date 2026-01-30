import axios from "axios";
import { GoogleOAuthPort, GoogleUserInfo } from "../../application/usecases/AuthenticateGoogleUser.js";


export class GoogleOAuthClient implements GoogleOAuthPort {
  constructor(
    private readonly config: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    }
  ) {}

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async fetchUserInfoFromCode(code: string): Promise<GoogleUserInfo> {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data?.access_token as string | undefined;
    if (!accessToken) throw new Error("Falha ao obter access_token do Google");

    const userResponse = await axios.get("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return userResponse.data as GoogleUserInfo;
  }
}
