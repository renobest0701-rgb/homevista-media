/**
 * Infers shoot method tag code from asset type.
 * Uploaders do not input shoot method — it is derived automatically.
 */
export function inferShootMethodCode(
  assetType: string
): string | null {
  switch (assetType) {
    case "DRONE_VIDEO":
    case "DRONE_IMAGE":
      return "method-drone";
    case "VIDEO_360":
    case "VR":
      return "method-360vr";
    case "VIDEO":
    case "IMAGE":
    case "CG":
    case "AUDIO":
      return "method-standard";
    default:
      return null;
  }
}
