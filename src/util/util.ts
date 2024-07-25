export function isWithin(
	minDays: number,
	maxDays: number,
	date: Date,
): boolean {
	const today = new Date();
	const diffTime = Math.abs(today.getTime() - date.getTime());
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return !(diffDays < minDays || diffDays > maxDays);
}
