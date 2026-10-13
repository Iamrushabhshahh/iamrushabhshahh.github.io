import raw from '@/content/certs.json';
import { certsFileSchema, stripEmpty } from '@/lib/schemas';

/** Same file ../scripts/build-blog.mjs reads for the home-page cards. */
export const certs = certsFileSchema.parse(stripEmpty(raw)).certs;
