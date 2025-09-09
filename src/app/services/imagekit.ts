
import ImageKit from "imagekit";

export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!, // server + client
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!, // server only
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});
