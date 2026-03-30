export { logger } from '@/infrastructure/logger';
export default { logger: () => import('@/infrastructure/logger') };
