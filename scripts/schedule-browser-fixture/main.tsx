import React from "react";
import { createRoot } from "react-dom/client";
import "./harness.css";
import { ScheduleManager } from "@/components/admin/schedule/ScheduleManager";

createRoot(document.getElementById("root")!).render(<ScheduleManager />);
