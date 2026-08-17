"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteFile, uploadFile } from "@/server/actions/files";
import { formatFileSize, timeAgo } from "@/lib/utils";
import type { Tables } from "@/types/database";

type File = Tables<"files"> & { uploader_name?: string | null };

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function FileManager({
  orgId,
  projectId,
  files,
}: {
  orgId: string;
  projectId: string;
  files: File[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadFile(orgId, projectId, formData);
      if (!result.success) {
        toast.error(`${file.name}: ${result.error}`);
      }
    }
    setUploading(false);
    toast.success("Upload selesai");
    router.refresh();
  }

  async function handleDelete(file: File) {
    const result = await deleteFile(orgId, file.id);
    if (result.success) {
      toast.success("File dihapus");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleUpload(e.dataTransfer.files);
        }}
        className={`flex items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted"
        }`}
      >
        <div>
          <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Seret file ke sini atau{" "}
            <label className="cursor-pointer font-medium text-primary hover:underline">
              pilih file
              <Input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Maks 25 MB per file · PDF, gambar, dokumen
          </p>
        </div>
      </div>

      {uploading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Mengunggah...
        </p>
      )}

      {files.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Belum ada file.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama File</TableHead>
                <TableHead>Uploader</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {file.mime_type && IMAGE_TYPES.includes(file.mime_type) ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="line-clamp-1 font-medium">
                        {file.file_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {file.uploader_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(file.size_bytes)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {timeAgo(file.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        render={
                          <a
                            href={`/api/files/${file.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            title="Download"
                          />
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(file)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}