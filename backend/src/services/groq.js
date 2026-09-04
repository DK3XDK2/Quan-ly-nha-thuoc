const MAC_DINH_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

async function goiGroqText(prompt, thuLai = true) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("THIEU_GROQ_API_KEY");
  }

  if (typeof fetch !== "function") {
    throw new Error("MAY_CHU_KHONG_HO_TRO_FETCH");
  }

  try {
    const phanHoi = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MAC_DINH_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      },
    );

    if (!phanHoi.ok) {
      const thongTinLoi = await phanHoi.text();
      throw new Error(`GROQ_HTTP_${phanHoi.status}:${thongTinLoi.slice(0, 300)}`);
    }

    const duLieu = await phanHoi.json();
    const noiDung =
      duLieu?.choices?.[0]?.message?.content &&
      String(duLieu.choices[0].message.content).trim();

    if (!noiDung) {
      throw new Error("GROQ_TEXT_RONG");
    }

    return noiDung;
  } catch (loi) {
    if (thuLai) {
      console.warn("⚠️ Groq 70B lỗi -> Đang thử lại với bản 8B ổn định...");
      const phanHoiDuPhong = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
          }),
        },
      );

      if (phanHoiDuPhong.ok) {
        const duLieu = await phanHoiDuPhong.json();
        return duLieu?.choices?.[0]?.message?.content || "";
      }
    }
    throw loi;
  }
}

module.exports = { goiGroqText };
