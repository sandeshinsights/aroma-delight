"use client";

import Link from "next/link";
import { XCircle, Home, ShoppingBag } from "lucide-react";
import { getRestaurantData } from "@/lib/data";

const R = getRestaurantData();

export default function OrderCancelled() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 pt-20">
      <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-gray-100">
        <XCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
        <h1 className="font-heading text-3xl font-bold text-primary mb-3">
          Order Cancelled
        </h1>
        <p className="text-text-light mb-2">
          Your payment was not completed.
        </p>
        <p className="text-text-light text-sm mb-8">
          No charges were made. Your cart is still saved if you&apos;d like to try again.
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <Link
            href="/#menu"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-white border border-gray-300 hover:border-primary text-text-main font-semibold rounded-lg transition-colors"
          >
            <ShoppingBag className="w-5 h-5" />
            Return to Menu
          </Link>
          <a
            href={`tel:${R.phone}`}
            className="block text-sm text-text-light hover:text-primary transition-colors"
          >
            Prefer to order by phone? Call {R.phoneDisplay}
          </a>
        </div>
      </div>
    </div>
  );
}