/*
 * HQNATEX_SETTINGS_BACKGROUND_CONTRACT_V1D2B
 *
 * Certified from Backend contract discovery:
 * upload field: background
 * max bytes: 12582912
 * max dimensions: 7680 x 4320
 */

export const BACKGROUND_CONTRACT = {
  uploadField: "background",

  allowedPositions: [
    "center center",
    "center top",
    "center bottom",
    "left center",
    "right center",
  ],

  allowedSizes: [
    "cover",
    "contain",
    "auto",
  ],

  allowedContentTypes: [
    "image/png",
    "image/jpeg",
    "image/webp",
  ],

  maxBytes: 12582912,
  maxWidth: 7680,
  maxHeight: 4320,
} as const;
