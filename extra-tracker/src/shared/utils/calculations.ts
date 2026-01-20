import { calculateDurationInHours } from "./dateUtils";

export type WorkLog = {
	projectId: string;
	date: string;
	startTime: string;
	endTime: string;
};

export interface ProjectSummary {
	projectId: string;
	projectName?: string;
	totalHours: number;
	totalAmount: number;
}

export const calculatesTotalsByProject = (
	logs: WorkLog[],
	projects: { id: string; name?: string; rate?: number }[]
): ProjectSummary[] => {
	const projectMap = new Map(projects.map((p) => [p.id, p]));

	const totals = new Map<string, { hours: number; amount: number; name?: string }>();

	for (const log of logs) {
		const project = projectMap.get(log.projectId);
		if (!project) continue;

		// calculateDurationInHours should handle regular cases; add midnight crossing support
		const duration = calculateDurationInHours(log.startTime, log.endTime);
		const hours = Number.isFinite(duration)
			? duration
			: (() => {
					const [sh, sm] = log.startTime.split(":").map(Number);
					const [eh, em] = log.endTime.split(":").map(Number);
					const start = sh * 60 + sm;
					const end = eh * 60 + em;
					const minutes = end >= start ? end - start : end + 1440 - start;
					return minutes / 60;
				})();

		const amount = (project.rate ?? 0) * hours;
		const current = totals.get(log.projectId) || { hours: 0, amount: 0, name: project.name };
		totals.set(log.projectId, {
			hours: current.hours + hours,
			amount: current.amount + amount,
			name: project.name,
		});
	}

	return Array.from(totals.entries())
		.map(([projectId, value]) => ({
			projectId,
			projectName: value.name,
			totalHours: value.hours,
			totalAmount: value.amount,
		}))
		.filter((item) => item.totalHours > 0);
};