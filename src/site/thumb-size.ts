export const THUMB_WIDTH = 720;
export const THUMB_HEIGHT = 450;

export function thumbSize(item: { preview: { iframe: boolean } }) {
  return item.preview.iframe
    ? { width: THUMB_WIDTH * 2, height: THUMB_HEIGHT * 2 }
    : { width: THUMB_WIDTH, height: THUMB_HEIGHT };
}
