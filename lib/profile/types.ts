import type { ProjectStatus } from "@/lib/db/enums";

export type ProfileProject = {
  id: string;
  createdAt: string;
  serviceType: string;
  brief: string;
  contactName: string | null;
  status: ProjectStatus;
};

export type ProfileUser = {
  phoneDisplay: string;
  displayName: string | null;
  memberSince: string;
};

import { SERVICE_TYPE_LABELS_FA } from "@/lib/projects/services";

const SERVICE_LABELS: Record<string, string> = SERVICE_TYPE_LABELS_FA;

export function projectTitle(project: ProfileProject): string {
  if (project.contactName?.trim()) return project.contactName.trim();
  return SERVICE_LABELS[project.serviceType] ?? "درخواست مشاوره";
}

export const PROFILE_SERVICE_LABELS = SERVICE_LABELS;
