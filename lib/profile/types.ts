import type { ProjectStatus } from "@/lib/db/enums";
import { getProjectServiceLabel, SERVICE_TYPE_LABELS_FA } from "@/lib/projects/services";

export type ProfileProject = {
  id: string;
  createdAt: string;
  serviceType: string;
  serviceDetails: string | null;
  brief: string;
  contactName: string | null;
  status: ProjectStatus;
};

export type ProfileUser = {
  phoneDisplay: string;
  displayName: string | null;
  memberSince: string;
};

export function projectTitle(project: ProfileProject): string {
  return getProjectServiceLabel(project.serviceType, project.serviceDetails);
}

export const PROFILE_SERVICE_LABELS = SERVICE_TYPE_LABELS_FA;
