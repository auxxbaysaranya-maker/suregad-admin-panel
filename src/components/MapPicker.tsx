import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Loader2 } from "lucide-react";

const pin = L.divIcon({
  className: "",
  html: '<span style="display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#0a52e3,#6a2fd0);border:3px solid #fff;box-shadow:0 6px 16px rgba(58,63,224,.45)"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

/** Tap or drag the pin to set an exact location (OpenStreetMap tiles). */
export function MapPicker({ value, onChange, height = 280 }: { value: { lat: number; lng: number } | null; onChange: (value: { lat: number; lng: number }) => void; height?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    if (!box.current || map.current) return;
    const start = value || { lat: 9.9312, lng: 76.2673 };
    const instance = L.map(box.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], value ? 15 : 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(instance);
    const place = (lat: number, lng: number) => {
      if (!marker.current) {
        marker.current = L.marker([lat, lng], { draggable: true, icon: pin }).addTo(instance);
        marker.current.on("dragend", () => {
          const point = marker.current!.getLatLng();
          change.current({ lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) });
        });
      } else marker.current.setLatLng([lat, lng]);
    };
    if (value) place(value.lat, value.lng);
    instance.on("click", (event: L.LeafletMouseEvent) => {
      place(event.latlng.lat, event.latlng.lng);
      change.current({ lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) });
    });
    map.current = instance;
    (instance as L.Map & { place?: typeof place }).place = place;
    setTimeout(() => instance.invalidateSize(), 200);
    return () => {
      instance.remove();
      map.current = null;
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser. Tap the map instead.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const next = { lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) };
        const instance = map.current as (L.Map & { place?: (lat: number, lng: number) => void }) | null;
        instance?.place?.(next.lat, next.lng);
        instance?.setView([next.lat, next.lng], 16);
        onChange(next);
      },
      () => {
        setLocating(false);
        setError("Location permission was denied. Tap the map to place the pin.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-[20px] ring-1 ring-line">
        <div ref={box} style={{ height }} className="z-0" aria-label="Map. Tap to place the location pin." />
        <button type="button" onClick={locate} className="absolute top-3 right-3 z-[400] inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold shadow-card ring-1 ring-line hover:ring-brand-300">
          {locating ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />} Use my location
        </button>
      </div>
      <p className="mt-1.5 text-[12px] text-muted">{value ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Drag the pin to adjust.` : "Tap the map where your showroom is."}</p>
      {error ? <p className="mt-1 text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}
