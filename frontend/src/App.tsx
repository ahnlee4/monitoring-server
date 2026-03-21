import { useEffect, useState } from "react";
import type { Alarm, Device, Overview, UpdateEvent } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const WS_PATH = import.meta.env.VITE_WS_PATH || "/ws/dashboard";

function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connectionState, setConnectionState] = useState("connecting");

  async function loadInitialData() {
    const [devicesRes, alarmsRes, overviewRes] = await Promise.all([
      fetch(`${API_BASE}/devices`),
      fetch(`${API_BASE}/alarms/recent`),
      fetch(`${API_BASE}/status/overview`),
    ]);

    const [devicesData, alarmsData, overviewData] = await Promise.all([
      devicesRes.json(),
      alarmsRes.json(),
      overviewRes.json(),
    ]);

    setDevices(devicesData);
    setAlarms(alarmsData);
    setOverview(overviewData);
  }

  useEffect(() => {
    loadInitialData().catch((error) => {
      console.error("Failed to load dashboard data", error);
    });

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}${WS_PATH}`);

    socket.onopen = () => setConnectionState("live");
    socket.onclose = () => setConnectionState("disconnected");
    socket.onerror = () => setConnectionState("error");
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as UpdateEvent;
      if (message.type !== "telemetry_update") {
        return;
      }

      setDevices((prev) => {
        const next = [...prev];
        const index = next.findIndex((item) => item.id === message.device.id);
        if (index >= 0) {
          next[index] = message.device;
        } else {
          next.push(message.device);
          next.sort((a, b) => a.code.localeCompare(b.code));
        }
        return next;
      });

      loadInitialData().catch((error) => {
        console.error("Failed to refresh dashboard data", error);
      });
    };

    return () => {
      socket.close();
    };
  }, []);

  const heroStats = [
    { label: "Total Devices", value: overview?.total_devices ?? 0 },
    { label: "Online", value: overview?.online_devices ?? 0 },
    { label: "Active Alarms", value: overview?.active_alarms ?? 0 },
    { label: "WebSocket", value: connectionState },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-sky-500/20 bg-slate-900/70 p-6 shadow-panel backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.3em] text-sky-300">Industrial Monitoring MVP</p>
              <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
                Factory Floor Test Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
                Mock collector, PostgreSQL history, FastAPI API, WebSocket live updates, and responsive operator view.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              Last update: {overview?.last_updated_at ? formatDate(overview.last_updated_at) : "waiting for data"}
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {heroStats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-panel backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Devices</h2>
              <p className="text-sm text-slate-400">{devices.length} devices</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {devices.map((device) => (
                <article
                  key={device.id}
                  className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-panel backdrop-blur"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-sky-300">{device.code}</p>
                      <h3 className="mt-1 text-lg font-semibold text-white">{device.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{device.location}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(device.status)}`}>
                      {device.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {device.current_values.map((value) => (
                      <div key={value.metric_key} className="rounded-2xl bg-slate-800/80 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{formatMetric(value.metric_key)}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">
                          {value.value}
                          <span className="ml-1 text-sm text-slate-400">{value.unit}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(value.updated_at)}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-panel backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent Alarms</h2>
              <span className="text-sm text-slate-400">{alarms.length} entries</span>
            </div>
            <div className="space-y-3">
              {alarms.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  No alarms yet. Mock collector will populate this panel when thresholds are crossed.
                </div>
              ) : (
                alarms.map((alarm) => (
                  <article key={alarm.id} className="rounded-2xl border border-white/10 bg-slate-800/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{alarm.device_name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{alarm.device_code}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${alarmClass(alarm.level)}`}>
                        {alarm.level}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-200">{alarm.message}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDate(alarm.created_at)}</p>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMetric(metric: string) {
  return metric.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "running") {
    return "bg-emerald-500/15 text-emerald-200";
  }
  if (status === "attention") {
    return "bg-amber-500/15 text-amber-200";
  }
  return "bg-slate-500/15 text-slate-200";
}

function alarmClass(level: string) {
  if (level === "critical") {
    return "bg-rose-500/15 text-rose-200";
  }
  if (level === "warning") {
    return "bg-amber-500/15 text-amber-200";
  }
  return "bg-sky-500/15 text-sky-200";
}

export default App;
