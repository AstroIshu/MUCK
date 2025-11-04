import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import axios from "axios";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Logout endpoint
  app.post("/api/oauth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, getSessionCookieOptions(req));
    res.json({ success: true });
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      console.error("[OAuth] Google OAuth credentials not configured");
      res.status(500).json({ error: "OAuth configuration error" });
      return;
    }

    try {
      // Exchange authorization code with Google's token endpoint
      const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;

      const tokenResp = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const { access_token: accessToken, id_token: idToken } = tokenResp.data;

      // Retrieve user info from Google's OpenID Connect userinfo endpoint
      const userInfoResp = await axios.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const userInfo = userInfoResp.data as {
        sub?: string;
        name?: string;
        email?: string;
      };

      if (!userInfo.sub) {
        res
          .status(400)
          .json({ error: "openId (sub) missing from Google user info" });
        return;
      }

      const openId = userInfo.sub;

      // Try to upsert the user into the DB, but don't fail the OAuth flow if the DB is unavailable
      try {
        await db.upsertUser({
          openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });
      } catch (dbErr) {
        console.warn(
          "[OAuth] Warning: failed to upsert user to DB, continuing without persistence",
          dbErr
        );
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
