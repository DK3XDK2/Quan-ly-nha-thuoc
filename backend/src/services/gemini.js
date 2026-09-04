const MAC_DINH_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function layNoiDungTraVe(duLieu) {
  const candidate = duLieu?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

function tachJson(text) {
  if (!text) return null;

  const clean = text.trim();

  if (clean.startsWith("```") && clean.endsWith("```")) {
    const removedFence = clean
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    try {
      return JSON.parse(removedFence);
    } catch (e) {
      return null;
    }
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    return null;
  }
}

async function goiGemini(prompt) {
  return goiGeminiJson(prompt);
}

async function goiGeminiJson(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("THIEU_GEMINI_API_KEY");
  }

  if (typeof fetch !== "function") {
    throw new Error("MAY_CHU_KHONG_HO_TRO_FETCH");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MAC_DINH_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const phanHoi = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!phanHoi.ok) {
    const thongTinLoi = await phanHoi.text();
    throw new Error(
      `GEMINI_HTTP_${phanHoi.status}:${thongTinLoi.slice(0, 300)}`,
    );
  }

  const duLieu = await phanHoi.json();
  const noiDung = layNoiDungTraVe(duLieu);
  const json = tachJson(noiDung);

  if (!Array.isArray(json)) {
    throw new Error("GEMINI_JSON_KHONG_HOP_LE");
  }

  return json;
}

async function goiGeminiText(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("THIEU_GEMINI_API_KEY");
  }

  if (typeof fetch !== "function") {
    throw new Error("MAY_CHU_KHONG_HO_TRO_FETCH");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MAC_DINH_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const phanHoi = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!phanHoi.ok) {
    const thongTinLoi = await phanHoi.text();
    throw new Error(
      `GEMINI_HTTP_${phanHoi.status}:${thongTinLoi.slice(0, 300)}`,
    );
  }

  const duLieu = await phanHoi.json();
  const noiDung = layNoiDungTraVe(duLieu);

  if (!noiDung) {
    throw new Error("GEMINI_TEXT_RONG");
  }

  return noiDung;
}

module.exports = { goiGemini, goiGeminiJson, goiGeminiText };
