
import * as webpush from "web-push";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  throw new Error("VAPID keys are missing");
}

webpush.setVapidDetails(
  "mailto:dayanand.naik9809@gmail.com",
  publicKey,
  privateKey
);

export default webpush;
