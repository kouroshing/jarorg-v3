import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const assetlinks = [
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "cafebazaar_twa"
      ],
      target: {
        namespace: "android_app",
        package_name: "ir.app.jarorg.online.novinappsaz",
        sha256_cert_fingerprints: [
          "FF:59:4D:41:7A:97:43:33:CD:44:C8:78:11:44:DF:27:4B:85:D7:46:F8:1D:02:86:8D:4B:74:F7:68:06:1A:EA",
          "9E:E8:06:43:90:2F:F4:29:5B:E6:6C:81:02:62:B9:9E:AD:EE:AE:D2:A6:64:02:61:9D:3B:14:3A:58:B4:1C:52",
          "54:CC:CA:8C:B0:BB:58:9F:DC:B8:3F:A2:BA:4C:E1:D5:E7:3E:17:55:7A:ED:E5:4D:B6:42:52:03:30:8E:93:5C",
          "FD:78:44:DC:F6:C6:99:04:24:0F:55:5D:6B:D0:AF:B4:DA:EF:95:57:52:05:FD:E0:F7:9B:5C:7D:11:6A:B5:25"
        ]
      }
    },
    {
      relation: [
        "delegate_permission/common.handle_all_urls",
        "cafebazaar_twa"
      ],
      target: {
        namespace: "android_app",
        package_name: "ir.jaramooz.twa",
        sha256_cert_fingerprints: [
          "4F:19:B9:FD:44:27:1F:C1:1D:28:23:F5:88:31:C8:66:B6:F9:82:94:48:2B:22:BB:E5:FC:61:38:71:65:60:FB"
        ]
      }
    }
  ];

  return NextResponse.json(assetlinks, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, s-maxage=86400"
    }
  });
}
