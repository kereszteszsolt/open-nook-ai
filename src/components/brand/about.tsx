// SPDX-FileCopyrightText: 2026 Keresztes Zsolt <https://kereszteszsolt.hu>
// SPDX-License-Identifier: Apache-2.0

"use client";

import { useId, useRef } from "react";
import type { ReactNode } from "react";
import { brand } from "@/shared/brand";
import { Attribution } from "./attribution";

function LinkIcon({ kind }: { kind: "globe" | "code" | "user" | "heart" | "coffee" }) {
  const shapes = {
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a17 17 0 0 1 0 18 17 17 0 0 1 0-18Z"/></>,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M4 21v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3Z"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    coffee: <path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Zm13 1h2a3 3 0 0 1 0 6h-2M7 3v2m4-2v2m4-2v2"/>,
  };
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[kind]}</svg>;
}

function positionTooltip(link: HTMLAnchorElement) {
  const tooltip = link.querySelector<HTMLElement>('[role="tooltip"]');
  if (!tooltip || !link.parentElement) return;
  const anchor = link.getBoundingClientRect();
  const row = link.parentElement.getBoundingClientRect();
  const width = tooltip.getBoundingClientRect().width;
  const center = anchor.left - row.left + anchor.width / 2;
  const left = Math.max(0, Math.min(center - width / 2, row.width - width));
  tooltip.style.left = `${left}px`;
  tooltip.style.bottom = `${row.bottom - anchor.top + 10}px`;
  tooltip.style.setProperty("--tooltip-arrow-left", `${center - left}px`);
}

function BrandLink({ href, description, children, coffee = false }: {
  href: string; description: string; children: ReactNode; coffee?: boolean;
}) {
  const tooltipId = useId();
  if (!href) return null;
  return <a className={`brand-link${coffee ? " coffee-link" : ""}`} href={href} target="_blank" rel="noopener noreferrer" aria-describedby={tooltipId}
    onPointerEnter={(event) => positionTooltip(event.currentTarget)} onFocus={(event) => positionTooltip(event.currentTarget)}>
    {children}
    <span className="brand-tooltip" role="tooltip" id={tooltipId}>
      <span>{description}</span><span className="tooltip-url">{href}</span>
    </span>
  </a>;
}

export function About() {
  const dialog = useRef<HTMLDialogElement>(null);
  const languages = brand.authorWebsiteLanguages.join(" | ");
  return <>
    <button type="button" className="quiet-button about-button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      About
    </button>
    <dialog className="about-dialog" ref={dialog} aria-labelledby="about-title" aria-describedby="about-description" onClick={(event) => {
      if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current?.close();
      }
    }}>
      <div className="about-header">
        <h2 id="about-title">About {brand.appName}</h2>
        <button type="button" className="quiet-button about-close" aria-label="Close about" onClick={() => dialog.current?.close()}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div className="about-content">
        {/* Brand artwork is already sized SVG; no image optimization is needed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {brand.poster && <img className="about-poster" src={brand.poster} alt={`${brand.appName} project poster`} width="780" height="480" />}
        <p id="about-description" className="about-description">{brand.appDescription}</p>
        <nav className="about-links about-project-links" aria-label="Project and author links">
          <BrandLink href={brand.authorWebsite} description={`About ${brand.authorName}, projects and contact. Available in ${languages}.`}><LinkIcon kind="globe"/>{brand.authorWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</BrandLink>
          <BrandLink href={brand.appWebsite} description={`Visit the ${brand.appName} website.`}><LinkIcon kind="globe"/>Project website</BrandLink>
          <BrandLink href={brand.appGithubUrl} description={`Source code and releases for ${brand.appName}.`}><LinkIcon kind="code"/>Source</BrandLink>
          <BrandLink href={brand.authorGithub} description={`Explore ${brand.authorName}'s open-source projects.`}><LinkIcon kind="user"/>GitHub profile</BrandLink>
        </nav>
        {(brand.authorWaysToSupportUrl || brand.authorBuyMeACoffeeUrl) && <>
          <nav className="about-links about-support-links" aria-label="Support the author">
            <BrandLink href={brand.authorBuyMeACoffeeUrl} description={`Support ${brand.authorName} on Buy Me a Coffee.`} coffee>
              <LinkIcon kind="coffee"/>Buy me a Coffee
            </BrandLink>
            <BrandLink href={brand.authorWaysToSupportUrl} description={`Ways to support ${brand.authorName}'s work.`}><LinkIcon kind="heart"/>Ways to support</BrandLink>
          </nav>
          {brand.supportRemarkText && <div className="support-note" role="note">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></svg>
            <p>{brand.supportRemarkText}</p>
          </div>}
        </>}
        <Attribution showWebsite={false} />
      </div>
    </dialog>
  </>;
}
