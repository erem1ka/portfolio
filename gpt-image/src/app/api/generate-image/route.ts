import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "服务端未配置 OPENAI_API_KEY，请检查 .env.local" },
      { status: 500 },
    );
  }

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-image-2";

  let params: Record<string, unknown>;
  try {
    params = await req.json();
  } catch {
    return NextResponse.json(
      { error: "请求体 JSON 解析失败" },
      { status: 400 },
    );
  }

  // 服务端注入 model（与 curl 示例完全一致，不加额外参数）
  params.model = model;

  try {
    const upstream = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
      // GPT-Image-2 生成可能耗时较长，设置 180s 超时
      signal: AbortSignal.timeout(180_000),
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json";

    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      return NextResponse.json(data, { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
      status: upstream.status,
      headers: { "Content-Type": contentType },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "请求超时（180秒），可能是 API 额度不足或网络问题" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      {
        error: `代理请求失败: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}