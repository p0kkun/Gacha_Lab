"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";

type Tab = {
  id: string;
  label: string;
  icon?: string;
  content: ReactNode;
};

type TabbedPageProps = {
  title: string;
  tabs: Tab[];
  defaultTab?: string;
};

export default function TabbedPage({
  title,
  tabs,
  defaultTab,
}: TabbedPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTabId =
    searchParams.get("tab") || defaultTab || tabs[0]?.id || "";
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      </div>

      {/* タブナビゲーション - コンテンツエリアと繋がったデザイン */}
      <div className="relative">
        {/* タブボタン */}
        <nav
          className="flex flex-wrap gap-0 border-b border-gray-300"
          aria-label="Navigation"
        >
          {tabs.map((tab) => {
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-white text-blue-600 border-t border-l border-r border-gray-300 rounded-t-lg -mb-px z-10"
                      : "text-gray-600 hover:text-black border-b border-gray-300 bg-gray-50"
                  }
                `}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.icon && <span className="text-base">{tab.icon}</span>}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* コンテンツエリア - アクティブなタブと繋がっている */}
        <div className="border border-gray-300 border-t-0 rounded-b-lg bg-white min-h-[400px]">
          <div className="p-6">{activeTab?.content}</div>
        </div>
      </div>
    </div>
  );
}
