import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { Modal } from "./Modal";
import { PhotoUploader, photosFromListing, readyKeys, type Photo } from "./PhotoUploader";

/** Add, remove or reorder photos on one of the seller's listings. */
export function ManagePhotos({
  product,
  open,
  onOpenChange,
}: {
  product: { id: string; title: string; status?: string; images?: { key?: string; url?: string }[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useQueryClient();
  const [photos, setPhotos] = useState<Photo[]>(() => photosFromListing(product.images));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setPhotos(photosFromListing(product.images));
      setError("");
    }
  }, [open, product.images]);
  const uploading = photos.some((photo) => photo.status === "uploading");

  async function save() {
    const keys = readyKeys(photos);
    if (!keys.length) {
      setError("Keep at least one photo.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.put(`/products/${product.id}/images`, { imageKeys: keys });
      await client.invalidateQueries({ queryKey: ["my-listings"] });
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save photos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Manage photos" description={product.title} size="lg">
      <PhotoUploader photos={photos} setPhotos={setPhotos} max={20} />
      {product.status === "active" ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800 ring-1 ring-amber-200">Changing photos sends the listing back for a quick review before it shows again.</p>
      ) : null}
      {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className="rounded-full bg-white py-3 font-semibold ring-1 ring-line">Cancel</button>
        <button type="button" disabled={uploading || saving} onClick={() => void save()} className="flex items-center justify-center gap-2 rounded-full bg-brand-gradient py-3 font-semibold text-white shadow-glow disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" /> : null} {uploading ? "Uploading…" : "Save photos"}
        </button>
      </div>
    </Modal>
  );
}
