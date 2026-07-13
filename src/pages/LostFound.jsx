import { MapPin, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api } from "../utils/api";

export default function LostFound() {
  const { setToast } = useApp();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("LOST");

  useEffect(() => {
    api("/lost-found").then((data) => setItems(data.items)).catch((error) => setToast(error.message));
  }, []);

  const visible = useMemo(() => items.filter((item) => item.type === filter), [items, filter]);

  return (
    <div className="page-shell">
      <PageHeader eyebrow="Student Services" title="Lost & Found Feed" description="Visual item cards mapped by lost or found status, location, and contact details.">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          {["LOST", "FOUND"].map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} className={`rounded-md px-4 py-2 text-sm font-black ${filter === tab ? "bg-teal-700 text-white" : "text-slate-700"}`}>{tab}</button>
          ))}
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visible.map((item, index) => (
          <article key={item.id} className="panel overflow-hidden">
            <div className={`grid aspect-[4/3] place-items-center ${index % 2 ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-900"}`}>
              <span className="text-5xl font-black">{item.title.split(" ").slice(0, 2).map((word) => word[0]).join("")}</span>
            </div>
            <div className="p-4">
              <span className={`badge ${item.type === "LOST" ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900"}`}>{item.type}</span>
              <h2 className="mt-3 text-lg font-black">{item.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} /> {item.location}</p>
              <a href={`tel:${item.contact}`} className="btn-secondary mt-4 w-full"><Phone size={16} /> Contact</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
