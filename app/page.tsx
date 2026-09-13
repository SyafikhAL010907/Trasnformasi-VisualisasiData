"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import rawData from "./data.json";

/* ================================================================
   DATA TYPES & UTILS
   ================================================================ */
interface SalesData {
  Tanggal: string;
  "ID Transaksi": string;
  "Nama Produk": string;
  Kategori: string;
  Jumlah: number;
  "Harga Satuan (Rp)": number;
  "Total Penjualan (Rp)": number;
  Bulan: string;
  "Kategori Pendapatan": string;
}

const data = rawData as SalesData[];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortRupiah(value: number) {
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}Jt`;
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/* Chart Colors */
const DONUT_COLORS = ["#166534", "#22c55e", "#86efac", "#bbf7d0"];
const BAR_GREEN = "#16a34a";
const BAR_GREEN_HOVER = "#15803d";
const LINE_GREEN = "#166534";

/* ================================================================
   COMPUTED DATA
   ================================================================ */
function useComputedData(sourceData: SalesData[]) {
  return useMemo(() => {
    if (sourceData.length === 0) {
      return {
        totalPenjualan: 0, rataRata: 0, tertinggi: 0, terendah: 0,
        kategoriData: [], monthlyData: [], topProduk: [], kategoriPendapatanData: []
      };
    }

    const totalPenjualan = sourceData.reduce((s, d) => s + d["Total Penjualan (Rp)"], 0);
    const rataRata = Math.round(totalPenjualan / sourceData.length);
    const tertinggi = Math.max(...sourceData.map((d) => d["Total Penjualan (Rp)"]));
    const terendah = Math.min(...sourceData.map((d) => d["Total Penjualan (Rp)"]));

    /* A. Penjualan per Bulan */
    const monthMap: Record<string, number> = {};
    sourceData.forEach((d) => {
      monthMap[d.Bulan] = (monthMap[d.Bulan] || 0) + d["Total Penjualan (Rp)"];
    });
    const monthlyData = MONTH_ORDER.map((m) => ({ 
      bulan: m, 
      total: monthMap[m] || 0 
    }));

    /* B. Penjualan per Kategori Produk */
    const KATEGORI_ORDER = ["Minuman", "Makanan", "Snack", "Perlengkapan Rumah"];
    const kategoriMap: Record<string, { terjual: number; total: number }> = {};
    sourceData.forEach((d) => {
      if (!kategoriMap[d.Kategori]) {
        kategoriMap[d.Kategori] = { terjual: 0, total: 0 };
      }
      kategoriMap[d.Kategori].terjual += d.Jumlah;
      kategoriMap[d.Kategori].total += d["Total Penjualan (Rp)"];
    });
    
    const kategoriData = KATEGORI_ORDER
      .filter((k) => kategoriMap[k])
      .map((k) => ({
        name: k,
        terjual: kategoriMap[k].terjual,
        total: kategoriMap[k].total,
        persen: totalPenjualan > 0 ? ((kategoriMap[k].total / totalPenjualan) * 100).toFixed(1) : "0",
      }));

    /* C. Top 5 Produk Terlaris */
    const produkMap: Record<string, number> = {};
    sourceData.forEach((d) => {
      produkMap[d["Nama Produk"]] =
        (produkMap[d["Nama Produk"]] || 0) + d["Total Penjualan (Rp)"];
    });
    const topProduk = Object.entries(produkMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));

    /* Distribusi Kategori Pendapatan (Tinggi/Sedang/Rendah) */
    const katPendapatanCount: Record<string, number> = {};
    sourceData.forEach((d) => {
      katPendapatanCount[d["Kategori Pendapatan"]] =
        (katPendapatanCount[d["Kategori Pendapatan"]] || 0) + 1;
    });
    const kategoriPendapatanData = ["Tinggi", "Sedang", "Rendah"]
      .filter((k) => katPendapatanCount[k])
      .map((k) => ({
        name: k,
        value: katPendapatanCount[k],
        persen: ((katPendapatanCount[k] / sourceData.length) * 100).toFixed(1),
      }));

    return {
      totalPenjualan, rataRata, tertinggi, terendah,
      kategoriData, monthlyData, topProduk, kategoriPendapatanData,
    };
  }, [sourceData]);
}

/* ================================================================
   CUSTOM TOOLTIP
   ================================================================ */
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white px-3 md:px-4 py-2 md:py-3 rounded-xl shadow-lg border border-gray-100">
      <p className="text-[10px] md:text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs md:text-sm font-semibold text-green-700">
        {formatRupiah(payload[0].value)}
      </p>
    </div>
  );
}

/* ================================================================
   MAIN PAGE COMPONENT
   ================================================================ */
export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [filterKategoriProduk, setFilterKategoriProduk] = useState("Semua");
  const [filterKategoriPendapatan, setFilterKategoriPendapatan] = useState("Semua");
  const [sortColumn, setSortColumn] = useState<string>("Tanggal");
  const [sortAsc, setSortAsc] = useState(true);

  const filteredData = useMemo(() => {
    let result = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d["Nama Produk"].toLowerCase().includes(q) ||
          d["ID Transaksi"].toLowerCase().includes(q) ||
          d.Kategori.toLowerCase().includes(q)
      );
    }
    if (filterKategoriProduk !== "Semua") {
      result = result.filter((d) => d.Kategori === filterKategoriProduk);
    }
    if (filterKategoriPendapatan !== "Semua") {
      result = result.filter((d) => d["Kategori Pendapatan"] === filterKategoriPendapatan);
    }
    result.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortColumn === "Tanggal") { va = a.Tanggal; vb = b.Tanggal; }
      else if (sortColumn === "Total") { va = a["Total Penjualan (Rp)"]; vb = b["Total Penjualan (Rp)"]; }
      else if (sortColumn === "Produk") { va = a["Nama Produk"]; vb = b["Nama Produk"]; }
      else if (sortColumn === "Jumlah") { va = a.Jumlah; vb = b.Jumlah; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return result;
  }, [search, filterKategoriProduk, filterKategoriPendapatan, sortColumn, sortAsc]);

  const { totalPenjualan, rataRata, tertinggi,
          kategoriData, monthlyData, topProduk, kategoriPendapatanData } = useComputedData(filteredData);

  function handleSort(col: string) {
    if (sortColumn === col) setSortAsc(!sortAsc);
    else { setSortColumn(col); setSortAsc(true); }
  }

  const sortIcon = (col: string) => {
    if (sortColumn !== col) return "↕";
    return sortAsc ? "↑" : "↓";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========== HERO SECTION ========== */}
      <header className="relative overflow-hidden bg-green-950">
        <div 
          className="absolute inset-0 z-0 opacity-70"
          style={{
            backgroundImage: "url('/foto%20unj.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(1px)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-linear-to-br from-green-950/95 via-green-900/85 to-green-700/90" />

        <div className="absolute z-0 -top-24 -right-24 w-96 h-96 rounded-full bg-green-500/20 blur-3xl" />
        <div className="absolute z-0 -bottom-32 -left-32 w-80 h-80 rounded-full bg-green-600/20 blur-3xl" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-16 lg:py-20">
          <div className="absolute top-12 right-4 md:top-20 md:right-6 lg:top-24 lg:right-8">
            <img 
              src="/unj.png" 
              alt="Logo UNJ" 
              className="w-20 h-20 sm:w-28 sm:h-28 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]" 
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 mb-4 md:mb-6">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-100 text-[10px] md:text-sm font-medium tracking-wide">
              Tema 9 &mdash; Implementasi Data Science
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight max-w-3xl">
            Dashboard Analisis
            <br />
            <span className="text-green-300">Data Penjualan</span>
          </h1>
          
          <p className="mt-3 md:mt-4 text-green-100/80 text-xs md:text-lg max-w-2xl leading-relaxed">
            Transformasi dan visualisasi data penjualan menggunakan Python 
          </p>

          <div className="mt-6 md:mt-8 flex flex-wrap gap-2 md:gap-3">
            {[
              { label: "Kelompok 8", icon: "👥" },
              { label: "80 Transaksi", icon: "📊" },
              { label: "Jan — Nov 2025", icon: "📅" },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-1.5 md:gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-1.5 md:px-4 md:py-2"
              >
                <span className="text-sm md:text-lg">{chip.icon}</span>
                <span className="text-white/90 text-[10px] md:text-sm font-medium">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full h-6 md:h-8 lg:h-12" preserveAspectRatio="none">
            <path d="M0,60 C480,0 960,0 1440,60 L1440,60 L0,60 Z" fill="#f9fafb" />
          </svg>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 -mt-2 pb-16">

        {/* -------- FILTER CONTROL PANEL -------- */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 mb-6 md:mb-8 flex flex-col lg:flex-row gap-4 items-end justify-between relative z-20">
          <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
            <div className="flex flex-col gap-1.5 w-full md:w-48">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori Produk</label>
              <select
                value={filterKategoriProduk}
                onChange={(e) => setFilterKategoriProduk(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs md:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all cursor-pointer w-full"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Makanan">Makanan</option>
                <option value="Minuman">Minuman</option>
                <option value="Snack">Snack</option>
                <option value="Perlengkapan Rumah">Perlengkapan Rumah</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 w-full md:w-48">
              <label className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">Kategori Pendapatan</label>
              <select
                value={filterKategoriPendapatan}
                onChange={(e) => setFilterKategoriPendapatan(e.target.value)}
                className="px-3 md:px-4 py-2 md:py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs md:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all cursor-pointer w-full"
              >
                <option value="Semua">Semua Pendapatan</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Sedang">Sedang</option>
                <option value="Rendah">Rendah</option>
              </select>
            </div>
          </div>
          <div className="w-full lg:w-auto">
             <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari produk, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-xs md:text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all w-full lg:w-72"
                />
             </div>
          </div>
        </section>

        {/* -------- STATISTICS CARDS -------- */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
          <StatCard
            icon="💰"
            label="Total Penjualan"
            value={formatRupiah(totalPenjualan)}
            sub="Berdasarkan filter"
            trend={filteredData.length > 0 ? "Aktif" : "Kosong"}
            trendUp={filteredData.length > 0}
          />
          <StatCard
            icon="📈"
            label="Rata-rata / Transaksi"
            value={formatRupiah(rataRata)}
            sub="Per transaksi (Filter)"
            trend="avg"
          />
          <StatCard
            icon="🏆"
            label="Transaksi Tertinggi"
            value={formatRupiah(tertinggi)}
            sub="Nilai tertinggi (Filter)"
            trend="max"
            trendUp={filteredData.length > 0}
          />
          <StatCard
            icon="📋"
            label="Total Record"
            value={filteredData.length.toString()}
            sub="Transaksi sesuai filter"
            trend={`${filteredData.length} data`}
          />
        </section>

        {/* -------- CHARTS SECTION -------- */}
        <div className="space-y-6 mb-8 md:mb-10">
          
          {/* Row 1: Line Chart & Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tren Penjualan Bulanan (Line Chart) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 lg:p-8 flex flex-col">
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-semibold text-gray-800 tracking-tight text-center lg:text-left">
                  Tren Penjualan Bulanan
                </h2>
              </div>
              <div className="h-64 md:h-80 w-full flex-1">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="bulan"
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={false}
                        angle={-45}
                        textAnchor="end"
                        dy={10}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatShortRupiah(v)}
                        width={50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke={LINE_GREEN}
                        strokeWidth={3}
                        dot={{ r: 3, fill: LINE_GREEN, strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 5, fill: "#22c55e", strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm md:text-base text-gray-400">Tidak ada data</div>
                )}
              </div>
            </div>

            {/* Persentase Kontribusi per Kategori (Pie Chart) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 lg:p-8 flex flex-col">
              <div className="mb-2 text-center">
                <h2 className="text-base md:text-lg font-semibold text-gray-800 tracking-tight">
                  Persentase Kontribusi
                </h2>
              </div>
              <div className="flex-1 min-h-62.5 flex items-center justify-center">
                {kategoriData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kategoriData}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="total"
                        stroke="none"
                        label={(props: any) => `${props.persen}%`}
                        labelLine={false}
                      >
                        {kategoriData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, color: "#6b7280", paddingTop: "20px" }}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatRupiah(value), "Total"]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #f3f4f6",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm md:text-base text-gray-400">Tidak ada data</div>
                )}
              </div>
            </div>

          </div>

          {/* Row 2: Perbandingan Penjualan per Kategori (Bar Chart) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 lg:p-8 flex flex-col">
            <div className="mb-4 md:mb-6 text-center">
              <h2 className="text-base md:text-lg font-semibold text-gray-800 tracking-tight">
                Perbandingan Penjualan per Kategori
              </h2>
            </div>
            <div className="h-64 md:h-80 w-full">
              {kategoriData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kategoriData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => formatShortRupiah(v)}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0fdf4" }} />
                    <Bar
                      dataKey="total"
                      fill={BAR_GREEN}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                      activeBar={{ fill: BAR_GREEN_HOVER }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm md:text-base text-gray-400">Tidak ada data</div>
              )}
            </div>
          </div>

        </div>

        {/* -------- SUMMARY TABLES ROW -------- */}
        <section className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 md:mb-10 items-start">
          
          {/* Table A: Penjualan per Bulan */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="bg-green-700 px-4 py-3 border-b border-green-800">
              <h3 className="text-white text-xs md:text-sm font-semibold text-center">
                A. PENJUALAN PER BULAN
              </h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-green-800 text-white">
                    <th className="px-4 py-2 text-left font-medium whitespace-nowrap">Bulan</th>
                    <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Total Penjualan (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {monthlyData.length > 0 ? monthlyData.map((row) => (
                    <tr key={row.bulan} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{row.bulan}</td>
                      <td className="px-4 py-2 text-right text-gray-700 font-mono whitespace-nowrap">
                        {row.total.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400">Tidak ada data</td></tr>
                  )}
                  {monthlyData.length > 0 && (
                    <tr className="bg-green-100 font-bold">
                      <td className="px-4 py-3 text-gray-800 text-center whitespace-nowrap">TOTAL</td>
                      <td className="px-4 py-3 text-right text-gray-800 font-mono whitespace-nowrap">
                        {monthlyData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-6 h-full w-full">
            {/* Table B: Penjualan per Kategori Produk */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full">
              <div className="bg-green-700 px-4 py-3 border-b border-green-800">
                <h3 className="text-white text-xs md:text-sm font-semibold text-center">
                  B. PENJUALAN PER KATEGORI PRODUK
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-green-800 text-white">
                      <th className="px-4 py-2 text-left font-medium whitespace-nowrap">Kategori</th>
                      <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Jumlah Terjual</th>
                      <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Total Penjualan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kategoriData.length > 0 ? kategoriData.map((row) => (
                      <tr key={row.name} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{row.name}</td>
                        <td className="px-4 py-2 text-right text-gray-700 whitespace-nowrap">{row.terjual}</td>
                        <td className="px-4 py-2 text-right text-gray-700 font-mono whitespace-nowrap">
                          {row.total.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table C: Top 5 Produk Terlaris */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full">
              <div className="bg-green-700 px-4 py-3 border-b border-green-800">
                <h3 className="text-white text-xs md:text-sm font-semibold text-center">
                  C. TOP 5 PRODUK TERLARIS
                </h3>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-green-800 text-white">
                      <th className="px-4 py-2 text-left font-medium whitespace-nowrap">Nama Produk</th>
                      <th className="px-4 py-2 text-right font-medium whitespace-nowrap">Total Penjualan (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {topProduk.length > 0 ? topProduk.map((row, index) => (
                      <tr key={row.name} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 max-w-50 md:max-w-xs truncate whitespace-nowrap" title={row.name}>
                          {row.name}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700 font-mono whitespace-nowrap">
                          {row.total.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={2} className="px-4 py-4 text-center text-gray-400">Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>

        {/* -------- DISTRIBUSI KATEGORI PENDAPATAN BADGES -------- */}
        {kategoriPendapatanData.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
            {kategoriPendapatanData.map((k) => (
              <div
                key={k.name}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 flex items-center gap-3 md:gap-4 hover:shadow-md transition-shadow duration-300"
              >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-lg md:text-xl font-bold shrink-0"
                  style={{
                    backgroundColor:
                      k.name === "Tinggi" ? "#dcfce7" : k.name === "Sedang" ? "#fef9c3" : "#fee2e2",
                    color: k.name === "Tinggi" ? "#166534" : k.name === "Sedang" ? "#854d0e" : "#991b1b",
                  }}
                >
                  {k.value}
                </div>
                <div>
                  <p className="text-[10px] md:text-sm text-gray-500 font-medium">Kategori Pendapatan</p>
                  <p className="text-base md:text-lg font-semibold text-gray-800 tracking-tight">
                    {k.name}
                  </p>
                  <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                    {k.persen}% dari total transaksi
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* -------- DATA TABLE -------- */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8 md:mb-10 w-full">
          <div className="p-4 md:p-6 lg:p-8 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-gray-800 tracking-tight">
                  Tabel Data Transaksi Lengkap
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  {filteredData.length} dari {data.length} total transaksi ditampilkan
                </p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-xs md:text-sm min-w-200">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">No.</th>
                  <th className="text-left px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-green-700 transition-colors select-none whitespace-nowrap" onClick={() => handleSort("Tanggal")}>
                    Tanggal <span className="inline-block w-4">{sortIcon("Tanggal")}</span>
                  </th>
                  <th className="text-left px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ID Transaksi</th>
                  <th className="text-left px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-green-700 transition-colors select-none whitespace-nowrap" onClick={() => handleSort("Produk")}>
                    Nama Produk <span className="inline-block w-4">{sortIcon("Produk")}</span>
                  </th>
                  <th className="text-left px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Kategori</th>
                  <th className="text-right px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-green-700 transition-colors select-none whitespace-nowrap" onClick={() => handleSort("Jumlah")}>
                    Jumlah <span className="inline-block w-4">{sortIcon("Jumlah")}</span>
                  </th>
                  <th className="text-right px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-green-700 transition-colors select-none whitespace-nowrap" onClick={() => handleSort("Total")}>
                    Total <span className="inline-block w-4">{sortIcon("Total")}</span>
                  </th>
                  <th className="text-center px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Kategori Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((row, i) => (
                  <tr key={`${row["ID Transaksi"]}-${i}`} className="hover:bg-green-50/50 transition-colors duration-150">
                    <td className="px-4 md:px-6 py-3 md:py-4 text-gray-400 font-medium whitespace-nowrap">{i + 1}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-gray-700 font-medium whitespace-nowrap">
                      {new Date(row.Tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-gray-500 font-mono text-[10px] md:text-xs whitespace-nowrap">{row["ID Transaksi"]}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-gray-800 font-medium whitespace-nowrap">{row["Nama Produk"]}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-lg bg-gray-100 text-[10px] md:text-xs font-medium text-gray-600">{row.Kategori}</span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right text-gray-700 tabular-nums whitespace-nowrap">{row.Jumlah}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                      {formatRupiah(row["Total Penjualan (Rp)"])}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-center whitespace-nowrap">
                      <KategoriBadge kategori={row["Kategori Pendapatan"]} />
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 md:px-6 py-8 md:py-12 text-center text-sm text-gray-400">
                      Tidak ada data yang cocok dengan filter / pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* -------- FOOTER -------- */}
        <footer className="text-center py-6 md:py-8 border-t border-gray-200">
          <p className="text-xs md:text-sm text-gray-500">
            <span className="font-semibold text-green-700">Kelompok 8</span>
            {" "}&mdash; Implementasi Tema 9: Aplikasi Analisis Data Penjualan
          </p>
          <p className="text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2">
            Dibangun dengan Next.js, Tailwind CSS, Recharts &amp; Data dari Python (Pandas &amp; NumPy)
          </p>
        </footer>
      </main>
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */
function StatCard({
  icon, label, value, sub, trend, trendUp,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow duration-300 group flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3 md:mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-green-50 flex items-center justify-center text-lg md:text-xl group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <span
            className={`inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
              trendUp
                ? "bg-green-50 text-green-700"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            {trend}
          </span>
        </div>
        <p className="text-[10px] md:text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-gray-800 tracking-tight mt-1">{value}</p>
      </div>
      <p className="text-[10px] md:text-xs text-gray-400 mt-1 md:mt-2">{sub}</p>
    </div>
  );
}

function KategoriBadge({ kategori }: { kategori: string }) {
  const styles: Record<string, string> = {
    Tinggi: "bg-green-100 text-green-800 ring-green-600/20",
    Sedang: "bg-amber-50 text-amber-800 ring-amber-600/20",
    Rendah: "bg-gray-100 text-gray-600 ring-gray-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ring-1 ring-inset ${
        styles[kategori] || styles.Rendah
      }`}
    >
      {kategori}
    </span>
  );
}
