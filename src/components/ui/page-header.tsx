/**
 * PageHeader
 *
 * Shared header for content pages. Renders an optional breadcrumb back-link,
 * the page title, and an optional description line.
 *
 * Rules:
 *  - Server-compatible (no "use client") — can be used in any page.
 *  - Zero prop defaults create noise — only render what is provided.
 *  - One responsibility: layout of page-level metadata + navigation.
 */

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  /** Page title — rendered as h1 */
  title:       string;
  /** Optional subtitle rendered below the title */
  description?: string;
  /** If provided, a back-link arrow is rendered above the title */
  backHref?:   string;
  /** Label for the back-link. Defaults to "Back" */
  backLabel?:  string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      )}

      <h1 className="text-2xl font-bold text-text-primary">{title}</h1>

      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </div>
  );
}
