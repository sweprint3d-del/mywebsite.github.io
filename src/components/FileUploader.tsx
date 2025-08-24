import React, { useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
}

export default function FileUploader({ onFiles }: Props) {
  const [error, setError] = useState("");

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const fileArray = Array.from(e.target.files);
    onFiles(fileArray);
  }

  return (
    <div>
      <input
        type="file"
        accept=".stl,.obj"
        multiple
        onChange={handleFiles}
        className="border p-2"
      />
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
