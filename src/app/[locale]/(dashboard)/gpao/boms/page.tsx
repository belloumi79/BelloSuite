"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Boxes, Search, Loader2, Layers } from "lucide-react";
import { BOMFormModal } from "./components/BOMFormModal";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface BOMItem {
  id: string;
  productId: string;
  quantity: string;
}

interface BOM {
  id: string;
  productId: string;
  version: string;
  isActive: boolean;
  items: BOMItem[];
  _count?: {
    items: number;
  };
}

export default function BOMsPage() {
  const [tenantId, setTenantId] = useState("");
  const [boms, setBoms] = useState<BOM[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
