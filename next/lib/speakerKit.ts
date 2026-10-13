/**
 * Speaker kit data, shared by /speaker-kit/ and the teaser on /speaking/.
 * Press photos live in /assets/press/ (generated from /assets/photos/ with
 * sharp); previews are 360px WebP copies in /assets/press/previews/.
 */

export interface PressPhoto {
  file: string;
  /** Pixel size, width x height. */
  px: string;
  label: string;
  use: string;
  group: 'Headshots' | 'Full length' | 'Background removed' | 'Ready for posters';
  /** Transparent PNGs get a checkerboard behind the preview. */
  transparent?: boolean;
}

export const PRESS_DIR = '/assets/press/';
export const PRESS_ZIP = `${PRESS_DIR}rushabh-shah-press-kit.zip`;

export const PRESS_PHOTOS: PressPhoto[] = [
  { file: 'rushabh-shah-headshot-square.jpg', px: '600 x 600', label: 'Headshot, Docker Captain jacket', use: 'Speaker cards, Sessionize, schedules', group: 'Headshots' },
  { file: 'rushabh-shah-headshot-casual-square.jpg', px: '460 x 460', label: 'Headshot, casual', use: 'Meetup pages, podcasts, interviews', group: 'Headshots' },
  { file: 'rushabh-shah-avatar-circle.png', px: '600 x 600', label: 'Round avatar', use: 'Social posts and speaker grids', group: 'Headshots', transparent: true },
  { file: 'rushabh-shah-portrait-full.jpg', px: '600 x 900', label: 'Full length, standing', use: 'Posters and printed programmes', group: 'Full length' },
  { file: 'rushabh-shah-portrait-full-alt.jpg', px: '600 x 900', label: 'Full length, second pose', use: 'Alternate poster crop', group: 'Full length' },
  { file: 'rushabh-shah-landscape.jpg', px: '900 x 600', label: 'Landscape', use: 'Banners, website headers, slides', group: 'Full length' },
  { file: 'rushabh-shah-cutout-full.png', px: '697 x 1640', label: 'Background removed, full', use: 'Place on your own event branding', group: 'Background removed', transparent: true },
  { file: 'rushabh-shah-cutout-square.png', px: '697 x 697', label: 'Background removed, head and shoulders', use: 'Speaker announcement graphics', group: 'Background removed', transparent: true },
  { file: 'rushabh-shah-on-blue-square.jpg', px: '1080 x 1080', label: 'On brand blue, 1080 square', use: 'Instagram, LinkedIn and X announcements', group: 'Ready for posters' },
];

export const AV_REQUIREMENTS = [
  { label: 'Microphone', value: 'Lavalier or headset preferred. Handheld works, but not for a live terminal demo where both hands are on the keyboard.' },
  { label: 'Display', value: '16:9, 1920x1080. Demos run at a raised terminal font size and are legible from the back of the room.' },
  { label: 'Connection', value: 'HDMI. I carry USB-C to HDMI adapters, but a spare on site is always welcome.' },
  { label: 'Machine', value: 'I present from my own laptop (macOS, Apple silicon). Happy to load slides onto a conference machine if the deck is static.' },
  { label: 'Network', value: 'Live demos hit a real cluster. If the venue network is unreliable, tell me in advance and I will switch to a recorded fallback rather than risk dead air.' },
  { label: 'Remote', value: 'Can present live by video call or send a pre-recorded segment when travel is not possible.' },
];
