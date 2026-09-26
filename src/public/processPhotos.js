/*
 * The process has no photographs of its own yet. Until one is chosen in the
 * manager, or dropped in as src/assets/images/process/<icon>, each step borrows
 * one of MySOS's own photos that shows the same kind of moment. Shared by the
 * homepage and the Why MySOS page so a step looks the same on both.
 */
import { getImage } from '../utils/imageRegistry';
import { picture } from './cms';

const PROCESS_PHOTOS = {
  consult: 'solutions/community',
  expert: 'benefits/expert',
  clipboard: 'benefits/tailored',
  sample: 'solutions/schools',
  production: 'solutions/events',
  delivery: 'solutions/businesses',
};

export const processPhoto = (step) => picture(step.image, `process/${step.icon}`) || getImage(PROCESS_PHOTOS[step.icon]);
