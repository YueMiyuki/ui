"use client";

import { FileUpload } from "@/components/miyuki-ui/file-upload";

const MB = 1024 * 1024;

export default function FileUploadDemo() {
  return (
    <FileUpload
      className="max-w-md"
      accept={[".pdf", ".jpg", ".jpeg", ".png", ".gpx"]}
      maxSize={8 * MB}
      defaultItems={[
        {
          id: "route",
          name: "hakuba-ridge-traverse.gpx",
          size: 1.2 * MB,
          type: "application/gpx+xml",
          status: "done",
          progress: 1,
        },
        {
          id: "photo",
          name: "otaru-canal-at-dusk.jpg",
          size: 12.6 * MB,
          type: "image/jpeg",
          status: "failed",
          progress: 0,
          rejected: true,
          error: "Larger than 8 MB",
        },
      ]}
    />
  );
}
