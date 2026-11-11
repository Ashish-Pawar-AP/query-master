import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { Folder, Boxes, FileCode2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader.jsx";
import Categories from "../categories/Categories.jsx";
import Modules from "../modules/Modules.jsx";
import SubModuleList from "../submodules/SubModuleList.jsx";

// One consolidated page for the three levels of the navigation hierarchy — Categories,
// Modules, and Queries (Sub Modules) — instead of three separate nav items. Each tab
// reuses the existing, fully-working management screen as-is; this is just a shared
// shell around them so admins don't have to hop between pages to build out the tree.
const TABS = [
  { key: "categories", label: "Categories", icon: Folder, Component: Categories },
  { key: "modules", label: "Modules", icon: Boxes, Component: Modules },
  { key: "queries", label: "Queries", icon: FileCode2, Component: SubModuleList },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("categories");
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabRefs = useRef({});

  const ActiveComponent = TABS.find((t) => t.key === activeTab).Component;

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeTab]);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Admin Panel"
        description="Manage Categories, Modules, and Queries from one place."
      />

      <div className="relative mb-6 flex gap-1 border-b border-surface-border-soft">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive ? "text-primary-text" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
        <span
          className="absolute bottom-0 h-0.5 rounded-full bg-primary-500 shadow-glow-primary-sm transition-all duration-300 ease-out-expo"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>

      <div key={activeTab} className="animate-fade-in-up">
        <ActiveComponent />
      </div>
    </div>
  );
}
