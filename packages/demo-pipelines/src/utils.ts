/**
 * Утилиты для demo pipelines
 */

/**
 * Создаёт промис с задержкой
 */
export const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));
