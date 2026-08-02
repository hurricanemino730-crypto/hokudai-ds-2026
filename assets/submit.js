(function () {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  function sanitizeForPath(value) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function setStatus(el, message, type) {
    el.textContent = message;
    el.className = "submit-status" + (type ? " " + type : "");
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("submit-form");
    if (!form) return;

    if (!window.SUPABASE_URL || window.SUPABASE_URL.indexOf("YOUR-PROJECT-REF") !== -1) {
      setStatus(
        document.getElementById("submit-status"),
        "提出フォームは準備中です(Supabaseの設定が未完了)。しばらくお待ちください。",
        "error"
      );
      form.querySelector("button[type=submit]").disabled = true;
      return;
    }

    const sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const statusEl = document.getElementById("submit-status");
    const submitBtn = form.querySelector("button[type=submit]");

    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const url = form.submission_url.value.trim();
      const comment = form.comment.value.trim();
      const file = form.file.files[0];
      const honeypot = form.website.value.trim();

      if (honeypot) {
        // ボット対策のhoneypot。人間には見えない欄が埋まっていたら黙って成功扱いにする。
        setStatus(statusEl, "提出が完了しました。ありがとうございます！", "success");
        form.reset();
        return;
      }

      if (!name || !email) {
        setStatus(statusEl, "氏名とメールアドレスは必須です。", "error");
        return;
      }
      if (!url && !file) {
        setStatus(statusEl, "成果物のURLまたはファイルのどちらかを入力してください。", "error");
        return;
      }
      if (file && file.size > MAX_FILE_SIZE) {
        setStatus(
          statusEl,
          "ファイルサイズが50MBを超えています。大きい動画等はYouTube等にアップロードし、URL欄でご提出ください。",
          "error"
        );
        return;
      }

      submitBtn.disabled = true;
      setStatus(statusEl, "送信中です…", "");

      try {
        let filePath = null;
        let fileName = null;

        if (file) {
          const folder = sanitizeForPath(email);
          const safeFileName = sanitizeForPath(file.name);
          filePath = folder + "/" + safeFileName;
          fileName = file.name;

          const { error: uploadError } = await sb.storage
            .from("submissions")
            .upload(filePath, file, { upsert: true, contentType: file.type });

          if (uploadError) throw uploadError;
        }

        const { error: upsertError } = await sb
          .from("submissions")
          .upsert(
            {
              name: name,
              email: email,
              submission_url: url || null,
              file_path: filePath,
              file_name: fileName,
              comment: comment || null,
            },
            { onConflict: "email" }
          );

        if (upsertError) throw upsertError;

        setStatus(
          statusEl,
          "提出が完了しました。ありがとうございます！同じメールアドレスで再提出すると、内容が上書きされます。",
          "success"
        );
        form.reset();
      } catch (err) {
        console.error(err);
        setStatus(statusEl, "送信に失敗しました。時間をおいて再度お試しください。", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
  });
})();
