"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Settings, AlertTriangle, Wrench, Search, Loader2 } from "lucide-react";
import { AssetFormModal } from "./components/AssetFormModal";

interface Asset {
  id: string;
  code: string;
  name: string;
  category: string | null;
  location: string | null;
  status: "ACTIVE" | "IN_MAINTENANCE" | "BROKEN" | "RETIRED";
  _count?: {
    workOrders: number;
  };
}

const statusColors = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_MAINTENANCE: "bg-amber-100 text-amber-800 border-amber-200",
  BROKEN: "bg-red-100 text-red-800 border-red-200",
  RETIRED: "bg-stone-100 text-stone-500 border-stone-200",
};

const statusLabels = {
  ACTIVE: "En Service",
  IN_MAINTENANCE: "En Maintenance",
  BROKEN: "En Panne",
  RETIRED: "Hors Service",
};

export default function AssetsPage() {
  const [tenantId, setTenantId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
