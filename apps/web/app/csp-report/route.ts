import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Report-Only 단계에서는 우선 서버 로그 수집으로 위반 패턴만 확인한다.
    console.warn("[CSP Report-Only]", JSON.stringify(body));
  } catch (error) {
    console.warn("[CSP Report-Only] invalid payload");
  }

  return new NextResponse(null, { status: 204 });
}
