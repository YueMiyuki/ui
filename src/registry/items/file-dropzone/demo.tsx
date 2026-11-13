"use client";

import { FileDropzone } from "@/components/miyuki-ui/file-dropzone";

export default function FileDropzoneDemo() {
  return (
    <FileDropzone
      className="max-w-md"
      label="Drop GPX tracks or photos"
      accept={[".gpx", "image/*"]}
      maxSize={20 * 1024 * 1024}
    />
  );
}
