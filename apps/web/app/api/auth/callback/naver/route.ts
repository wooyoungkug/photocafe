import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.redirect("http://1.212.201.147:3000/login?error=no_code");
  }

  try {
    // 1. 네이버 토큰 요청
    const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NAVER_CLIENT_ID || "",
        client_secret: process.env.NAVER_CLIENT_SECRET || "",
        code: code,
        state: state || "",
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect("http://1.212.201.147:3000/login?error=token_error");
    }

    // 2. 네이버 사용자 정보 요청
    const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: "Bearer " + tokenData.access_token },
    });
    const userData = await userRes.json();

    if (userData.resultcode !== "00") {
      return NextResponse.redirect("http://1.212.201.147:3000/login?error=user_error");
    }

    const naver = userData.response;

    // 3. 백엔드에 소셜 로그인 요청
    const backendRes = await fetch("http://1.212.201.147:3001/api/v1/auth/social-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "naver",
        providerId: naver.id,
        email: naver.email,
        name: naver.name || naver.nickname || "네이버사용자",
        profileImage: naver.profile_image,
      }),
    });

    if (!backendRes.ok) {
      return NextResponse.redirect("http://1.212.201.147:3000/login?error=backend_error");
    }

    const authData = await backendRes.json();

    // 4. 토큰을 쿠키나 URL로 전달
    const url = new URL("http://1.212.201.147:3000/");
    url.searchParams.set("accessToken", authData.accessToken);
    url.searchParams.set("refreshToken", authData.refreshToken);

    return NextResponse.redirect(url.toString());
  } catch (error) {
    console.error("Naver login error:", error);
    return NextResponse.redirect("http://1.212.201.147:3000/login?error=server_error");
  }
}
