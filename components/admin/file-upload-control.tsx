"use client";

import { useState } from "react";

type FileUploadControlProps = {
  playId: string;
  onInsert: (snippet: string) => void;
};

export function FileUploadControl({ playId, onInsert }: FileUploadControlProps) {
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          fileName: file.name,
          playId,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        headers?: Record<string, string>;
        uploadUrl?: string;
        url?: string;
      };

      if (!response.ok || !payload.uploadUrl || !payload.url) {
        setStatus(payload.error || "No se pudo subir el archivo.");
        return;
      }

      const uploadResponse = await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: payload.headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        setStatus("No se pudo subir el archivo a R2.");
        return;
      }

      const snippet = file.type.startsWith("image/")
        ? `\n![${file.name}](${payload.url})\n`
        : `\n<audio controls src="${payload.url}"></audio>\n`;

      onInsert(snippet);
      setStatus(`Archivo subido: ${file.name}`);
      event.target.value = "";
    } catch {
      setStatus("No se pudo subir el archivo.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="panel subtlePanel stackSm">
      <div>
        <p className="eyebrow">Multimedia</p>
        <p className="mutedText">Sube una imagen o un audio e insertamos el bloque en el Markdown.</p>
      </div>

      <label className="button secondary uploadButton">
        <input type="file" accept="image/*,audio/*" onChange={handleFileChange} hidden />
        {isUploading ? "Subiendo..." : "Subir archivo"}
      </label>

      {status ? <p className="feedback">{status}</p> : null}
    </div>
  );
}
